package com.algolearn.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Fixed-window limit per key (like express-rate-limit's memory store): {@code limit} requests,
 * all restored together when the window ends. Idle full buckets are dropped now and then.
 */
public class RateLimiter {

    private static final long SWEEP_EVERY = 1_000;

    private final long limit;
    private final Duration window;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final AtomicLong calls = new AtomicLong();

    public RateLimiter(long limit, Duration window) {
        this.limit = limit;
        this.window = window;
    }

    public long limit() {
        return limit;
    }

    public long windowSeconds() {
        return window.toSeconds();
    }

    public Decision tryConsume(String key) {
        if (calls.incrementAndGet() % SWEEP_EVERY == 0) {
            buckets.values().removeIf(bucket -> bucket.getAvailableTokens() >= limit);
        }
        var bucket = buckets.computeIfAbsent(key, k -> newBucket());
        var probe = bucket.tryConsumeAndReturnRemaining(1);
        var resetNanos = probe.isConsumed()
                ? bucket.estimateAbilityToConsume(limit).getNanosToWaitForRefill()
                : probe.getNanosToWaitForRefill();
        return new Decision(probe.isConsumed(), probe.getRemainingTokens(), toSeconds(resetNanos));
    }

    private Bucket newBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(limit).refillIntervally(limit, window).build())
                .build();
    }

    private static long toSeconds(long nanos) {
        return (nanos + TimeUnit.SECONDS.toNanos(1) - 1) / TimeUnit.SECONDS.toNanos(1);
    }

    /** Whether the request may pass, how many remain in the window, and seconds until it resets. */
    public record Decision(boolean allowed, long remaining, long resetSeconds) {
    }
}
