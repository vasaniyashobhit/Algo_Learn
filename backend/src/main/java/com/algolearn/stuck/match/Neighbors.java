package com.algolearn.stuck.match;

import com.algolearn.problems.similar.SimilarityMath;
import com.algolearn.stats.calc.ComfortRating;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Legacy neighbors helpers: tags and rating guessed from the nearest stored problems. */
public final class Neighbors {

    private Neighbors() {
    }

    /**
     * Tags shared by at least 2 neighbors (most frequent first, ties alphabetical), else the single most frequent
     * tag; at most {@code max}. Each tag counts once per neighbor; {@code *special} is ignored.
     */
    public static List<String> tags(List<StuckProblem> neighbors, int max) {
        var counts = new LinkedHashMap<String, Integer>();
        neighbors.forEach(n -> SimilarityMath.topicTagsOf(n.tags()).forEach(t -> counts.merge(t, 1, Integer::sum)));
        var ranked = counts.entrySet().stream()
                .sorted(Comparator.<Map.Entry<String, Integer>>comparingInt(Map.Entry::getValue).reversed()
                        .thenComparing(Map.Entry::getKey))
                .toList();
        var shared = ranked.stream().filter(e -> e.getValue() >= 2).toList();
        var picked = shared.isEmpty() ? ranked.stream().limit(1).toList() : shared;
        return picked.stream().limit(max).map(Map.Entry::getKey).toList();
    }

    /** Median rating of the rated neighbors, rounded to 100 (half up); null when none is rated. */
    public static Integer rating(List<StuckProblem> neighbors) {
        var ratings = neighbors.stream().map(StuckProblem::rating).filter(Objects::nonNull).toList();
        return ratings.isEmpty() ? null : (int) Math.round(ComfortRating.median(ratings) / 100) * 100;
    }
}
