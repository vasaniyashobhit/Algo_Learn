package com.algolearn.stuck;

import static com.algolearn.stuck.ServiceHarness.USER_ID;
import static com.algolearn.stuck.StuckFixtures.dbProblem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.algolearn.stuck.gap.GapAnalysis.TopicStatRow;
import com.algolearn.stuck.input.ResolvedInput;
import com.algolearn.stuck.input.StuckInput;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy stuck.service tests: the similar-problems window and the coach cut-off. */
class StuckServiceSimilarTest {

    private static final String URL = "https://codeforces.com/contest/1/problem/A";
    private static final StuckInput URL_INPUT = new StuckInput("url", null, URL, null);

    @Test
    void excludesProblemsTheUserAlreadySolvedFromTheSimilarList() {
        var h = new ServiceHarness(new ResolvedInput(null, "1/A", URL, null), List.of(dbProblem()), List.of(),
                List.of(new TopicStatRow("math", "single", 0.9, 4)), 1200, List.of("4/A", "5/B"));
        var result = h.service().solve(USER_ID, URL_INPUT);
        assertThat(h.similarCalls.getValue().excludeIds()).containsExactly("1/A", "4/A", "5/B");
        assertThat(h.similarCalls.getValue().rating()).isEqualTo(1000);
        assertThat(result.result().similar().easier()).isFalse();
        verify(h.store).save(any());
    }

    @Test
    void targetsBelowTheUserRatingOnGapTopicsWhenTheProblemRatingIsUnknown() {
        var text = "Some long statement about subsequences and their sums, with n up to 2e5.";
        var h = new ServiceHarness(new ResolvedInput(text, null, text, null), List.of(),
                List.of(dbProblem("3/C", "N", "", null, List.of("dp"))), List.of(), 1500, List.of());
        h.service().solve(USER_ID, new StuckInput("text", text, null, null));
        assertThat(h.similarCalls.getValue().tags()).containsExactly("dp");
        assertThat(h.similarCalls.getValue().rating()).isEqualTo(1350);
        assertThat(h.similarCalls.getValue().userRating()).isEqualTo(1500);
    }

    @Test
    void skipsTheCoachWhenLessThan10SecondsAreLeft() {
        var h = new ServiceHarness(new ResolvedInput("text long enough", null, "t", null));
        when(h.resolver.resolve(any(), any())).thenAnswer(call -> {
            h.clock.advance(Duration.ofSeconds(41));
            return new ResolvedInput("text long enough", null, "t", null);
        });
        var result = h.service().solve(USER_ID, new StuckInput("text", "t", null, null)).result();
        assertThat(h.coachCalls).isEmpty();
        assertThat(result.fallbackReason()).isEqualTo("AI_TIMEOUT");
    }
}
