package com.algolearn.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.Test;

class AppExceptionTest {

    static Stream<Arguments> defaults() {
        return Stream.of(
                Arguments.of(new ValidationException(), 400, ErrorCode.VALIDATION_FAILED),
                Arguments.of(new AuthException(), 401, ErrorCode.AUTH_REQUIRED),
                Arguments.of(new ForbiddenException(), 403, ErrorCode.FORBIDDEN),
                Arguments.of(new NotFoundException(), 404, ErrorCode.NOT_FOUND),
                Arguments.of(new ConflictException(), 409, ErrorCode.DUPLICATE_RESOURCE),
                Arguments.of(new PayloadException(), 415, ErrorCode.FILE_TYPE_UNSUPPORTED),
                Arguments.of(new RateLimitException(), 429, ErrorCode.RATE_LIMITED),
                Arguments.of(new UnprocessableException(), 422, ErrorCode.INPUT_UNREADABLE));
    }

    @ParameterizedTest
    @MethodSource("defaults")
    void subclassHasItsStatusAndDefaultCode(AppException error, int status, ErrorCode code) {
        assertThat(error.status().value()).isEqualTo(status);
        assertThat(error.code()).isEqualTo(code);
        assertThat(error.getMessage()).isNotBlank();
        assertThat(error.details()).isNull();
        assertThat(error.getCause()).isNull();
    }

    @Test
    void storesSpecificCodeMessageDetailsAndCause() {
        var cause = new IllegalStateException("db");
        var error = new NotFoundException(ErrorCode.PROBLEM_NOT_FOUND, "No problem 1/Z", Map.of("id", "1/Z"), cause);
        assertThat(error.code()).isEqualTo(ErrorCode.PROBLEM_NOT_FOUND);
        assertThat(error.getMessage()).isEqualTo("No problem 1/Z");
        assertThat(error.details()).isEqualTo(Map.of("id", "1/Z"));
        assertThat(error.getCause()).isSameAs(cause);
        assertThat(new ConflictException(ErrorCode.SYNC_IN_PROGRESS, "busy", null).details()).isNull();
    }

    @Test
    void payloadUses413ForFileTooLarge() {
        assertThat(new PayloadException(ErrorCode.FILE_TOO_LARGE, "big").status().value()).isEqualTo(413);
        assertThat(new PayloadException(ErrorCode.FILE_TYPE_UNSUPPORTED, "x", null).status().value()).isEqualTo(415);
    }

    @Test
    void externalServiceDefaultsTo502AndAccepts503() {
        assertThat(new ExternalServiceException(ErrorCode.CF_UNAVAILABLE).status().value()).isEqualTo(502);
        var cause = new IllegalStateException("down");
        var down = new ExternalServiceException(ErrorCode.CF_UNAVAILABLE, "Down", null,
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, cause);
        assertThat(down.status().value()).isEqualTo(503);
        assertThat(down.getCause()).isSameAs(cause);
        assertThat(new ExternalServiceException(ErrorCode.CF_UNAVAILABLE, "x", cause).status().value()).isEqualTo(502);
    }
}
