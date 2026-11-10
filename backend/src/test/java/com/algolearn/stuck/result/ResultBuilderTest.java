package com.algolearn.stuck.result;

import static com.algolearn.stuck.StuckFixtures.coachAnswer;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.CachedAnswer;
import com.algolearn.llm.CoachResult;
import com.algolearn.llm.FallbackReason;
import com.algolearn.problems.similar.Strategy;
import com.algolearn.stuck.StuckConstants;
import com.algolearn.stuck.gap.Gap;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy buildResult.test.js. */
class ResultBuilderTest {

    private final ProblemInfo problem = new ProblemInfo("1/A", null, "T", List.of("math"), "db", 1000);
    private final Gap gap = new Gap("m", List.of(), List.of());
    private final SimilarBlock similar = new SimilarBlock(List.of(), false, 1000, List.of(Strategy.PRIMARY));

    @Test
    void usesTheAiHintsAndHasNoNoticeForAnAiAnswer() {
        var coach = CoachResult.of(CoachResult.AI, new CachedAnswer(coachAnswer(), "groq", "g"));
        assertThat(ResultBuilder.build(coach, problem, "E", gap, similar)).isEqualTo(new StuckResult("ai", "groq", "g",
                null, null, problem, List.of("Each side needs ceil(n / a) stones"), true, true, gap, similar));
    }

    @Test
    void setsTheNoticeAndFallbackHintsForTheFallback() {
        var result = ResultBuilder.build(CoachResult.fallback(FallbackReason.AI_BUSY), problem, "Ceil both sides.",
                gap, similar);
        assertThat(result.source()).isEqualTo("fallback");
        assertThat(result.provider()).isNull();
        assertThat(result.notice()).isEqualTo(StuckConstants.FALLBACK_NOTICE);
        assertThat(result.fallbackReason()).isEqualTo("AI_BUSY");
        assertThat(result.hasSolution()).isFalse();
        assertThat(result.hints()).containsExactly("This problem most likely uses math.",
                "From the editorial: Ceil both sides.");
    }

    @Test
    void fallsBackToGeneratedHintsWhenACachedAnswerHasNoneAndReportsABlankEditorial() {
        var answer = coachAnswer(List.of("math"), 1000, List.of(), "x");
        var result = ResultBuilder.build(CoachResult.of(CoachResult.CACHE, new CachedAnswer(answer, "g", "m")),
                problem, "  ", gap, similar);
        assertThat(result.notice()).isNull();
        assertThat(result.editorialAvailable()).isFalse();
        assertThat(result.hasSolution()).isTrue();
        assertThat(result.hints()).containsExactly("This problem most likely uses math.");
        assertThat(ResultBuilder.build(CoachResult.fallback(null), problem, null, gap, similar).fallbackReason())
                .isNull();
    }

    @Test
    void keepsOnlyTheSolutionFieldsAndIsNullWithoutAnApproach() {
        assertThat(ResultBuilder.solutionOf(coachAnswer())).isEqualTo(new StuckSolution(
                "Multiply ceil(n/a) by ceil(m/a).", List.of("Read input", "Print the product"), "O(1)",
                "#include <cstdio>\nint main() {}", List.of("Use 64-bit integers")));
        assertThat(ResultBuilder.solutionOf(coachAnswer().withCode(null)).code()).isNull();
        assertThat(ResultBuilder.solutionOf(null)).isNull();
        assertThat(ResultBuilder.solutionOf(coachAnswer(List.of(), null, List.of("x"), ""))).isNull();
    }
}
