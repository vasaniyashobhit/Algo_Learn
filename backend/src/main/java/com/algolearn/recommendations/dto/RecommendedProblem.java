package com.algolearn.recommendations.dto;

import com.algolearn.problems.dto.ProblemSummary;
import java.util.List;

/** A problem summary (without {@code similarity}) plus its similarity to the recent failures and how it was picked. */
public record RecommendedProblem(String id, int contestId, String index, String title, Integer rating,
        List<String> tags, boolean hasEditorial, String source, double similarityToFailed, String pickedBy) {

    public RecommendedProblem {
        tags = List.copyOf(tags);
    }

    public static RecommendedProblem of(ProblemSummary p, double similarityToFailed, String pickedBy) {
        return new RecommendedProblem(p.id(), p.contestId(), p.index(), p.title(), p.rating(), p.tags(),
                p.hasEditorial(), p.source(), similarityToFailed, pickedBy);
    }
}
