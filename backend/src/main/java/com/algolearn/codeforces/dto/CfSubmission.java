package com.algolearn.codeforces.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** A Codeforces API Submission object; {@code verdict} is null while the submission is in the queue. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CfSubmission(Long id, Integer contestId, Long creationTimeSeconds, CfProblem problem,
        String verdict) {
}
