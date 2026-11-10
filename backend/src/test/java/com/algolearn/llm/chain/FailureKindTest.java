package com.algolearn.llm.chain;

import static com.algolearn.llm.LlmFakes.httpError;
import static org.assertj.core.api.Assertions.assertThat;

import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.HttpClientErrorException;

/** Ports legacy failureKind.test.js. */
class FailureKindTest {

    @ParameterizedTest
    @ValueSource(ints = {429, 500, 502, 504})
    void retriesTheseStatusesOnce(int status) {
        assertThat(FailureKind.of(httpError(status))).isEqualTo(FailureKind.RETRY);
    }

    @Test
    void marks503AndTimeoutsAsSick() {
        assertThat(FailureKind.of(httpError(503))).isEqualTo(FailureKind.SICK);
        assertThat(FailureKind.of(LlmException.timeout(10))).isEqualTo(FailureKind.SICK);
        assertThat(FailureKind.of(new RuntimeException(new TimeoutException()))).isEqualTo(FailureKind.SICK);
        assertThat(FailureKind.of(new RuntimeException(new HttpTimeoutException("t")))).isEqualTo(FailureKind.SICK);
        assertThat(FailureKind.of(new RuntimeException(new SocketTimeoutException()))).isEqualTo(FailureKind.SICK);
    }

    @ParameterizedTest
    @ValueSource(ints = {400, 401, 403, 404})
    void failsOverOnTheseStatuses(int status) {
        assertThat(FailureKind.of(httpError(status))).isEqualTo(FailureKind.FAIL);
    }

    @Test
    void readsTheStatusOfRestClientErrorsToo() {
        var overloaded = HttpServerErrorException.create(HttpStatus.SERVICE_UNAVAILABLE, "x", null, null,
                StandardCharsets.UTF_8);
        var limited = HttpClientErrorException.create(HttpStatus.TOO_MANY_REQUESTS, "x", null, null,
                StandardCharsets.UTF_8);
        assertThat(FailureKind.of(overloaded)).isEqualTo(FailureKind.SICK);
        assertThat(FailureKind.of(limited)).isEqualTo(FailureKind.RETRY);
    }

    @Test
    void failsOverOnInvalidJsonNetworkErrorsBugsAndNull() {
        assertThat(FailureKind.of(new LlmException("bad", null, "invalid_json", null))).isEqualTo(FailureKind.FAIL);
        assertThat(FailureKind.of(new LlmException("x", null, "network", null))).isEqualTo(FailureKind.FAIL);
        assertThat(FailureKind.of(new IllegalStateException("bug"))).isEqualTo(FailureKind.FAIL);
        assertThat(FailureKind.of(null)).isEqualTo(FailureKind.FAIL);
    }
}
