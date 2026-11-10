package com.algolearn.stuck.result;

import java.util.List;

/** The full AI solution, served only by GET /stuck/:id/solution. Any field may be null (e.g. {@code code}). */
public record StuckSolution(String approach, List<String> solutionSteps, String complexity, String code,
        List<String> pitfalls) {
}
