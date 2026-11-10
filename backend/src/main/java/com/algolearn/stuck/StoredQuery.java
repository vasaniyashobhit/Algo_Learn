package com.algolearn.stuck;

import com.algolearn.stuck.result.StuckResult;
import com.algolearn.stuck.result.StuckSolution;
import java.time.Instant;
import java.util.List;

/** A {@code stuck_queries} row as read back (never the raw input). {@code result}/{@code solution} may be null. */
public record StoredQuery(String id, String inputType, Instant createdAt, String source, String matchedProblemId,
        List<String> detectedTags, String tagsSource, Integer estimatedRating, List<GapItem> gap, StuckResult result,
        StuckSolution solution) {
}
