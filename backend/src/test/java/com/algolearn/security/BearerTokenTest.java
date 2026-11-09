package com.algolearn.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.AuthException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Legacy middlewares/auth.test.js (readBearerToken). */
class BearerTokenTest {

    private static String codeOf(String header) {
        return catchThrowableOfType(AuthException.class, () -> BearerToken.read(header)).code().name();
    }

    @Test
    void returnsTheTokenPart() {
        assertThat(BearerToken.read("Bearer a.b.c")).isEqualTo("a.b.c");
        assertThat(BearerToken.read("  Bearer a.b.c  ")).isEqualTo("a.b.c");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   "})
    void missingOrBlankIsAuthRequired(String header) {
        assertThat(codeOf(header)).isEqualTo("AUTH_REQUIRED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"Token abc.def.ghi", "Bearer", "Bearer not-a-jwt", "Bearer a.b.c extra", "Basic abc"})
    void malformedHeadersAreAuthInvalidToken(String header) {
        var error = catchThrowableOfType(AuthException.class, () -> BearerToken.read(header));
        assertThat(error.code().name()).isEqualTo("AUTH_INVALID_TOKEN");
        assertThat(error.getMessage()).isEqualTo("Authorization header must be \"Bearer <token>\"");
    }
}
