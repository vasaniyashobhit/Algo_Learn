package com.algolearn.stuck;

import static com.algolearn.stuck.ServiceHarness.USER_ID;
import static com.algolearn.stuck.StuckFixtures.dbProblem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ValidationException;
import com.algolearn.llm.CoachResult;
import com.algolearn.llm.FallbackReason;
import com.algolearn.stuck.gap.Gap;
import com.algolearn.stuck.gap.GapAnalysis.TopicStatRow;
import com.algolearn.stuck.input.ResolvedInput;
import com.algolearn.stuck.input.StuckInput;
import com.algolearn.stuck.result.ProblemInfo;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy stuck.service.fallback.test.js: never blank. */
class StuckServiceFallbackTest {

    private static final String GYM = "https://codeforces.com/gym/104114/problem/B";

    @Test
    void buildsHintsFromTheGapAndTheEditorialWhenTheAiIsUnavailable() {
        var h = new ServiceHarness(new ResolvedInput(null, "1/A", "u", null),
                List.of(dbProblem("1/A", "Theatre Square", "d", 1000, List.of("math", "bitmasks"))), List.of(),
                List.of(new TopicStatRow("bitmasks", "single", 0.25, 3)), 1200, List.of());
        h.coach = CoachResult.fallback(FallbackReason.AI_TIMEOUT);
        var result = h.service().solve(USER_ID, new StuckInput("url", null, "u", null)).result();
        assertThat(result.source()).isEqualTo("fallback");
        assertThat(result.notice()).isEqualTo(StuckConstants.FALLBACK_NOTICE);
        assertThat(result.fallbackReason()).isEqualTo("AI_TIMEOUT");
        assertThat(result.hasSolution()).isFalse();
        assertThat(result.editorialAvailable()).isTrue();
        assertThat(result.hints()).containsExactly("This problem most likely uses math, bitmasks.",
                "Review bitmasks first. Your bitmasks strength is low (0.25).", "From the editorial: Ceil both sides.");
        assertThat(result.gap().message())
                .isEqualTo("This problem needs bitmasks + math. Your bitmasks strength is low (0.25).");
        assertThat(result.similar().items()).hasSize(1);
        assertThat(h.saved.getValue().source()).isEqualTo("fallback");
        assertThat(h.saved.getValue().solution()).isNull();
    }

    @Test
    void stillAnswersForAGymLinkWeDoNotHave() {
        var h = new ServiceHarness(new ResolvedInput(null, "104114/B", GYM, null), List.of(), List.of(), List.of(),
                null, List.of());
        h.coach = CoachResult.fallback(FallbackReason.NO_INPUT);
        var result = h.service().solve(USER_ID, new StuckInput("url", null, GYM, null)).result();
        var request = h.coachCalls.getFirst();
        assertThat(request.problemId()).isEqualTo("104114/B");
        assertThat(request.text()).isEmpty();
        assertThat(request.knownTags()).isEmpty();
        verify(h.repo, never()).searchProblems(anyString(), anyInt());
        verify(h.repo, never()).topicStats(any(), any());
        assertThat(result.problem()).isEqualTo(new ProblemInfo(null, "104114/B", null, List.of(), null, null));
        assertThat(result.gap()).isEqualTo(new Gap("We could not detect the topics of this problem.", List.of(),
                List.of()));
        assertThat(result.hints()).singleElement().asString().contains("constraints");
        var similar = h.similarCalls.getValue();
        assertThat(similar.tags()).isEmpty();
        assertThat(similar.rating()).isNull();
        assertThat(similar.userRating()).isNull();
        assertThat(similar.excludeIds()).isEmpty();
        assertThat(h.saved.getValue().tagsSource()).isNull();
    }

    @Test
    void letsInputErrorsPropagateAndSavesNothing() {
        var h = new ServiceHarness(null);
        when(h.resolver.resolve(any(), any())).thenThrow(new ValidationException(ErrorCode.PROBLEM_TEXT_TOO_SHORT,
                "short"));
        var error = catchThrowableOfType(ValidationException.class,
                () -> h.service().solve(USER_ID, new StuckInput("text", "x", null, null)));
        assertThat(error.code()).isEqualTo(ErrorCode.PROBLEM_TEXT_TOO_SHORT);
        verify(h.store, never()).save(any());
    }
}
