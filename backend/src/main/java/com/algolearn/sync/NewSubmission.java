package com.algolearn.sync;

import java.time.Instant;
import java.util.List;

/** A judged Codeforces submission ready to be stored for a user (legacy toSubmissionDoc). */
public record NewSubmission(long cfSubmissionId, String problemId, int contestId, String index,
        Integer problemRating, List<String> problemTags, String verdict, Instant submittedAt) {

    public NewSubmission {
        problemTags = List.copyOf(problemTags);
    }
}
