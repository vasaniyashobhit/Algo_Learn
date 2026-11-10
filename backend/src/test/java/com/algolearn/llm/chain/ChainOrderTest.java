package com.algolearn.llm.chain;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.FakeProvider;
import com.algolearn.llm.provider.LlmProvider;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Ports legacy chainOrder.test.js. */
class ChainOrderTest {

    private static LlmProvider p(String id) {
        var parts = id.split(":");
        return FakeProvider.of(parts[0], parts[1], "x");
    }

    private static List<String> ids(String... providers) {
        return ChainOrder.of(Arrays.stream(providers).map(ChainOrderTest::p).toList()).stream()
                .map(ProviderCall::budgetKey).toList();
    }

    @Test
    void putsGroqRightAfterTheFirstGeminiModel() {
        assertThat(ids("gemini:a", "gemini:b", "gemini:c", "groq:g"))
                .containsExactly("gemini:a", "groq:g", "gemini:b", "gemini:c");
    }

    @Test
    void keepsTheOrderWithoutGroqOrWithOneGeminiModel() {
        assertThat(ids("gemini:a", "gemini:b")).containsExactly("gemini:a", "gemini:b");
        assertThat(ids("gemini:a", "groq:g")).containsExactly("gemini:a", "groq:g");
    }

    @Test
    void handlesNoGeminiModelAndAnEmptyList() {
        assertThat(ids("groq:g")).containsExactly("groq:g");
        assertThat(ChainOrder.of(List.of())).isEmpty();
    }
}
