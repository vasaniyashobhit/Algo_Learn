package com.algolearn.stats.calc;

import static com.algolearn.stats.StatsConstants.BAND_SIZE;
import static com.algolearn.stats.StatsConstants.MAX_BAND_RATING;
import static com.algolearn.stats.StatsConstants.MIN_BAND_RATING;

import java.util.LinkedHashMap;
import java.util.List;

/** Solved problems per rating band (legacy solvedByRating). */
public final class RatingBands {

    private RatingBands() {
    }

    /**
     * Every band is listed (zeros included) so a chart is never empty; ratings outside the range fall
     * into the first/last band, unrated ones into {@code unrated}.
     */
    public static SolvedByRating solvedByRating(List<ProblemAttempt> problems) {
        var counts = new LinkedHashMap<Integer, Integer>();
        for (var from = MIN_BAND_RATING; from <= MAX_BAND_RATING; from += BAND_SIZE) {
            counts.put(from, 0);
        }
        var unrated = 0;
        for (var problem : problems) {
            if (!problem.solved()) {
                continue;
            }
            if (problem.rating() == null) {
                unrated += 1;
            } else {
                counts.merge(bandOf(problem.rating()), 1, Integer::sum);
            }
        }
        var bands = counts.entrySet().stream()
                .map(e -> new Band(e.getKey(), e.getKey() + BAND_SIZE - 1, e.getValue())).toList();
        return new SolvedByRating(bands, unrated);
    }

    static int bandOf(int rating) {
        var start = MIN_BAND_RATING + Math.floorDiv(rating - MIN_BAND_RATING, BAND_SIZE) * BAND_SIZE;
        return Math.min(MAX_BAND_RATING, Math.max(MIN_BAND_RATING, start));
    }

    /** All 14 bands plus the solved problems without a rating. */
    public record SolvedByRating(List<Band> bands, int unrated) {

        public SolvedByRating {
            bands = List.copyOf(bands);
        }
    }

    /** Ratings [from, to] and how many problems in them were solved. */
    public record Band(int from, int to, int solved) {
    }
}
