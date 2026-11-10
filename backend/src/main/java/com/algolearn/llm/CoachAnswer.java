package com.algolearn.llm;

import java.util.List;

/**
 * A schema-valid, sanitized coach answer (field order as legacy). {@code estimatedRating} is null when the
 * model gave no usable number; {@code code} is the trimmed C++17 program ('' when the model sent none).
 */
public record CoachAnswer(
        List<String> tags,
        Integer estimatedRating,
        List<String> hints,
        String approach,
        List<String> solutionSteps,
        String complexity,
        String code,
        List<String> pitfalls) {

    public CoachAnswer {
        tags = List.copyOf(tags);
        hints = List.copyOf(hints);
        solutionSteps = List.copyOf(solutionSteps);
        pitfalls = List.copyOf(pitfalls);
    }
}
