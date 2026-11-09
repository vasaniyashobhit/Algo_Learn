package com.algolearn.recommendations.calc;

import java.util.List;

/** A recently attempted, never-solved problem and its tags (legacy recentFailed entry). */
public record FailedProblem(String problemId, List<String> tags) {

    public FailedProblem {
        tags = tags == null ? List.of() : List.copyOf(tags);
    }
}
