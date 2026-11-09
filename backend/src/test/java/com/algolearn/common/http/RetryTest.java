package com.algolearn.common.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class RetryTest {

    private final RetryPolicy policy = new RetryPolicy(3, 100, 1_000, 2);
    private final List<Long> sleeps = new ArrayList<>();
    private final List<Integer> attempts = new ArrayList<>();

    private String failTimes(int failures, int attempt) {
        attempts.add(attempt);
        if (attempt <= failures) {
            throw new IllegalStateException("fail " + attempt);
        }
        return "ok";
    }

    private Retry retry() {
        return Retry.of(policy).withSleeper(sleeps::add).withRandom(() -> 1);
    }

    @Test
    void delaysGrowExponentiallyAndAreCappedAtMax() {
        var delays = IntStream.rangeClosed(1, 5).mapToObj(a -> Retry.computeDelay(a, policy, () -> 1)).toList();
        assertThat(delays).containsExactly(100L, 200L, 400L, 800L, 1_000L);
    }

    @Test
    void appliesFullJitterBetweenZeroAndTheCeiling() {
        assertThat(Retry.computeDelay(3, policy, () -> 0)).isZero();
        assertThat(Retry.computeDelay(3, policy, () -> 0.5)).isEqualTo(200);
    }

    @Test
    void returnsImmediatelyOnSuccessWithoutSleeping() {
        int result = retry().call(attempt -> 42);
        assertThat(result).isEqualTo(42);
        assertThat(sleeps).isEmpty();
    }

    @Test
    void retriesUntilSuccessWithBackoffAndPassesTheAttemptNumber() {
        var events = new ArrayList<Retry.RetryEvent>();
        String result = retry().withOnRetry(events::add).call(a -> failTimes(2, a));
        assertThat(result).isEqualTo("ok");
        assertThat(attempts).containsExactly(1, 2, 3);
        assertThat(sleeps).containsExactly(100L, 200L);
        assertThat(events.getFirst().attempt()).isEqualTo(1);
        assertThat(events.getFirst().delayMs()).isEqualTo(100);
    }

    @Test
    void rethrowsTheLastErrorUnchangedAfterExhaustingRetries() {
        var twoRetries = Retry.of(new RetryPolicy(2, 100, 1_000, 2)).withSleeper(sleeps::add);
        assertThatThrownBy(() -> twoRetries.call(a -> failTimes(10, a))).hasMessage("fail 3");
        assertThat(attempts).hasSize(3);
    }

    @Test
    void stopsEarlyWhenShouldRetryReturnsFalse() {
        var seen = new ArrayList<Integer>();
        var limited = retry().withShouldRetry((error, attempt) -> seen.add(attempt) && attempt < 2);
        assertThatThrownBy(() -> limited.call(a -> failTimes(10, a))).hasMessage("fail 2");
        assertThat(seen).containsExactly(1, 2);
    }

    @Test
    void anInterruptedSleepRestoresTheFlagAndRethrowsTheLastError() {
        var interrupted = Retry.of(policy).withSleeper(ms -> {
            throw new InterruptedException("stop");
        });
        assertThatThrownBy(() -> interrupted.call(a -> failTimes(10, a))).hasMessage("fail 1")
                .satisfies(e -> assertThat(e.getSuppressed()).hasSize(1));
        assertThat(Thread.interrupted()).isTrue();
    }

    @Test
    void realSleeperWaitsTheGivenTime() throws InterruptedException {
        var start = System.nanoTime();
        Sleeper.REAL.sleep(20);
        assertThat(System.nanoTime() - start).isGreaterThanOrEqualTo(15_000_000L);
        assertThat(RetryPolicy.DEFAULT).isEqualTo(new RetryPolicy(3, 200, 5_000, 2));
    }
}
