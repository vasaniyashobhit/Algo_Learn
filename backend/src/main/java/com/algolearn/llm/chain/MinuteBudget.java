package com.algolearn.llm.chain;

import com.algolearn.llm.LlmConstants;
import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.function.ToIntFunction;

/**
 * In-memory sliding-window budget: at most {@code limitFor(key)} takes per {@code windowMs} per key.
 * {@link #tryTake} returns false (and records nothing) once the window is full. Thread-safe.
 */
public class MinuteBudget {

    public static final long WINDOW_MS = 60_000;

    private final ToIntFunction<String> limitFor;
    private final long windowMs;
    private final Clock clock;
    private final Map<String, Deque<Long>> calls = new HashMap<>();

    public MinuteBudget(ToIntFunction<String> limitFor, long windowMs, Clock clock) {
        this.limitFor = limitFor;
        this.windowMs = windowMs;
        this.clock = clock;
    }

    /** Limits by provider name ({@code name:model} keys), a default for unknown names (legacy createLlmBudget). */
    public static MinuteBudget forProviders(Map<String, Integer> limits, Clock clock) {
        return new MinuteBudget(key -> limits.getOrDefault(key.split(":", 2)[0],
                LlmConstants.DEFAULT_BUDGET_PER_MINUTE), WINDOW_MS, clock);
    }

    public static MinuteBudget defaults(Clock clock) {
        return forProviders(LlmConstants.BUDGET_PER_MINUTE, clock);
    }

    public synchronized boolean tryTake(String key) {
        var at = clock.millis();
        var kept = recent(key, at);
        if (kept.size() >= limitFor.applyAsInt(key)) {
            return false;
        }
        kept.addLast(at);
        return true;
    }

    public synchronized int remaining(String key) {
        return Math.max(0, limitFor.applyAsInt(key) - recent(key, clock.millis()).size());
    }

    private Deque<Long> recent(String key, long at) {
        var kept = calls.computeIfAbsent(key, k -> new ArrayDeque<>());
        while (!kept.isEmpty() && at - kept.peekFirst() >= windowMs) {
            kept.removeFirst();
        }
        return kept;
    }
}
