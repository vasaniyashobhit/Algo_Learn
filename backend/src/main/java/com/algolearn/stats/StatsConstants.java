package com.algolearn.stats;

import java.util.List;

/**
 * Topic strength and stats view settings (legacy config/statsConstants.js: STATS, STATS_VIEW,
 * STATS_EMPTY_REASONS). Solved: d·(SOLVED_BASE + w), unsolved: d·(FAIL_BASE − w), with
 * d = 0.5^(ageDays / HALF_LIFE_DAYS) and w = sigmoid((problemRating − userRating) / DIFFICULTY_SCALE).
 * strength = (solved + PRIOR·PRIOR_MEAN) / (solved + failed + PRIOR).
 */
public final class StatsConstants {

    public static final double HALF_LIFE_DAYS = 90;
    public static final double DIFFICULTY_SCALE = 300;
    public static final double NEUTRAL_WEIGHT = 0.5;
    public static final double SOLVED_BASE = 0.5;
    public static final double FAIL_BASE = 1.5;
    public static final double PRIOR = 3;
    public static final double PRIOR_MEAN = 0.5;
    public static final int MIN_PAIR_ATTEMPTS = 2;
    public static final int COMFORT_WINDOW_DAYS = 365;
    public static final int COMFORT_TOP_N = 5;
    public static final int COMFORT_MIN_SOLVES = 3;
    public static final int LAST_RESULTS = 5;

    public static final List<String> SORTS = List.of("strength", "attempted");
    public static final List<String> KINDS = List.of("single", "pair");
    public static final int DEFAULT_LIMIT = 50;
    public static final int MAX_LIMIT = 630;
    public static final int TOP_N = 5;
    public static final int MIN_WEAK_ATTEMPTS = 3;
    public static final int ACTIVITY_DAYS = 30;
    public static final int BAND_SIZE = 200;
    public static final int MIN_BAND_RATING = 800;
    public static final int MAX_BAND_RATING = 3400;

    public static final long DAY_MS = 86_400_000L;

    /** {@code meta.reason} when a stats response is empty on purpose (not an error). */
    public static final String REASON_NO_HANDLE = "NO_HANDLE";
    public static final String REASON_NOT_SYNCED = "NOT_SYNCED";

    private StatsConstants() {
    }
}
