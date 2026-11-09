package com.algolearn.common.http;

import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.BiPredicate;
import java.util.function.Consumer;
import java.util.function.DoubleSupplier;
import java.util.function.IntFunction;

/**
 * Exponential backoff with full jitter. Runs {@code fn(attempt)} and retries up to
 * {@code retries} extra times while {@code shouldRetry(error, attempt)} is true; the last error is
 * re-thrown unchanged (callers throw typed AppExceptions). Sleep and randomness are injectable.
 */
public record Retry(RetryPolicy policy, BiPredicate<RuntimeException, Integer> shouldRetry, Sleeper sleeper,
        DoubleSupplier random, Consumer<RetryEvent> onRetry) {

    public Retry {
        Objects.requireNonNull(policy);
        Objects.requireNonNull(shouldRetry);
        Objects.requireNonNull(sleeper);
        Objects.requireNonNull(random);
        Objects.requireNonNull(onRetry);
    }

    public static Retry of(RetryPolicy policy) {
        return new Retry(policy, (error, attempt) -> true, Sleeper.REAL,
                () -> ThreadLocalRandom.current().nextDouble(), event -> { });
    }

    public Retry withShouldRetry(BiPredicate<RuntimeException, Integer> rule) {
        return new Retry(policy, rule, sleeper, random, onRetry);
    }

    public Retry withSleeper(Sleeper value) {
        return new Retry(policy, shouldRetry, value, random, onRetry);
    }

    public Retry withRandom(DoubleSupplier value) {
        return new Retry(policy, shouldRetry, sleeper, value, onRetry);
    }

    public Retry withOnRetry(Consumer<RetryEvent> value) {
        return new Retry(policy, shouldRetry, sleeper, random, value);
    }

    /** A random delay in [0, min(maxMs, baseMs * factor^(attempt-1))], rounded to whole ms. */
    public static long computeDelay(int attempt, RetryPolicy policy, DoubleSupplier random) {
        var ceiling = Math.min(policy.maxMs(), policy.baseMs() * Math.pow(policy.factor(), attempt - 1));
        return Math.round(random.getAsDouble() * ceiling);
    }

    public <T> T call(IntFunction<T> fn) {
        for (var attempt = 1; ; attempt++) {
            try {
                return fn.apply(attempt);
            } catch (RuntimeException error) {
                if (attempt > policy.retries() || !shouldRetry.test(error, attempt)) {
                    throw error;
                }
                var delayMs = computeDelay(attempt, policy, random);
                onRetry.accept(new RetryEvent(error, attempt, delayMs));
                pause(delayMs, error);
            }
        }
    }

    private void pause(long delayMs, RuntimeException last) {
        try {
            sleeper.sleep(delayMs);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            last.addSuppressed(interrupted);
            throw last;
        }
    }

    /** One scheduled retry: the error that caused it, the attempt that failed and the delay. */
    public record RetryEvent(RuntimeException error, int attempt, long delayMs) {
    }
}
