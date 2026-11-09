package com.algolearn.codeforces.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** A Codeforces API User object (rating and maxRating are null for unrated users). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CfUser(String handle, Integer rating, Integer maxRating) {
}
