package com.algolearn.common.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import org.junit.jupiter.api.Test;

/** Ports legacy rateLimitQueue.test.js. */
class RateLimitQueueTest {

    @Test
    void validatesIntervalMs() {
        assertThatThrownBy(() -> new RateLimitQueue(-1, () -> 0, Sleeper.REAL))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(RateLimitQueue.spacedBy(2_100).intervalMs()).isEqualTo(2_100);
    }

    @Test
    void runsTheFirstTaskImmediatelyAndSpacesTheNextOnesByIntervalMs() {
        var clock = new FakeClock();
        var queue = clock.queue(2_100);
        var starts = new ArrayList<Long>();
        var results = List.of(1, 2, 3).stream().map(n -> queue.submit(() -> {
            starts.add(clock.time);
            return n;
        })).toList();
        assertThat(results).containsExactly(1, 2, 3);
        assertThat(starts).containsExactly(1_000L, 3_100L, 5_200L);
        assertThat(clock.waits).containsExactly(2_100L, 2_100L);
    }

    @Test
    void letsCallersThroughInCallOrderAcrossThreads() throws Exception {
        var release = new CountDownLatch(1);
        var order = new CopyOnWriteArrayList<String>();
        // The clock never moves, so every caller after the first waits; the wait runs inside the gate.
        var queue = new RateLimitQueue(10, () -> 0, ms -> {
            order.add(Thread.currentThread().getName());
            release.await();
        });
        queue.submit(() -> 0);
        var threads = new ArrayList<Thread>();
        for (var name : List.of("b", "c", "d")) {
            threads.add(Thread.ofPlatform().name(name).start(() -> queue.submit(() -> 0)));
            while (order.size() + queue.queueLength() < threads.size()) {
                Thread.sleep(5);
            }
        }
        release.countDown();
        for (var thread : threads) {
            thread.join();
        }
        assertThat(order).containsExactly("b", "c", "d");
    }

    @Test
    void doesNotWaitWhenEnoughTimeHasAlreadyPassed() {
        var clock = new FakeClock();
        var queue = clock.queue(100);
        queue.submit(() -> 1);
        clock.time += 500;
        queue.submit(() -> 2);
        assertThat(clock.waits).isEmpty();
    }

    @Test
    void propagatesTaskErrorsWithoutBlockingLaterTasks() {
        var clock = new FakeClock();
        var queue = clock.queue(50);
        assertThatThrownBy(() -> queue.submit(() -> {
            throw new IllegalStateException("boom");
        })).hasMessage("boom");
        assertThat(queue.submit(() -> "still runs")).isEqualTo("still runs");
        assertThat(clock.waits).containsExactly(50L);
    }

    @Test
    void usesTheRealClockByDefault() {
        var queue = RateLimitQueue.spacedBy(60);
        queue.submit(() -> 1);
        var start = System.nanoTime();
        queue.submit(() -> 2);
        assertThat((System.nanoTime() - start) / 1_000_000).isGreaterThanOrEqualTo(50);
    }
}
