package com.algolearn.recommendations.calc;

import static com.algolearn.recommendations.RecommendationConstants.DEFAULT_RATING;
import static com.algolearn.recommendations.RecommendationConstants.TARGET_HIGH;
import static com.algolearn.recommendations.RecommendationConstants.TARGET_LOW;
import static com.algolearn.recommendations.RecommendationConstants.TARGET_ROUNDING;

/** Legacy targetRange.js: [comfort + 100, comfort + 300], each bound rounded to the nearest 100. */
public record TargetRange(int min, int max) {

    public static TargetRange of(int comfortRating) {
        return new TargetRange(roundTo(comfortRating + TARGET_LOW), roundTo(comfortRating + TARGET_HIGH));
    }

    /** The rating a topic's range starts from: topic comfort → user rating → 1200. */
    public static int baseRating(Integer comfortRating, Integer userRating) {
        if (comfortRating != null) {
            return comfortRating;
        }
        return userRating != null ? userRating : DEFAULT_RATING;
    }

    private static int roundTo(int value) {
        return (int) Math.round((double) value / TARGET_ROUNDING) * TARGET_ROUNDING;
    }
}
