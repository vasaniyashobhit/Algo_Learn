package com.algolearn.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * The application clock in integration tests. It follows the system clock until a test fixes it
 * ({@link #set}); {@link #advance} moves a fixed clock forward, so tests never sleep. Reset before each test.
 */
public final class MutableClock extends Clock {

    private volatile Instant fixed;

    public void set(Instant instant) {
        fixed = instant;
    }

    public void advance(Duration duration) {
        fixed = instant().plus(duration);
    }

    public void reset() {
        fixed = null;
    }

    @Override
    public Instant instant() {
        var now = fixed;
        return now == null ? Instant.now() : now;
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return this;
    }
}
