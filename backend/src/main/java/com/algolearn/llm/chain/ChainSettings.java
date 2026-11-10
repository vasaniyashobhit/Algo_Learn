package com.algolearn.llm.chain;

import com.algolearn.common.http.Sleeper;
import com.algolearn.llm.LlmConstants;
import java.time.Clock;

/**
 * Chain settings shared by the coach and image reading (legacy chainSettings). The budget and breaker are
 * per process: the coach and the image reader get the same instances.
 */
public record ChainSettings(
        Clock clock,
        MinuteBudget budget,
        CircuitBreaker breaker,
        TimeLimiter limiter,
        Sleeper sleeper,
        int tries,
        long backoffMs,
        long timeoutMs,
        long deadlineMs) {

    /** Every default from {@link LlmConstants}, a fresh budget and breaker on {@code clock}. */
    public static ChainSettings defaults(Clock clock, TimeLimiter limiter) {
        return new ChainSettings(clock, MinuteBudget.defaults(clock), CircuitBreaker.defaults(clock), limiter,
                Sleeper.REAL, LlmConstants.TRIES, LlmConstants.BACKOFF_MS, LlmConstants.TIMEOUT_MS,
                LlmConstants.DEADLINE_MS);
    }

    public ChainSettings withBudget(MinuteBudget value) {
        return new ChainSettings(clock, value, breaker, limiter, sleeper, tries, backoffMs, timeoutMs, deadlineMs);
    }

    public ChainSettings withBreaker(CircuitBreaker value) {
        return new ChainSettings(clock, budget, value, limiter, sleeper, tries, backoffMs, timeoutMs, deadlineMs);
    }

    public ChainSettings withSleeper(Sleeper value) {
        return new ChainSettings(clock, budget, breaker, limiter, value, tries, backoffMs, timeoutMs, deadlineMs);
    }

    public ChainSettings withTries(int value) {
        return new ChainSettings(clock, budget, breaker, limiter, sleeper, value, backoffMs, timeoutMs, deadlineMs);
    }

    public ChainSettings withTimeouts(long timeout, long deadline) {
        return new ChainSettings(clock, budget, breaker, limiter, sleeper, tries, backoffMs, timeout, deadline);
    }
}
