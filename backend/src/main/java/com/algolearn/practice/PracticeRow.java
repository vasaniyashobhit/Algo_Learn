package com.algolearn.practice;

import java.time.Instant;
import java.util.UUID;

/** One practice_items row (never leaves the service layer; see {@link PracticeItemView}). */
public record PracticeRow(UUID id, String problemId, String status, String addedFrom, Instant createdAt,
        Instant updatedAt) {
}
