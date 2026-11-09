package com.algolearn.codeforces;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.codeforces.CfTestClients.CountingQueue;
import com.algolearn.common.error.AppException;
import com.github.tomakehurst.wiremock.http.Fault;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.http.HttpStatus;

/** Retry cases of legacy codeforces.client.errors.test.js against WireMock. */
class RestCodeforcesClientRetryTest {

    @RegisterExtension
    static final WireMockExtension CF = WireMockExtension.newInstance().options(wireMockConfig().dynamicPort()).build();

    private final CountingQueue queue = new CountingQueue();

    private CodeforcesClient client(int retries) {
        return CfTestClients.client(CF.baseUrl() + "/api", queue, Duration.ofSeconds(5), retries);
    }

    @Test
    void retries5xxNetworkErrorsAndCallLimitFailuresThenSucceeds() {
        CfTestClients.sequence(CF, aResponse().withStatus(502).withBody("<html>502</html>"),
                aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER),
                CfTestClients.json(429, "{\"status\":\"FAILED\",\"comment\":\"Call limit exceeded\"}"),
                okJson("{\"status\":\"OK\",\"result\":{\"problems\":[]}}"));
        assertThat(client(3).problemsetProblems().problems()).isEmpty();
        assertThat(CF.getAllServeEvents()).hasSize(4);
    }

    @Test
    void doesNotRetryNonRetryable4xxAnswers() {
        CfTestClients.sequence(CF, aResponse().withStatus(403).withBody("forbidden"));
        assertThatThrownBy(() -> client(2).problemsetProblems())
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.status()).isEqualTo(HttpStatus.BAD_GATEWAY);
                    assertThat(((Map<?, ?>) e.details()).get("status")).isEqualTo(403);
                });
        assertThat(CF.getAllServeEvents()).hasSize(1);
    }

    @Test
    void sendsEveryAttemptIncludingRetriesThroughTheQueue() {
        CfTestClients.sequence(CF, aResponse().withStatus(500), okJson("{\"status\":\"OK\",\"result\":[]}"));
        client(2).userStatus("x");
        assertThat(queue.calls()).isEqualTo(2);
    }
}
