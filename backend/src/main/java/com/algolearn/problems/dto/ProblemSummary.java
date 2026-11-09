package com.algolearn.problems.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * A problem in lists and similar results: never any statement or editorial text. {@code similarity}
 * is only present in similar results. Same key order as the legacy toProblemSummary.
 */
public record ProblemSummary(
        String id,
        int contestId,
        String index,
        String title,
        Integer rating,
        List<String> tags,
        boolean hasEditorial,
        String source,
        @JsonInclude(JsonInclude.Include.NON_NULL) Similarity similarity) {

    public ProblemSummary {
        tags = List.copyOf(tags);
    }

    /** {@code { score, jaccard, ratingCloseness }}, as computed by the similar-problems query. */
    public record Similarity(double score, double jaccard, double ratingCloseness) {
    }
}
