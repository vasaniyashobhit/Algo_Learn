package com.algolearn.llm.chain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Ports legacy llmError.test.js. */
class LlmExceptionTest {

    @Test
    void keepsStatusReasonAndCause() {
        var cause = new IllegalStateException("root");
        var error = new LlmException("m", 429, "r", cause);
        assertThat(error).hasMessage("m").hasCause(cause);
        assertThat(error.status()).isEqualTo(429);
        assertThat(error.reason()).isEqualTo("r");
        assertThat(new LlmException("plain").status()).isNull();
    }

    @Test
    void namesHttpFailuresAndTimeouts() {
        assertThat(LlmException.http("Groq", 429, null)).hasMessage("Groq answered HTTP 429")
                .extracting(LlmException::status).isEqualTo(429);
        var timeout = LlmException.timeout(15);
        assertThat(timeout).hasMessage("Timed out after 15ms");
        assertThat(timeout.isTimeout()).isTrue();
        assertThat(new LlmException("x").isTimeout()).isFalse();
    }

    @Test
    void describesErrorsBrieflyForLogs() {
        assertThat(LlmException.describe(new LlmException("x".repeat(300), 503, null, null)))
                .containsEntry("name", "LlmException").containsEntry("status", 503).containsEntry("reason", null)
                .containsEntry("message", "x".repeat(200));
        assertThat(LlmException.describe(new IllegalStateException("text"))).containsEntry("message", "text")
                .containsEntry("status", null);
        assertThat(LlmException.describe(null)).containsEntry("name", null).containsEntry("message", "null");
    }
}
