package com.algolearn.stats.calc;

import java.time.Instant;
import java.util.List;

/** The submission fields the stats read (problem rating and tags as copied at sync time). */
public record SubmissionRow(String problemId, Integer problemRating, List<String> problemTags, String verdict,
        Instant submittedAt) {

    public SubmissionRow {
        problemTags = problemTags == null ? List.of() : List.copyOf(problemTags);
    }
}
