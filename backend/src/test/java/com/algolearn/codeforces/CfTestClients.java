package com.algolearn.codeforces;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.anyUrl;
import static com.github.tomakehurst.wiremock.client.WireMock.get;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.http.RateLimitQueue;
import com.algolearn.common.http.Retry;
import com.algolearn.common.http.RetryPolicy;
import com.algolearn.common.http.TimedHttpClient;
import com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import com.github.tomakehurst.wiremock.stubbing.Scenario;
import java.time.Duration;
import java.util.function.Supplier;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/** Real Codeforces clients pointed at WireMock, with instant retries and a counting queue. */
final class CfTestClients {

    private CfTestClients() {
    }

    static RestCodeforcesClient client(String baseUrl, CountingQueue queue, Duration timeout, int retries) {
        var http = new TimedHttpClient(RestClient.builder(), timeout, ErrorCode.CF_UNAVAILABLE);
        var retry = Retry.of(new RetryPolicy(retries, 1, 1, 2)).withSleeper(ms -> { });
        return new RestCodeforcesClient(http, baseUrl, queue, retry, JsonMapper.builder().build());
    }

    /** Stubs any GET to answer {@code steps} in order; the last one then repeats. */
    static void sequence(WireMockExtension server, ResponseDefinitionBuilder... steps) {
        for (var i = 0; i < steps.length; i++) {
            var stub = get(anyUrl()).inScenario("seq").willReturn(steps[i])
                    .whenScenarioStateIs(i == 0 ? Scenario.STARTED : "step" + i);
            server.stubFor(i == steps.length - 1 ? stub : stub.willSetStateTo("step" + (i + 1)));
        }
    }

    static ResponseDefinitionBuilder json(int status, String body) {
        return aResponse().withStatus(status).withHeader("Content-Type", "application/json").withBody(body);
    }

    static RestCodeforcesClient client(String baseUrl, CountingQueue queue) {
        return client(baseUrl, queue, Duration.ofSeconds(5), 2);
    }

    /** A queue without spacing that counts how many attempts went through it. */
    static final class CountingQueue extends RateLimitQueue {

        private int calls;

        CountingQueue() {
            super(0, () -> 0, ms -> { });
        }

        @Override
        public <T> T submit(Supplier<T> task) {
            calls++;
            return super.submit(task);
        }

        int calls() {
            return calls;
        }
    }
}
