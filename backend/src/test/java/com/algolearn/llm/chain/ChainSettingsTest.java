package com.algolearn.llm.chain;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.common.http.Sleeper;
import com.algolearn.llm.LlmConstants;
import com.algolearn.llm.LlmFakes;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Ports legacy chainSettings.test.js and the minute budget / circuit breaker rules. */
class ChainSettingsTest {

    private final com.algolearn.support.MutableClock clock = LlmFakes.clockAt(0);

    @Test
    void fillsEveryDefaultFromTheConstants() {
        var limiter = new ExecutorTimeLimiter(null);
        var settings = ChainSettings.defaults(clock, limiter);
        assertThat(settings.tries()).isEqualTo(LlmConstants.TRIES);
        assertThat(settings.backoffMs()).isEqualTo(LlmConstants.BACKOFF_MS);
        assertThat(settings.timeoutMs()).isEqualTo(LlmConstants.TIMEOUT_MS);
        assertThat(settings.deadlineMs()).isEqualTo(LlmConstants.DEADLINE_MS);
        assertThat(settings.sleeper()).isSameAs(Sleeper.REAL);
        assertThat(settings.limiter()).isSameAs(limiter);
        assertThat(settings.budget().remaining("gemini:a")).isEqualTo(8);
        assertThat(settings.budget().remaining("groq:g")).isEqualTo(25);
    }

    @Test
    void withersKeepTheOtherValues() {
        var settings = ChainSettings.defaults(clock, null);
        var budget = MinuteBudget.defaults(clock);
        var breaker = CircuitBreaker.defaults(clock);
        Sleeper sleeper = ms -> { };
        var changed = settings.withBudget(budget).withBreaker(breaker).withSleeper(sleeper).withTries(1)
                .withTimeouts(10, 20);
        assertThat(changed.budget()).isSameAs(budget);
        assertThat(changed.breaker()).isSameAs(breaker);
        assertThat(changed.sleeper()).isSameAs(sleeper);
        assertThat(changed.tries()).isEqualTo(1);
        assertThat(changed.timeoutMs()).isEqualTo(10);
        assertThat(changed.deadlineMs()).isEqualTo(20);
        assertThat(changed.backoffMs()).isEqualTo(LlmConstants.BACKOFF_MS);
    }

    @Test
    void opensTheBreakerForTwoMinutesByDefault() {
        var breaker = CircuitBreaker.defaults(clock);
        assertThat(breaker.isOpen("k")).isFalse();
        breaker.trip("k");
        clock.advance(Duration.ofMillis(LlmConstants.CIRCUIT_OPEN_MS - 1));
        assertThat(breaker.isOpen("k")).isTrue();
        clock.advance(Duration.ofMillis(1));
        assertThat(breaker.isOpen("k")).isFalse();
        assertThat(breaker.isOpen("k")).isFalse();
    }

    @Test
    void budgetLimitsByProviderNameWithADefaultForUnknownNames() {
        var budget = MinuteBudget.forProviders(Map.of("gemini", 1), clock);
        assertThat(budget.tryTake("gemini:a")).isTrue();
        assertThat(budget.tryTake("gemini:a")).isFalse();
        assertThat(budget.remaining("gemini:a")).isZero();
        assertThat(budget.remaining("other:x")).isEqualTo(LlmConstants.DEFAULT_BUDGET_PER_MINUTE);
    }

    @Test
    void budgetIsASlidingSixtySecondWindow() {
        var budget = MinuteBudget.forProviders(Map.of("gemini", 2), clock);
        assertThat(budget.tryTake("gemini:a")).isTrue();
        clock.advance(Duration.ofSeconds(30));
        assertThat(budget.tryTake("gemini:a")).isTrue();
        assertThat(budget.tryTake("gemini:a")).isFalse();
        clock.advance(Duration.ofSeconds(30));
        assertThat(budget.remaining("gemini:a")).isEqualTo(1);
        assertThat(budget.tryTake("gemini:a")).isTrue();
        assertThat(budget.tryTake("gemini:b")).isTrue();
    }
}
