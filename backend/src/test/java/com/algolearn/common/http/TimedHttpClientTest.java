package com.algolearn.common.http;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.web.client.RestClient;

class TimedHttpClientTest {

    @RegisterExtension
    static final WireMockExtension SERVER = WireMockExtension.newInstance().options(wireMockConfig().dynamicPort())
            .build();

    private TimedHttpClient client(Duration timeout, ErrorCode code) {
        return new TimedHttpClient(RestClient.builder().baseUrl(SERVER.baseUrl()), timeout, code);
    }

    private static ExternalServiceException failure(Runnable call) {
        try {
            call.run();
        } catch (ExternalServiceException e) {
            return e;
        }
        throw new AssertionError("expected ExternalServiceException");
    }

    @Test
    void passesTheRequestThroughAndReturnsTheResponse() {
        SERVER.stubFor(post("/echo").willReturn(aResponse().withBody("pong")));
        var body = client(TimedHttpClient.DEFAULT_TIMEOUT, ErrorCode.URL_FETCH_FAILED)
                .call(rest -> rest.post().uri("/echo").retrieve().body(String.class));
        assertThat(body).isEqualTo("pong");
    }

    @Test
    void throwsA503ExternalServiceErrorOnTimeout() {
        SERVER.stubFor(get("/slow").willReturn(aResponse().withFixedDelay(1_000)));
        var slow = client(Duration.ofMillis(100), ErrorCode.CF_UNAVAILABLE);
        var error = failure(() -> slow.call(rest -> rest.get().uri("/slow").retrieve().toBodilessEntity()));
        assertThat(error.status().value()).isEqualTo(503);
        assertThat(error.code()).isEqualTo(ErrorCode.CF_UNAVAILABLE);
        assertThat(error.details()).isEqualTo(Map.of("reason", "timeout", "timeoutMs", 100L));
        assertThat(error.getCause()).isNotNull();
    }

    @Test
    void allowsAPerCallTimeoutOverride() {
        SERVER.stubFor(get("/slow").willReturn(aResponse().withFixedDelay(1_000)));
        var patient = client(Duration.ofSeconds(60), ErrorCode.URL_FETCH_FAILED);
        var error = failure(() -> patient.call(Duration.ofMillis(50),
                rest -> rest.get().uri("/slow").retrieve().toBodilessEntity()));
        assertThat(error.details()).isEqualTo(Map.of("reason", "timeout", "timeoutMs", 50L));
    }

    @Test
    void wrapsNetworkFailuresAs502WithTheCause() {
        var down = new TimedHttpClient(RestClient.builder().baseUrl("http://127.0.0.1:1"),
                Duration.ofSeconds(2), ErrorCode.URL_FETCH_FAILED);
        var error = failure(() -> down.call(rest -> rest.get().uri("/").retrieve().toBodilessEntity()));
        assertThat(error.status().value()).isEqualTo(502);
        assertThat(error.code()).isEqualTo(ErrorCode.URL_FETCH_FAILED);
        assertThat(error.details()).isEqualTo(Map.of("reason", "network"));
        assertThat(error.getCause()).isNotNull();
    }

    @Test
    void detectsTimeoutsAnywhereInTheCauseChain() {
        var nested = new RuntimeException(new java.net.SocketTimeoutException("read"));
        assertThat(TimedHttpClient.isTimeout(nested)).isTrue();
        assertThat(TimedHttpClient.isTimeout(new RuntimeException("x"))).isFalse();
    }
}
