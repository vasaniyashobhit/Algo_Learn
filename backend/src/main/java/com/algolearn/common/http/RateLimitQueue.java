package com.algolearn.common.http;

import java.util.concurrent.locks.ReentrantLock;
import java.util.function.LongSupplier;
import java.util.function.Supplier;

/**
 * FIFO limiter: {@code submit(task)} starts tasks in call order, at least {@code intervalMs} apart
 * (start to start). The caller gets the task's own result or exception; a failing task never
 * blocks the ones queued after it. Only the wait is serialized (a fair lock keeps call order);
 * tasks themselves run on the caller's thread.
 */
public class RateLimitQueue {

    private final long intervalMs;
    private final LongSupplier now;
    private final Sleeper sleeper;
    private final ReentrantLock gate = new ReentrantLock(true);
    private long nextStartAt;

    public RateLimitQueue(long intervalMs, LongSupplier now, Sleeper sleeper) {
        if (intervalMs < 0) {
            throw new IllegalArgumentException("intervalMs must be a non-negative number");
        }
        this.intervalMs = intervalMs;
        this.now = now;
        this.sleeper = sleeper;
    }

    /** A queue on the real clock. */
    public static RateLimitQueue spacedBy(long intervalMs) {
        return new RateLimitQueue(intervalMs, System::currentTimeMillis, Sleeper.REAL);
    }

    public long intervalMs() {
        return intervalMs;
    }

    public <T> T submit(Supplier<T> task) {
        gate.lock();
        try {
            var waitMs = nextStartAt - now.getAsLong();
            if (waitMs > 0) {
                sleeper.sleep(waitMs);
            }
            nextStartAt = now.getAsLong() + intervalMs;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for the rate limit", e);
        } finally {
            gate.unlock();
        }
        return task.get();
    }

    /** Threads waiting for their turn (tests use it to queue callers in a known order). */
    int queueLength() {
        return gate.getQueueLength();
    }
}
