package com.algolearn.stuck.result;

import java.util.List;

/**
 * {@code result.problem}: our DB id (or null), the id parsed from a Codeforces link (or null), the title (stored,
 * or the statement's first line), the detected tags with their source (null when none) and the rating.
 */
public record ProblemInfo(String matchedProblemId, String requestedProblemId, String title, List<String> tags,
        String tagsSource, Integer rating) {

    public ProblemInfo {
        tags = tags == null ? List.of() : List.copyOf(tags);
    }
}
