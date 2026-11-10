package com.algolearn.llm.chain;

import static com.algolearn.llm.LlmFakes.httpError;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.FakeProvider;
import com.algolearn.llm.LlmFakes;
import com.algolearn.llm.LogCapture;
import com.algolearn.llm.chain.CallOutcome.Failed;
import com.algolearn.support.MutableClock;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

/** Ports legacy callProvider.test.js (retry rules). */
class ProviderCallTest {

    private final MutableClock clock = LlmFakes.clockAt(1_000);
    private final List<Long> sleeps = new ArrayList<>();
    private final ChainSettings settings = LlmFakes.settings(clock, sleeps, 50);
    private final long deadline = 11_000;

    private CallOutcome<String> call(FakeProvider provider, ChainSettings s) {
        Function<com.algolearn.llm.provider.LlmProvider, String> json = p -> p.generateJson("P");
        return ProviderCall.call(provider, json, s, deadline);
    }

    @Test
    void buildsTheBudgetKeyFromNameAndModel() {
        assertThat(ProviderCall.budgetKey(FakeProvider.of("gemini", "m"))).isEqualTo("gemini:m");
    }

    @Test
    void retriesA429OnceAfterOneSecondAndTakesOneBudgetUnitPerTry() {
        var budget = MinuteBudget.forProviders(java.util.Map.of("gemini", 5), clock);
        var provider = FakeProvider.of("gemini", "m", httpError(429), "ok");
        assertThat(call(provider, settings.withBudget(budget))).isEqualTo(CallOutcome.ok("ok"));
        assertThat(budget.remaining("gemini:m")).isEqualTo(3);
        assertThat(sleeps).containsExactly(1_000L);
    }

    @ParameterizedTest
    @ValueSource(ints = {500, 502, 504})
    void givesUpAfterTwoTries(int status) {
        var provider = FakeProvider.of("gemini", "m", httpError(status));
        try (var logs = new LogCapture(ProviderCall.class)) {
            assertThat(call(provider, settings)).isEqualTo(CallOutcome.failed(Failed.ERROR));
            assertThat(logs.messages("WARN").getLast()).startsWith(
                    "LLM call failed (provider=gemini, model=m, attempt=2, retry=false, kind=RETRY");
        }
        assertThat(provider.jsonCalls).isEqualTo(2);
    }

    @Test
    void doesNotRetryA503AndOpensTheCircuit() {
        var provider = FakeProvider.of("gemini", "m", httpError(503));
        assertThat(call(provider, settings)).isEqualTo(CallOutcome.failed(Failed.ERROR));
        assertThat(provider.jsonCalls).isEqualTo(1);
        assertThat(sleeps).isEmpty();
        assertThat(settings.breaker().isOpen("gemini:m")).isTrue();
    }

    @Test
    void doesNotRetryATimeoutAndOpensTheCircuit() {
        var provider = FakeProvider.of("gemini", "m", FakeProvider.HANG);
        assertThat(call(provider, settings)).isEqualTo(CallOutcome.failed(Failed.ERROR));
        assertThat(provider.jsonCalls).isEqualTo(1);
        assertThat(settings.breaker().isOpen("gemini:m")).isTrue();
    }

    @Test
    void doesNotRetryOrTripOnANonRetryableError() {
        var provider = FakeProvider.of("gemini", "m", httpError(404));
        assertThat(call(provider, settings)).isEqualTo(CallOutcome.failed(Failed.ERROR));
        assertThat(provider.jsonCalls).isEqualTo(1);
        assertThat(settings.breaker().isOpen("gemini:m")).isFalse();
    }

    @Test
    void reportsBusyWithoutCallingWhenTheBudgetIsUsedUp() {
        var provider = FakeProvider.of("gemini", "m", "ok");
        try (var logs = new LogCapture(ProviderCall.class)) {
            var outcome = call(provider, settings.withBudget(LlmFakes.closedBudget(clock)));
            assertThat(outcome).isEqualTo(CallOutcome.failed(Failed.BUSY));
            assertThat(logs.messages("WARN")).anyMatch(m -> m.contains("budget") && m.contains("provider=gemini"));
        }
        assertThat(provider.jsonCalls).isZero();
    }
}
