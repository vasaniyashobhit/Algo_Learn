package com.algolearn.recommendations;

import java.time.Duration;

/**
 * Legacy recommendationConstants.js. Learning zone: attempted ≥ MIN_ATTEMPTED and strength in
 * [MIN_STRENGTH, MAX_STRENGTH]; priority = (1 − strength) · ln(1 + frequency), frequency = share of
 * problems within ±FREQUENCY_WINDOW of the user's rating carrying the tag (counts cached for
 * FREQUENCY_CACHE). Problems: rated [comfort + TARGET_LOW, comfort + TARGET_HIGH] rounded to TARGET_ROUNDING.
 */
public final class RecommendationConstants {

    public static final int TOPICS = 3;
    public static final int PROBLEMS_PER_TOPIC = 5;
    public static final int MIN_ATTEMPTED = 3;
    public static final double MIN_STRENGTH = 0.2;
    public static final double MAX_STRENGTH = 0.75;
    public static final int FREQUENCY_WINDOW = 300;
    public static final Duration FREQUENCY_CACHE = Duration.ofHours(1);
    public static final int DEFAULT_RATING = 1200;
    public static final int TARGET_LOW = 100;
    public static final int TARGET_HIGH = 300;
    public static final int TARGET_ROUNDING = 100;
    public static final int RECENT_FAILED = 10;
    /** Extra similar results asked for, since Div1/Div2 copies of solved problems are dropped after. */
    public static final int COPY_SLACK = 5;

    /** A problem with the same title (case-insensitive) within this many contest ids is a Div1/Div2 copy. */
    public static final int COPY_CONTEST_GAP = 2;

    /** {@code basis} of a picked topic. */
    public static final String BASIS_LEARNING_ZONE = "learning_zone";
    public static final String BASIS_FREQUENT = "frequent";

    /** {@code pickedBy} of a recommended problem. */
    public static final String PICKED_TARGET_RANGE = "target_range";
    public static final String PICKED_SIMILAR = "similar_fallback";

    private RecommendationConstants() {
    }

    /** JS {@code Math.round(value * 10_000) / 10_000}. */
    public static double round4(double value) {
        return Math.round(value * 10_000) / 10_000.0;
    }
}
