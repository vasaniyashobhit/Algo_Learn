package com.algolearn.codeforces;

import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.algolearn.codeforces.CfTestClients.CountingQueue;
import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

/** Ports legacy codeforces.client.errors.test.js against WireMock. */
class RestCodeforcesClientErrorsTest {

    @RegisterExtension
    static final WireMockExtension CF = WireMockExtension.newInstance().options(wireMockConfig().dynamicPort()).build();

    private final CountingQueue queue = new CountingQueue();

    private CodeforcesClient client(Duration timeout, int retries) {
        return CfTestClients.client(CF.baseUrl() + "/api", queue, timeout, retries);
    }

    @Test
    void mapsFailedStatusToATypedErrorWithoutRetrying() {
        var body = "{\"status\":\"FAILED\",\"comment\":\"handles: User with handle zz not found\"}";
        CfTestClients.sequence(CF, CfTestClients.json(400, body));
        assertThatThrownBy(() -> client(Duration.ofSeconds(5), 2).userInfo("zz"))
                .isInstanceOfSatisfying(NotFoundException.class,
                        e -> assertThat(e.code()).isEqualTo(ErrorCode.CF_HANDLE_NOT_FOUND));
        assertThat(CF.getAllServeEvents()).hasSize(1);
    }

    @Test
    void timesOutAs503AndRetriesWithAWarning() {
        var appender = new ListAppender<ILoggingEvent>();
        appender.start();
        ((Logger) LoggerFactory.getLogger(RestCodeforcesClient.class)).addAppender(appender);
        var ok = "{\"status\":\"OK\",\"result\":[]}";
        CfTestClients.sequence(CF, okJson(ok).withFixedDelay(5_000), okJson(ok));
        assertThat(client(Duration.ofMillis(500), 2).userStatus("x")).isEmpty();
        assertThat(CF.getAllServeEvents()).as(CF.getAllServeEvents().toString()).hasSize(2);
        assertThat(appender.list).singleElement().satisfies(event -> assertThat(event.getFormattedMessage())
                .contains("method=user.status", "attempt=1", "code=CF_UNAVAILABLE"));
    }

    @Test
    void givesUpAfterTheConfiguredRetriesWithTheLastTypedError() {
        CfTestClients.sequence(CF, okJson("{}").withFixedDelay(1_000));
        assertThatThrownBy(() -> client(Duration.ofMillis(100), 2).problemsetProblems())
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(e.code()).isEqualTo(ErrorCode.CF_UNAVAILABLE);
                    assertThat(((Map<?, ?>) e.details()).get("reason")).isEqualTo("timeout");
                });
        assertThat(queue.calls()).isEqualTo(3);
    }
}
