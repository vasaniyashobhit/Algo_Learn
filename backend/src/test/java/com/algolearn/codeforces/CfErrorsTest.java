package com.algolearn.codeforces;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import com.algolearn.common.error.NotFoundException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** Ports legacy cfErrors.test.js. */
class CfErrorsTest {

    @Test
    void mapsHandleNotFoundCommentsTo404() {
        var error = CfErrors.failedStatus("handles: User with handle nobody_xyz not found");
        assertThat(error).isInstanceOf(NotFoundException.class);
        assertThat(error.status()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.code()).isEqualTo(ErrorCode.CF_HANDLE_NOT_FOUND);
        assertThat(((Map<?, ?>) error.details()).get("comment").toString()).contains("nobody_xyz");
    }

    @Test
    void mapsCallLimitExceededToARetryable503() {
        var error = CfErrors.failedStatus("Call limit exceeded");
        assertThat(error.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(error.code()).isEqualTo(ErrorCode.CF_UNAVAILABLE);
        assertThat(error.details()).isEqualTo(Map.of("comment", "Call limit exceeded", "retryable", true));
        assertThat(CfErrors.isRetryable(error)).isTrue();
    }

    @Test
    void mapsOtherFailedCommentsToANonRetryable502() {
        var error = CfErrors.failedStatus("count: Field should contain a number");
        assertThat(error).isInstanceOf(ExternalServiceException.class);
        assertThat(error.status()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(((Map<?, ?>) error.details()).get("retryable")).isEqualTo(false);
        assertThat(CfErrors.isRetryable(error)).isFalse();
        assertThat(((Map<?, ?>) CfErrors.failedStatus(null).details()).get("comment")).isEqualTo("");
    }

    @Test
    void marks5xxAnd429AsRetryable503AndOtherStatusesAs502() {
        var gateway = CfErrors.httpStatus(504);
        assertThat(gateway.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(gateway.details()).isEqualTo(Map.of("status", 504, "retryable", true));
        assertThat(((Map<?, ?>) CfErrors.httpStatus(429).details()).get("retryable")).isEqualTo(true);
        var forbidden = CfErrors.httpStatus(403);
        assertThat(forbidden.status()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(((Map<?, ?>) forbidden.details()).get("retryable")).isEqualTo(false);
    }

    @Test
    void wrapsUnreadableBodiesWithTheCause() {
        var cause = new IllegalStateException("bad json");
        var error = CfErrors.invalidBody(502, cause);
        assertThat(error.status()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(((Map<?, ?>) error.details()).get("retryable")).isEqualTo(true);
        assertThat(error.getCause()).isSameAs(cause);
        assertThat(((Map<?, ?>) CfErrors.invalidBody(200, null).details()).get("retryable")).isEqualTo(false);
    }

    @Test
    void retriesTimeoutsAndNetworkErrorsButNotPlainErrors() {
        assertThat(CfErrors.isRetryable(unavailable(Map.of("reason", "timeout")))).isTrue();
        assertThat(CfErrors.isRetryable(unavailable(Map.of("reason", "network")))).isTrue();
        assertThat(CfErrors.isRetryable(unavailable(Map.of("reason", "aborted")))).isFalse();
        assertThat(CfErrors.isRetryable(unavailable(null))).isFalse();
        assertThat(CfErrors.isRetryable(new IllegalStateException("x"))).isFalse();
        assertThat(CfErrors.isRetryable(null)).isFalse();
    }

    private static ExternalServiceException unavailable(Object details) {
        return new ExternalServiceException(ErrorCode.CF_UNAVAILABLE, "x", details, HttpStatus.SERVICE_UNAVAILABLE,
                null);
    }
}
