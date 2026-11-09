package com.algolearn.problems.similar;

import com.algolearn.config.Tags;
import com.algolearn.problems.ProblemConstants;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * Pure similarity maths (legacy helpers/similarity.js). The SQL in SimilarityQueries computes
 * exactly the same formula; tests check both agree.
 */
public final class SimilarityMath {

    private SimilarityMath() {
    }

    /** Unique topic tags only ({@code *special} and unknown tags dropped), order kept. */
    public static List<String> topicTagsOf(Collection<String> tags) {
        if (tags == null) {
            return List.of();
        }
        var unique = new LinkedHashSet<String>();
        tags.stream().filter(Tags::isTopicTag).forEach(unique::add);
        return List.copyOf(unique);
    }

    /** |A ∩ B| / |A ∪ B| over topic tags; 0 when both are empty. */
    public static double jaccard(Collection<String> a, Collection<String> b) {
        var left = new LinkedHashSet<>(topicTagsOf(a));
        var right = topicTagsOf(b);
        var shared = right.stream().filter(left::contains).count();
        var union = left.size() + right.size() - shared;
        return union == 0 ? 0 : (double) shared / union;
    }

    public static double ratingCloseness(Double a, Double b) {
        return ratingCloseness(a, b, ProblemConstants.DEFAULT_RATING_WINDOW);
    }

    /** 1 when equal, falling linearly to 0 at {@code window} apart; 0 when either rating is missing. */
    public static double ratingCloseness(Double a, Double b, double window) {
        if (!isRating(a) || !isRating(b)) {
            return 0;
        }
        if (!(window > 0)) {
            return a.equals(b) ? 1 : 0;
        }
        return Math.max(0, 1 - Math.abs(a - b) / window);
    }

    /** Weighted blend: 0.75 · jaccard + 0.25 · closeness. */
    public static double score(double jaccard, double closeness) {
        return ProblemConstants.JACCARD_WEIGHT * jaccard + ProblemConstants.RATING_WEIGHT * closeness;
    }

    private static boolean isRating(Double value) {
        return value != null && Double.isFinite(value);
    }
}
