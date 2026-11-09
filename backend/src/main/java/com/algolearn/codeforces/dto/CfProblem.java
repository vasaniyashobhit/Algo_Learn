package com.algolearn.codeforces.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/** A Codeforces API Problem object (no statement text; rating and tags may be missing). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CfProblem(Integer contestId, String index, String name, String type, Integer rating,
        List<String> tags) {
}
