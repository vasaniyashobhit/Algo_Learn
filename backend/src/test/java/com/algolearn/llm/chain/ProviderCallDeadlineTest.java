package com.algolearn.llm.chain;

import static com.algolearn.llm.LlmFakes.httpError;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.FakeLimiter;
import com.algolearn.llm.FakeProvider;
import com.algolearn.llm.LlmFakes;
import com.algolearn.llm.chain.CallOutcome.Failed;
import java.time.Duration;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;

/** Ports legacy callProvider.deadline.test.js (deadline and circuit breaker). */
class ProviderCallDeadlineTest {

    private static CallOutcome<String> call(FakeProvider provider, ChainSettings settings, long deadline) {
        return ProviderCall.call(provider, p -> p.generateJson("P"), settings, deadline);
    }

    @Test
    void doesNotCallAtAllOnceTheDeadlineHasPassed() {
        var clock = LlmFakes.clockAt(1_000);
        var provider = FakeProvider.of("gemini", "m", "ok");
        assertThat(call(provider, LlmFakes.settings(clock), 1_000)).isEqualTo(CallOutcome.failed(Failed.TIMEOUT));
        assertThat(provider.jsonCalls).isZero();
    }

    @Test
    void clampsTheCallTimeoutToTheTimeLeftAndDoesNotTripTheBreakerForIt() {
        var clock = LlmFakes.clockAt(5_000);
        var settings = LlmFakes.settings(clock, new ArrayList<>(), 25_000);
        var provider = FakeProvider.of("gemini", "m", FakeProvider.HANG);
        assertThat(call(provider, settings, 5_015)).isEqualTo(CallOutcome.failed(Failed.TIMEOUT));
        assertThat(((FakeLimiter) settings.limiter()).limits).containsExactly(15L);
        assertThat(settings.breaker().isOpen("gemini:m")).isFalse();
    }

    @Test
    void stopsRetryingWhenTheDeadlinePassesDuringTheBackoff() {
        var clock = LlmFakes.clockAt(0);
        var provider = FakeProvider.of("gemini", "m", httpError(429));
        assertThat(call(provider, LlmFakes.settings(clock), 500)).isEqualTo(CallOutcome.failed(Failed.TIMEOUT));
        assertThat(provider.jsonCalls).isEqualTo(1);
    }

    @Test
    void aFailureAfterTheDeadlineIsATimeoutEvenIfItIsNotOne() {
        var clock = LlmFakes.clockAt(0);
        var settings = LlmFakes.settings(clock).withBreaker(CircuitBreaker.defaults(clock));
        com.algolearn.llm.provider.LlmProvider late = FakeProvider.of("gemini", "m", "x");
        var outcome = ProviderCall.call(late, p -> {
            clock.advance(Duration.ofMillis(600));
            throw httpError(503);
        }, settings, 500);
        assertThat(outcome).isEqualTo(CallOutcome.failed(Failed.TIMEOUT));
        assertThat(settings.breaker().isOpen("gemini:m")).isFalse();
    }

    @Test
    void skipsAnOpenModelForTwoMinutesThenTriesItAgain() {
        var clock = LlmFakes.clockAt(0);
        var settings = LlmFakes.settings(clock);
        settings.breaker().trip("gemini:m");
        var provider = FakeProvider.of("gemini", "m", "ok");
        assertThat(call(provider, settings, 40_000)).isEqualTo(CallOutcome.failed(Failed.OPEN));
        assertThat(provider.jsonCalls).isZero();
        clock.advance(Duration.ofMillis(119_999));
        assertThat(call(provider, settings, 160_000)).isEqualTo(CallOutcome.failed(Failed.OPEN));
        clock.advance(Duration.ofMillis(1));
        assertThat(call(provider, settings, 160_000)).isEqualTo(CallOutcome.ok("ok"));
    }
}
