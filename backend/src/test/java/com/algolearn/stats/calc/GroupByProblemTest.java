package com.algolearn.stats.calc;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy groupByProblem.test.js. */
class GroupByProblemTest {

    static Instant day(int day) {
        return Instant.parse("2026-10-%02dT00:00:00Z".formatted(day));
    }

    static SubmissionRow sub(String problemId, String verdict, int day) {
        return new SubmissionRow(problemId, 1400, List.of("dp"), verdict, day(day));
    }

    static SubmissionRow sub(String problemId, String verdict, int day, Integer rating, List<String> tags) {
        return new SubmissionRow(problemId, rating, tags, verdict, day(day));
    }

    @Test
    void returnsOneEntryPerProblemWithAttemptsSolvedAndTheLastTime() {
        var result = GroupByProblem.group(List.of(sub("1/A", "WRONG_ANSWER", 1), sub("1/A", "OK", 3),
                sub("1/A", "TIME_LIMIT_EXCEEDED", 2), sub("2/B", "WRONG_ANSWER", 5, null, List.of("math"))));
        assertThat(result).containsExactly(
                new ProblemAttempt("1/A", 1400, List.of("dp"), true, 3, day(3)),
                new ProblemAttempt("2/B", null, List.of("math"), false, 1, day(5)));
    }

    @Test
    void staysSolvedAfterALaterFailedSubmission() {
        var result = GroupByProblem.group(List.of(sub("1/A", "OK", 1), sub("1/A", "WRONG_ANSWER", 2)));
        assertThat(result.getFirst().solved()).isTrue();
    }

    @Test
    void takesRatingAndTagsFromTheNewestSubmissionThatHasThem() {
        var problem = GroupByProblem.group(List.of(sub("1/A", "WRONG_ANSWER", 4, null, List.of()),
                sub("1/A", "WRONG_ANSWER", 2, 1600, List.of("greedy")),
                sub("1/A", "WRONG_ANSWER", 3, 1700, List.of("dp", "greedy")))).getFirst();
        assertThat(problem.rating()).isEqualTo(1700);
        assertThat(problem.tags()).containsExactly("dp", "greedy");
        assertThat(problem.lastAt()).isEqualTo(day(4));
    }

    @Test
    void handlesMissingTagsOrRatingAndAnEmptyList() {
        var problem = GroupByProblem.group(List.of(new SubmissionRow("3/C", null, null, "OK", day(1)))).getFirst();
        assertThat(problem.rating()).isNull();
        assertThat(problem.tags()).isEmpty();
        assertThat(problem.solved()).isTrue();
        assertThat(problem.attempts()).isEqualTo(1);
        assertThat(GroupByProblem.group(List.of())).isEmpty();
    }
}
