package com.algolearn.stuck;

import com.algolearn.stuck.result.StuckResult;
import com.algolearn.stuck.result.StuckSolution;
import java.util.List;
import java.util.UUID;

/** A stuck query to insert: the public {@code result} and the AI {@code solution} (null without one) kept apart. */
public record NewQuery(UUID userId, String inputType, String rawInput, String matchedProblemId,
        List<String> detectedTags, String tagsSource, Integer estimatedRating, List<GapItem> gap, StuckResult result,
        StuckSolution solution, String source) {

    public NewQuery {
        detectedTags = List.copyOf(detectedTags);
        gap = List.copyOf(gap);
    }
}
