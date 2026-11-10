package com.algolearn.e2e;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.json.JsonMapper;

/**
 * Warms the freshly started JVM before the E2E backend reports healthy: a cold JIT made the first seconds of
 * parallel browser tests several times slower than the legacy Node server. A few parallel throwaway users walk the
 * main routes over real HTTP (signup, handle, sync, stats, recommendations, practice, problems, stuck). The coach is
 * never called (the fake AI keeps the legacy 5-per-minute budget for the tests).
 */
class E2eWarmup {

    static final int USERS = 6;
    static final int ROUNDS = 2;
    private static final Logger LOG = LoggerFactory.getLogger(E2eWarmup.class);

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final JsonMapper json;
    private final String base;

    E2eWarmup(JsonMapper json, int port) {
        this.json = json;
        this.base = "http://localhost:" + port + "/api/v1";
    }

    /** Runs every user's rounds in parallel; a failing request is logged, never fatal. */
    void run() {
        var started = System.nanoTime();
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            IntStream.range(0, USERS).forEach(user -> pool.submit(() -> walk(user)));
        }
        LOG.warn("E2E backend warmed up in {} ms", (System.nanoTime() - started) / 1_000_000);
    }

    private void walk(int user) {
        try {
            for (var round = 0; round < ROUNDS; round++) {
                var id = "warmup" + user + "r" + round;
                var signup = send("POST", "/auth/signup", null, "{\"email\":\"" + id + "@e2e.test\","
                        + "\"password\":\"Warm-up-only-2026\",\"name\":\"Warm up\"}");
                var token = json.readTree(signup).path("data").path("token").asString();
                send("PUT", "/users/me/handle", token, "{\"handle\":\"e2e_" + id + "\"}");
                send("POST", "/users/me/sync", token, null);
                for (var path : new String[] {"/users/me/stats/summary", "/users/me/stats?kind=pair&limit=100",
                    "/recommendations", "/practice", "/problems?q=brackets", "/problems/1500/A/similar",
                    "/stuck/history", "/auth/me"}) {
                    send("GET", path, token, null);
                }
                send("POST", "/practice", token, "{\"problemId\":\"1511/A\"}");
                send("DELETE", "/practice/1511/A", token, null);
                send("POST", "/stuck", token, "{\"inputType\":\"url\",\"url\":\"http://127.0.0.1:9/x\"}");
            }
        } catch (Exception e) {
            LOG.warn("E2E warm-up request failed: {}", e.toString());
        }
    }

    private String send(String method, String path, String token, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(base + path)).timeout(Duration.ofSeconds(30))
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(body))
                .header("Content-Type", "application/json");
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString()).body();
    }
}
