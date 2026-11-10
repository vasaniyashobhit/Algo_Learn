package com.algolearn.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Arrays;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Ports legacy llmConstants.test.js. */
class LlmConstantsTest {

    @Test
    void matchTheChainSpec() {
        assertThat(LlmConstants.DEADLINE_MS).isEqualTo(40_000);
        assertThat(LlmConstants.TRIES).isEqualTo(2);
        assertThat(LlmConstants.BACKOFF_MS).isEqualTo(1_000);
        assertThat(LlmConstants.TIMEOUT_MS).isEqualTo(25_000);
        assertThat(LlmConstants.CIRCUIT_OPEN_MS).isEqualTo(120_000);
        assertThat(LlmConstants.MAX_HINTS).isEqualTo(3);
        assertThat(LlmConstants.RATING_MIN).isEqualTo(800);
        assertThat(LlmConstants.RATING_MAX).isEqualTo(3500);
        assertThat(LlmConstants.RATING_STEP).isEqualTo(100);
        assertThat(LlmConstants.TEMPERATURE).isEqualTo(0.2);
        assertThat(LlmConstants.BUDGET_PER_MINUTE).isEqualTo(Map.of("gemini", 8, "groq", 25));
        assertThatThrownBy(() -> LlmConstants.BUDGET_PER_MINUTE.put("x", 1))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void exposeTheFallbackReasons() {
        assertThat(Arrays.stream(FallbackReason.values()).map(Enum::name))
                .containsExactly("NO_INPUT", "AI_BUSY", "AI_UNAVAILABLE", "AI_TIMEOUT");
    }

    @Test
    void resultFactories() {
        var fallback = CoachResult.fallback(FallbackReason.AI_BUSY);
        assertThat(fallback.isFallback()).isTrue();
        assertThat(fallback.answer()).isNull();
        assertThat(CoachRequest.ofText("t").knownTags()).isEmpty();
        assertThat(new CoachRequest(null, null, java.util.Arrays.asList("dp", null), null).knownTags())
                .containsExactly("dp");
    }
}
