package com.algolearn.recommendations.calc;

import static com.algolearn.recommendations.RecommendationConstants.round4;

import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.problems.similar.SimilarityMath;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;

/** Legacy rankByFailed.js: similarity of candidates to the user's recent failures. */
public final class RankByFailed {

    private RankByFailed() {
    }

    /** Highest topic-tag Jaccard between {@code tags} and any recently failed problem (0 when none). */
    public static double maxJaccard(Collection<String> tags, List<FailedProblem> failed) {
        return failed.stream().mapToDouble(f -> SimilarityMath.jaccard(tags, f.tags())).max().orElse(0);
    }

    /** Sorted by similarityToFailed desc, then rating asc (unrated last), then id. */
    public static List<Ranked> rank(List<ProblemSummary> candidates, List<FailedProblem> failed) {
        return candidates.stream()
                .map(p -> new Ranked(p, round4(maxJaccard(p.tags(), failed))))
                .sorted(Comparator.comparingDouble((Ranked r) -> -r.similarityToFailed())
                        .thenComparingLong(r -> r.problem().rating() == null ? Long.MAX_VALUE : r.problem().rating())
                        .thenComparing(r -> r.problem().id()))
                .toList();
    }

    /** A candidate with its rounded similarity to the failures. */
    public record Ranked(ProblemSummary problem, double similarityToFailed) {
    }
}
