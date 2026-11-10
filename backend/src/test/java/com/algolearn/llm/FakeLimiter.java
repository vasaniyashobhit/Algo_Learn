package com.algolearn.llm;

import com.algolearn.llm.chain.LlmException;
import com.algolearn.llm.chain.TimeLimiter;
import com.algolearn.support.MutableClock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

/**
 * Runs calls inline and records each limit. A hanging call ({@link Hang}) moves the clock forward by the limit
 * and times out, so deadline tests need no real waiting.
 */
public final class FakeLimiter implements TimeLimiter {

    private final MutableClock clock;
    public final List<Long> limits = new ArrayList<>();

    public FakeLimiter(MutableClock clock) {
        this.clock = clock;
    }

    @Override
    public <T> T call(long limitMs, Supplier<T> task) {
        limits.add(limitMs);
        try {
            return task.get();
        } catch (Hang e) {
            clock.advance(Duration.ofMillis(limitMs));
            throw LlmException.timeout(limitMs);
        }
    }

    /** Thrown by a fake call that would never finish. */
    public static final class Hang extends RuntimeException {
        public Hang() {
            super("hang");
        }
    }
}
