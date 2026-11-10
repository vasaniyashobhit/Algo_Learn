package com.algolearn.llm;

import static com.algolearn.llm.LlmFakes.coachJson;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.config.AppProperties;
import com.algolearn.llm.chain.ProviderCall;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

/** Ports legacy llm.module.test.js (wiring and the offline LLM). */
class LlmTest {

    private static AppProperties props(Optional<String> groqKey, Optional<String> groqModel) {
        return new AppProperties(4000, "s", "7d", "http://c", "k", List.of("a", "b"), groqKey, groqModel, "c",
                "0 */6 * * *", "info", false);
    }

    private static List<String> ids(List<? extends com.algolearn.llm.provider.LlmProvider> providers) {
        return providers.stream().map(ProviderCall::budgetKey).toList();
    }

    private static List<com.algolearn.llm.provider.LlmProvider> providers(AppProperties props) {
        return LlmConfig.providers(props, RestClient.builder(), LlmFakes.MAPPER, "http://g", "http://q");
    }

    @Test
    void ordersGeminiModelsFirstAndLeavesGroqOutWithoutAKey() {
        assertThat(ids(providers(props(Optional.empty(), Optional.of("llama"))))).containsExactly("gemini:a",
                "gemini:b");
        assertThat(ids(providers(props(Optional.of(" "), Optional.of("llama"))))).hasSize(2);
        assertThat(ids(providers(props(Optional.of("g"), Optional.empty())))).hasSize(2);
    }

    @Test
    void putsGroqRightAfterTheFirstGeminiModelWhenKeyAndModelAreSet() {
        var llm = new Llm(providers(props(Optional.of("g"), Optional.of("llama"))), new LlmFakes.FakeCache(),
                LlmFakes.settings(LlmFakes.clockAt(0)));
        assertThat(ids(llm.providers())).containsExactly("gemini:a", "groq:llama", "gemini:b");
        assertThat(llm.providers().get(1).readsImages()).isFalse();
    }

    @Test
    void exposesGetCoachAnswerAndExtractImageTextOverTheSameProviders() {
        var gemini = FakeProvider.of("gemini", "a", coachJson(), "text in image");
        var llm = new Llm(List.of(gemini), new LlmFakes.FakeCache(), LlmFakes.settings(LlmFakes.clockAt(0)));
        var answer = llm.getCoachAnswer(CoachRequest.ofText("problem"));
        assertThat(answer.source()).isEqualTo("ai");
        assertThat(answer.model()).isEqualTo("a");
        assertThat(llm.extractImageText("x".getBytes(StandardCharsets.UTF_8), "image/png", null))
                .contains(new ImageText("text in image", "gemini", "a"));
        assertThat(gemini.jsonCalls + gemini.imageCalls).isEqualTo(2);
    }

    @Test
    void offlineLlmHasNoProvidersFallsBackWithAiUnavailableAndReadsNoImages() {
        var llm = Llm.offline(LlmFakes.settings(LlmFakes.clockAt(0)));
        assertThat(llm.providers()).isEmpty();
        assertThat(llm.getCoachAnswer(CoachRequest.ofText("problem")))
                .isEqualTo(CoachResult.fallback(FallbackReason.AI_UNAVAILABLE));
        assertThat(llm.extractImageText("x".getBytes(StandardCharsets.UTF_8), "image/png", null)).isEmpty();
    }
}
