package com.algolearn.llm;

import static com.algolearn.llm.LlmFakes.coachJson;
import static com.algolearn.llm.LlmFakes.httpError;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.LlmFakes.FakeCache;
import com.algolearn.llm.cache.CoachCache;
import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.llm.chain.LlmException;
import com.algolearn.llm.chain.MinuteBudget;
import com.algolearn.llm.chain.ProviderCall;
import com.algolearn.support.MutableClock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Ports legacy coach.service.failure.test.js. */
class CoachServiceFailureTest {

    private static final String TEXT = "Some problem statement.";

    private final MutableClock clock = LlmFakes.clockAt(0);
    private final ChainSettings settings = LlmFakes.settings(clock);
    private final FakeCache cache = new FakeCache();

    private CoachResult ask(ChainSettings s, CoachCache c, FakeProvider... providers) {
        return new CoachService(List.of(providers), c, s).getCoachAnswer(CoachRequest.ofText(TEXT));
    }

    @Test
    void returnsTheFallbackNeverThrowingWhenEveryProviderFails() {
        var groq = FakeProvider.of("groq", "g", new LlmException("fetch failed", null, "network", null));
        try (var logs = new LogCapture(ProviderCall.class)) {
            var result = new CoachService(List.of(FakeProvider.of("gemini", "a", httpError(500)), groq), cache,
                    settings).getCoachAnswer(new CoachRequest("1/A", TEXT, List.of(), null));
            assertThat(result).isEqualTo(CoachResult.fallback(FallbackReason.AI_UNAVAILABLE));
            assertThat(logs.messages("WARN")).anyMatch(m -> m.startsWith("LLM call failed (provider=groq, model=g"));
        }
        assertThat(cache.written).isEmpty();
    }

    @Test
    void treatsInvalidJsonAsAFailureOfThatModelWithoutRetry() {
        var a = FakeProvider.of("gemini", "a", "Sure! Here is the answer: {");
        try (var logs = new LogCapture(ProviderCall.class)) {
            var result = ask(settings, cache, a, FakeProvider.of("gemini", "b", coachJson()));
            assertThat(result.source()).isEqualTo("ai");
            assertThat(result.model()).isEqualTo("b");
            assertThat(logs.messages("WARN")).anyMatch(m -> m.contains("model=a") && m.contains("invalid_json"));
        }
        assertThat(a.jsonCalls).isEqualTo(1);
    }

    @Test
    void treatsJsonThatMissesTheSchemaAsAFailure() {
        var result = ask(settings, cache, FakeProvider.of("gemini", "a", "{\"tags\":[\"dp\"]}"));
        assertThat(result.isFallback()).isTrue();
        assertThat(cache.written).isEmpty();
    }

    @Test
    void skipsAProviderWhoseBudgetIsUsedUpAndSaysAiBusyWhenAllAre() {
        var a = FakeProvider.of("gemini", "a", coachJson());
        var result = ask(settings.withBudget(LlmFakes.closedBudget(clock)), cache, a);
        assertThat(result).isEqualTo(CoachResult.fallback(FallbackReason.AI_BUSY));
        assertThat(a.jsonCalls).isZero();
    }

    @Test
    void goesStraightToTheNextProviderOnceTheBudgetRunsOutMidRetry() {
        var budget = MinuteBudget.forProviders(Map.of("gemini", 1, "groq", 5), clock);
        var a = FakeProvider.of("gemini", "a", httpError(429));
        var result = ask(settings.withBudget(budget), cache, a, FakeProvider.of("groq", "g", coachJson()));
        assertThat(result.provider()).isEqualTo("groq");
        assertThat(a.jsonCalls).isEqualTo(1);
        clock.set(java.time.Instant.ofEpochMilli(0).plus(Duration.ofSeconds(61)));
        assertThat(budget.tryTake("gemini:a")).isTrue();
    }
}
