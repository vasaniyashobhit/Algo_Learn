package com.algolearn.problems.similar;

import static com.algolearn.problems.ProblemConstants.DEFAULT_RATING_WINDOW;
import static com.algolearn.problems.ProblemConstants.DEFAULT_TARGET_RATING;
import static com.algolearn.problems.ProblemConstants.UNTAGGED_RATING_BAND;
import static com.algolearn.problems.ProblemConstants.WIDEN_FACTOR;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Ordered search attempts (legacy fallbackPlan.js). The last attempt has no filter at all, so the
 * search only comes back empty when nothing is left.
 */
public final class FallbackPlan {

    private FallbackPlan() {
    }

    /** {@code tags} are topic tags; {@code ratingWindow} null means the default (300). */
    public static List<Attempt> plan(List<String> tags, Integer rating, Integer ratingWindow, Integer userRating) {
        var window = ratingWindow == null ? DEFAULT_RATING_WINDOW : ratingWindow;
        var attempts = new ArrayList<Attempt>();
        if (!tags.isEmpty()) {
            attempts.addAll(tagged(rating, window));
        } else if (rating != null) {
            attempts.add(new Attempt(Strategy.RATING_BAND, false, true, rating, UNTAGGED_RATING_BAND));
        }
        var nearTarget = Stream.of(userRating, rating).filter(Objects::nonNull).findFirst()
                .orElse(DEFAULT_TARGET_RATING);
        attempts.add(new Attempt(Strategy.NEAR_USER_RATING, false, false, nearTarget, window));
        return List.copyOf(attempts);
    }

    private static List<Attempt> tagged(Integer rating, int window) {
        if (rating == null) {
            return List.of(new Attempt(Strategy.PRIMARY, true, false, null, window));
        }
        return List.of(
                new Attempt(Strategy.PRIMARY, true, true, rating, window),
                new Attempt(Strategy.WIDENED_WINDOW, true, true, rating, window * WIDEN_FACTOR),
                new Attempt(Strategy.NO_RATING_FILTER, true, false, rating, window));
    }

    /**
     * One search: match any of the tags ({@code useTags}), keep ratings within {@code target ± window}
     * ({@code filterRating}), rank by closeness to {@code target} (null = no rating to be close to).
     */
    public record Attempt(Strategy strategy, boolean useTags, boolean filterRating, Integer target, int window) {
    }
}
