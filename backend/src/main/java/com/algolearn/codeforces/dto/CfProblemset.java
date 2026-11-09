package com.algolearn.codeforces.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/** The result of problemset.problems. Either list may be null when Codeforces leaves it out. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CfProblemset(List<CfProblem> problems, List<CfProblemStatistics> problemStatistics) {
}
