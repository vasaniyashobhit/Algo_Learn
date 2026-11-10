package com.algolearn.llm;

import java.util.Map;

/**
 * LLM coach constants (legacy {@code LLM}). The whole chain stops at {@link #DEADLINE_MS}; each call gets at
 * most {@link #TIMEOUT_MS}, clamped to the time left. Only 429/500/502/504 get a retry ({@link #TRIES} 2,
 * constant {@link #BACKOFF_MS}); a timeout or 503 skips the model and opens its circuit for
 * {@link #CIRCUIT_OPEN_MS}. {@link #BUDGET_PER_MINUTE} caps calls per provider model. The rest bounds the answer.
 */
public final class LlmConstants {

    public static final long DEADLINE_MS = 40_000;
    public static final int TRIES = 2;
    public static final long BACKOFF_MS = 1_000;
    public static final long TIMEOUT_MS = 25_000;
    public static final long CIRCUIT_OPEN_MS = 2 * 60_000;
    public static final double TEMPERATURE = 0.2;
    public static final Map<String, Integer> BUDGET_PER_MINUTE = Map.of("gemini", 8, "groq", 25);
    public static final int DEFAULT_BUDGET_PER_MINUTE = 5;
    public static final int MAX_TAGS = 8;
    public static final int MAX_HINTS = 3;
    public static final int MAX_SOLUTION_STEPS = 12;
    public static final int MAX_PITFALLS = 8;
    public static final int MAX_ITEM_LENGTH = 500;
    public static final int MAX_TEXT_LENGTH = 4_000;
    public static final int MAX_CODE_LENGTH = 20_000;
    public static final int RATING_MIN = 800;
    public static final int RATING_MAX = 3500;
    public static final int RATING_STEP = 100;
    /** Longest problem statement sent to a model (legacy STUCK_RAW_INPUT_MAX). */
    public static final int RAW_INPUT_MAX = 20_000;

    private LlmConstants() {
    }
}
