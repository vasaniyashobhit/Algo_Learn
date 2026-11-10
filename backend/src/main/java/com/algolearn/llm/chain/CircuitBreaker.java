package com.algolearn.llm.chain;

import com.algolearn.llm.LlmConstants;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory circuit breaker: {@link #trip} opens the circuit for {@code openMs}; {@link #isOpen} is true until
 * then. Skips a model that just timed out or answered 503 (one per process).
 */
public class CircuitBreaker {

    private final long openMs;
    private final Clock clock;
    private final Map<String, Long> openUntil = new ConcurrentHashMap<>();

    public CircuitBreaker(long openMs, Clock clock) {
        this.openMs = openMs;
        this.clock = clock;
    }

    /** Open for {@link LlmConstants#CIRCUIT_OPEN_MS} (legacy createLlmBreaker). */
    public static CircuitBreaker defaults(Clock clock) {
        return new CircuitBreaker(LlmConstants.CIRCUIT_OPEN_MS, clock);
    }

    public void trip(String key) {
        openUntil.put(key, clock.millis() + openMs);
    }

    public boolean isOpen(String key) {
        var until = openUntil.get(key);
        if (until == null) {
            return false;
        }
        if (clock.millis() < until) {
            return true;
        }
        openUntil.remove(key, until);
        return false;
    }
}
