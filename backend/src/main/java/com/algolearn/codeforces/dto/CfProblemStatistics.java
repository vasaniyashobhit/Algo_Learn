package com.algolearn.codeforces.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** How many users solved a problem (part of problemset.problems). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CfProblemStatistics(Integer contestId, String index, Integer solvedCount) {
}
