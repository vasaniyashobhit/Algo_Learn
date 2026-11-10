package com.algolearn.llm;

import static com.algolearn.llm.LlmFakes.coachJson;
import static com.algolearn.llm.LlmFakes.httpError;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.LlmFakes.FakeCache;
import com.algolearn.llm.chain.ProviderCall;
import com.algolearn.support.MutableClock;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Ports legacy coach.service.success.test.js. */
class CoachServiceSuccessTest {

    static final String TEXT = "Theatre Square: cover an n × m square with a × a flagstones.";

    private final MutableClock clock = LlmFakes.clockAt(1_000_000);
    private final List<Long> sleeps = new ArrayList<>();
    private final FakeCache cache = new FakeCache();

    private CoachService service(FakeProvider... providers) {
        return new CoachService(List.of(providers), cache, LlmFakes.settings(clock, sleeps, 50));
    }

    @Test
    void returnsACacheHitWithoutCallingAnyProvider() {
        var gemini = FakeProvider.of("gemini", "a", coachJson());
        var cached = new CachedAnswer(new CoachAnswer(List.of(), null, List.of("x"), "a", List.of(), "", "",
                List.of()), "gemini", "old");
        cache.store.put("problem:1/A", cached);
        var result = service(gemini).getCoachAnswer(new CoachRequest("1/A", TEXT, null, null));
        assertThat(result).isEqualTo(new CoachResult(cached.answer(), "cache", "gemini", "old", null));
        assertThat(gemini.jsonCalls).isZero();
    }

    @Test
    void answersFromTheFirstModelAndCachesTheSanitizedAnswer() {
        var gemini = FakeProvider.of("gemini", "a", coachJson(Map.of("tags", List.of("dp", "not-a-tag"))));
        var result = service(gemini, FakeProvider.of("gemini", "b", coachJson()))
                .getCoachAnswer(new CoachRequest("1/A", TEXT, List.of("math"), null));
        assertThat(result.source()).isEqualTo("ai");
        assertThat(result.provider()).isEqualTo("gemini");
        assertThat(result.model()).isEqualTo("a");
        assertThat(result.reason()).isNull();
        assertThat(result.answer().tags()).containsExactly("dp");
        assertThat(cache.store).containsEntry("problem:1/A", new CachedAnswer(result.answer(), "gemini", "a"));
        assertThat(gemini.prompts.getFirst()).contains("Known tags for this problem: math");
    }

    @Test
    void retriesA429OnceAfterOneSecondThenSucceeds() {
        var gemini = FakeProvider.of("gemini", "a", httpError(429), coachJson());
        try (var logs = new LogCapture(ProviderCall.class)) {
            var result = service(gemini).getCoachAnswer(CoachRequest.ofText(TEXT));
            assertThat(result.source()).isEqualTo("ai");
            assertThat(result.model()).isEqualTo("a");
            assertThat(logs.messages("WARN")).anyMatch(m -> m.startsWith(
                    "LLM call failed (provider=gemini, model=a, attempt=1, retry=true"));
        }
        assertThat(gemini.jsonCalls).isEqualTo(2);
        assertThat(sleeps).containsExactly(1_000L);
    }

    @Test
    void movesToModelBWhenModelAIsExhaustedAfterTwoTries() {
        var a = FakeProvider.of("gemini", "a", httpError(429));
        var result = service(a, FakeProvider.of("gemini", "b", coachJson())).getCoachAnswer(CoachRequest.ofText(TEXT));
        assertThat(result.model()).isEqualTo("b");
        assertThat(a.jsonCalls).isEqualTo(2);
    }

    @Test
    void fallsThroughToGroqWhenEveryGeminiModelFails() {
        var b = FakeProvider.of("gemini", "b", httpError(404));
        var groq = FakeProvider.of("groq", "llama", coachJson());
        var result = service(FakeProvider.of("gemini", "a", httpError(503)), b, groq)
                .getCoachAnswer(CoachRequest.ofText(TEXT));
        assertThat(result.provider()).isEqualTo("groq");
        assertThat(result.model()).isEqualTo("llama");
        assertThat(b.jsonCalls).isEqualTo(1);
    }

    @Test
    void movesOnAtOnceWhenAModelHangsPastTheTimeout() {
        var a = FakeProvider.of("gemini", "a", FakeProvider.HANG, coachJson());
        var result = service(a, FakeProvider.of("gemini", "b", coachJson())).getCoachAnswer(CoachRequest.ofText(TEXT));
        assertThat(result.model()).isEqualTo("b");
        assertThat(a.jsonCalls).isEqualTo(1);
    }
}
