package com.algolearn.problems.similar;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * Similar-search meta, legacy key order. {@code ratingWindow} and {@code targetRating} belong to the
 * attempt reported as {@code strategy}; {@code problem} is only present for GET .../similar.
 */
public record SimilarMeta(
        Strategy strategy,
        List<Strategy> strategies,
        int ratingWindow,
        Integer targetRating,
        int count,
        @JsonInclude(JsonInclude.Include.NON_NULL) SourceProblem problem) {

    public SimilarMeta {
        strategies = List.copyOf(strategies);
    }

    public SimilarMeta withProblem(SourceProblem source) {
        return new SimilarMeta(strategy, strategies, ratingWindow, targetRating, count, source);
    }

    /** {@code { id, title, rating, tags }} of the problem the results are similar to. */
    public record SourceProblem(String id, String title, Integer rating, List<String> tags) {

        public SourceProblem {
            tags = List.copyOf(tags);
        }
    }
}
