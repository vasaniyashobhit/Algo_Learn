package com.algolearn.stats.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/** {@code meta} of GET /users/me/stats/summary; {@code reason} only when the data is empty on purpose. */
public record SummaryMeta(String cfHandle, Integer cfRating, String lastSyncedAt,
        @JsonInclude(JsonInclude.Include.NON_NULL) String reason) {
}
