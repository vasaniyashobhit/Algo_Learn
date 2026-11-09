package com.algolearn.stats.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/** {@code meta} of GET /users/me/stats; {@code reason} only when the list is empty on purpose. */
public record StatsMeta(String kind, String sort, int limit, long total, String lastSyncedAt,
        @JsonInclude(JsonInclude.Include.NON_NULL) String reason) {
}
