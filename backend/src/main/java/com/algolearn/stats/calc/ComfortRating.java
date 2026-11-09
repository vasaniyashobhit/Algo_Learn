package com.algolearn.stats.calc;

import static com.algolearn.stats.StatsConstants.COMFORT_MIN_SOLVES;
import static com.algolearn.stats.StatsConstants.COMFORT_TOP_N;
import static com.algolearn.stats.StatsConstants.COMFORT_WINDOW_DAYS;
import static com.algolearn.stats.StatsConstants.DAY_MS;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/** Highest rating the user reliably solves in a topic (legacy comfortRating + median). */
public final class ComfortRating {

    private ComfortRating() {
    }

    /** Median of a non-empty list (mean of the two middle values when the length is even). */
    public static double median(List<Integer> values) {
        var sorted = values.stream().sorted().toList();
        var mid = sorted.size() / 2;
        return sorted.size() % 2 == 1 ? sorted.get(mid) : (sorted.get(mid - 1) + sorted.get(mid)) / 2.0;
    }

    /**
     * ≥ 3 rated solves in the last 365 days → median of the top 5 of them (rounded). Otherwise
     * min(userRating, max solved ever), or whichever of the two is known (null if neither).
     */
    public static Integer of(List<Solve> solves, Integer userRating, Instant now) {
        var cutoff = now.toEpochMilli() - COMFORT_WINDOW_DAYS * DAY_MS;
        var recent = solves.stream().filter(s -> s.at().toEpochMilli() >= cutoff).map(Solve::rating).toList();
        if (recent.size() >= COMFORT_MIN_SOLVES) {
            var top = recent.stream().sorted(Comparator.reverseOrder()).limit(COMFORT_TOP_N).toList();
            return (int) Math.round(median(top));
        }
        var maxSolved = solves.stream().map(Solve::rating).max(Integer::compare);
        if (maxSolved.isEmpty()) {
            return userRating;
        }
        return userRating == null ? maxSolved.get() : Math.min(userRating, maxSolved.get());
    }

    /** A rated solve: the problem rating and when it was solved. */
    public record Solve(int rating, Instant at) {
    }
}
