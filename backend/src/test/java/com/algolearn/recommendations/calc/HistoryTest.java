package com.algolearn.recommendations.calc;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.stats.calc.SubmissionRow;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy history.test.js. */
class HistoryTest {

    private static SubmissionRow sub(String id, String verdict, int day, String... tags) {
        var list = tags.length == 0 ? List.of("dp") : List.of(tags);
        return new SubmissionRow(id, 1500, list, verdict, Instant.parse("2026-01-01T00:00:00Z").plusSeconds(
                (day - 1) * 86_400L));
    }

    @Test
    void splitsSolvedIdsFromNeverSolvedProblemsNewestFailureFirst() {
        var summary = History.summarize(List.of(sub("1/A", "WRONG_ANSWER", 1), sub("1/A", "OK", 2),
                sub("2/A", "WRONG_ANSWER", 3, "math"), sub("3/A", "TIME_LIMIT_EXCEEDED", 5, "graphs"),
                sub("3/A", "WRONG_ANSWER", 6, "graphs", "trees")), 10);
        assertThat(summary.solvedIds()).containsExactly("1/A");
        assertThat(summary.recentFailed()).containsExactly(new FailedProblem("3/A", List.of("graphs", "trees")),
                new FailedProblem("2/A", List.of("math")));
    }

    @Test
    void keepsOnlyTheNMostRecentFailures() {
        var subs = new ArrayList<SubmissionRow>();
        for (var i = 0; i < 12; i++) {
            subs.add(sub((i + 1) + "/A", "WRONG_ANSWER", i + 1));
        }
        var recent = History.summarize(subs, 10).recentFailed();
        assertThat(recent).hasSize(10);
        assertThat(recent.getFirst().problemId()).isEqualTo("12/A");
        assertThat(History.summarize(subs, 2).recentFailed()).extracting(FailedProblem::problemId)
                .containsExactly("12/A", "11/A");
    }

    @Test
    void isEmptyForNoSubmissions() {
        var summary = History.summarize(List.of(), 10);
        assertThat(summary.solvedIds()).isEmpty();
        assertThat(summary.recentFailed()).isEmpty();
    }

    @Test
    void breaksEqualTimesById() {
        var recent = History.summarize(List.of(sub("9/A", "WRONG_ANSWER", 1), sub("10/A", "WRONG_ANSWER", 1)), 10)
                .recentFailed();
        assertThat(recent).extracting(FailedProblem::problemId).containsExactly("10/A", "9/A");
        assertThat(new FailedProblem("1/A", null).tags()).isEmpty();
    }
}
