package com.algolearn.stuck.result;

import com.algolearn.common.validation.JsText;
import com.algolearn.llm.CoachAnswer;
import com.algolearn.llm.CoachResult;
import com.algolearn.stuck.StuckConstants;
import com.algolearn.stuck.gap.FallbackHints;
import com.algolearn.stuck.gap.Gap;
import java.util.List;

/** Legacy buildResult / solutionOf (pure). */
public final class ResultBuilder {

    private ResultBuilder() {
    }

    /** The AI solution kept for GET /stuck/:id/solution; null without an answer that has an approach. */
    public static StuckSolution solutionOf(CoachAnswer answer) {
        if (answer == null || answer.approach() == null || answer.approach().isEmpty()) {
            return null;
        }
        return new StuckSolution(answer.approach(), answer.solutionSteps(), answer.complexity(), answer.code(),
                answer.pitfalls());
    }

    /** On {@code fallback} the notice is set and the hints come from the gap and the editorial. */
    public static StuckResult build(CoachResult coach, ProblemInfo problem, String editorial, Gap gap,
            SimilarBlock similar) {
        var fallback = coach.isFallback();
        var aiHints = coach.answer() == null ? List.<String>of() : coach.answer().hints();
        var hints = aiHints.isEmpty() ? FallbackHints.of(problem.tags(), gap.items(), editorial) : aiHints;
        return new StuckResult(coach.source(), coach.provider(), coach.model(),
                fallback ? StuckConstants.FALLBACK_NOTICE : null,
                fallback && coach.reason() != null ? coach.reason().name() : null,
                problem, hints, solutionOf(coach.answer()) != null,
                editorial != null && !JsText.isBlank(editorial), gap, similar);
    }
}
