package com.algolearn.codeforces;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** Ports legacy callCf.test.js. */
class CfCallsTest {

    @Test
    void returnsTheResultOfTheCall() {
        assertThat(CfCalls.call(() -> List.of(1, 2))).containsExactly(1, 2);
    }

    @Test
    void passesTypedErrorsThroughUnchanged() {
        var notFound = new NotFoundException(ErrorCode.CF_HANDLE_NOT_FOUND, "nope");
        assertThatThrownBy(() -> CfCalls.call(() -> {
            throw notFound;
        })).isSameAs(notFound);
        var down = CfErrors.httpStatus(503);
        assertThatThrownBy(() -> CfCalls.call(() -> {
            throw down;
        })).isSameAs(down);
    }

    @Test
    void turnsUnknownFailuresInto503CfUnavailableWithTheCause() {
        var cause = new IllegalStateException("fetch failed");
        assertThatThrownBy(() -> CfCalls.call(() -> {
            throw cause;
        })).isInstanceOfSatisfying(AppException.class, e -> {
            assertThat(e.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
            assertThat(e.code()).isEqualTo(ErrorCode.CF_UNAVAILABLE);
            assertThat(e.getCause()).isSameAs(cause);
        });
    }
}
