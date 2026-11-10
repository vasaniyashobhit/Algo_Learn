package com.algolearn.stuck.result;

import com.algolearn.stuck.gap.Gap;
import java.util.List;

/**
 * The public stuck result (stored as {@code stuck_queries.result}), in the legacy key order. Never the solution:
 * hints and gap first, the solution only on request.
 */
public record StuckResult(
        String source,
        String provider,
        String model,
        String notice,
        String fallbackReason,
        ProblemInfo problem,
        List<String> hints,
        boolean hasSolution,
        boolean editorialAvailable,
        Gap gap,
        SimilarBlock similar) {

    public StuckResult {
        hints = List.copyOf(hints);
    }
}
