package com.algolearn.config.env;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.support.TestProperties;
import java.util.Map;
import org.junit.jupiter.api.Test;

class EnvValidatorErrorsTest {

    private static EnvValidationException failure(Map<String, String> env) {
        try {
            EnvValidator.parse(env::get, false);
        } catch (EnvValidationException e) {
            return e;
        }
        throw new AssertionError("expected EnvValidationException");
    }

    @Test
    void failsFastListingEveryMissingVariable() {
        var env = TestProperties.env();
        env.remove("DATABASE_URL");
        env.remove("GEMINI_API_KEY");
        var error = failure(env);
        assertThat(error.getMessage()).startsWith("Invalid environment configuration (see backend/.env.example):")
                .contains("  - DATABASE_URL: missing", "  - GEMINI_API_KEY: missing");
        assertThat(error.issues()).hasSize(2);
    }

    @Test
    void explainsInvalidValuesThatArePresentWithoutPrintingThem() {
        var env = TestProperties.env();
        env.put("JWT_SECRET", "short");
        env.put("DATABASE_URL", "http://nope");
        env.put("PORT", "abc");
        var message = failure(env).getMessage();
        assertThat(message).contains("JWT_SECRET: Must be at least 32 characters",
                "DATABASE_URL: Must be a jdbc:postgresql:// URL", "PORT:").doesNotContain("short", "nope");
    }

    @Test
    void rejectsEmptyModelsUnknownLogLevelBadCronShortCronSecretAndBadUrl() {
        var env = TestProperties.env();
        env.put("GEMINI_MODELS", " , ");
        env.put("LOG_LEVEL", "loud");
        env.put("SYNC_CRON", "every day");
        env.put("CRON_SECRET", "short");
        env.put("CLIENT_URL", "not a url");
        assertThatThrownBy(() -> EnvValidator.parse(env::get, false))
                .hasMessageContaining("GEMINI_MODELS: Provide at least one model")
                .hasMessageContaining("LOG_LEVEL:").hasMessageContaining("SYNC_CRON:")
                .hasMessageContaining("CRON_SECRET: Must be at least 16 characters")
                .hasMessageContaining("CLIENT_URL:");
    }
}
