package com.algolearn.stats.calc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/** Legacy buildTopicStats.test.js. */
class BuildTopicStatsTest {

    static final Instant NOW = Instant.parse("2026-10-29T00:00:00Z");

    static ProblemAttempt problem(List<String> tags, int rating, boolean solved) {
        return new ProblemAttempt(tags + "/" + rating, rating, tags, solved, 1, NOW);
    }

    static Map<String, TopicStatDoc> byKey(List<TopicStatDoc> stats) {
        return stats.stream().collect(Collectors.toMap(TopicStatDoc::topicKey, Function.identity()));
    }

    @Test
    void computesHandCheckedStrengths() {
        var stats = byKey(BuildTopicStats.build(List.of(
                problem(List.of("dp", "greedy"), 1200, true), // solvedScore 1 for dp, greedy
                problem(List.of("dp"), 1500, false)), 1200, NOW)); // failScore 1.5 − sigmoid(1) for dp
        var dp = stats.get("dp");
        assertThat(List.of(dp.attempted(), dp.solved(), dp.failed())).containsExactly(2, 1, 1);
        assertThat(dp.kind()).isEqualTo("single");
        assertThat(dp.strength()).isCloseTo(0.5242254, within(1e-6)); // 2.5 / 4.7689414
        assertThat(stats.get("greedy").strength()).isEqualTo(0.625); // (1 + 1.5) / (1 + 3)
    }

    @Test
    void aTopicWithOneSolveNeverReachesOne() {
        var stat = BuildTopicStats.build(List.of(problem(List.of("dp"), 3500, true)), 800, NOW).getFirst();
        assertThat(stat.strength()).isLessThan(2.0 / 3).isGreaterThan(0.666);
    }

    @Test
    void keepsAPairOnlyWhenAttemptedOnAtLeast2Problems() {
        var once = BuildTopicStats.build(List.of(problem(List.of("dp", "greedy"), 1200, true)), 1200, NOW);
        assertThat(once.stream().map(TopicStatDoc::topicKey)).containsExactly("dp", "greedy");
        var twice = byKey(BuildTopicStats.build(List.of(problem(List.of("dp", "greedy"), 1200, true),
                problem(List.of("greedy", "dp", "math"), 1300, false)), 1200, NOW));
        var pair = twice.get("dp+greedy");
        assertThat(List.of(pair.attempted(), pair.solved(), pair.failed())).containsExactly(2, 1, 1);
        assertThat(pair.kind()).isEqualTo("pair");
        assertThat(twice).doesNotContainKey("dp+math");
        assertThat(twice.get("math").attempted()).isEqualTo(1);
    }

    @Test
    void excludesSpecial() {
        var stats = BuildTopicStats.build(List.of(problem(List.of("*special"), 1500, true),
                problem(List.of("*special", "dp"), 1500, true), problem(List.of("*special", "dp"), 1600, false)),
                1200, NOW);
        assertThat(stats.stream().map(TopicStatDoc::topicKey)).containsExactly("dp");
        assertThat(stats.getFirst().attempted()).isEqualTo(2);
        assertThat(stats.getFirst().solved()).isEqualTo(1);
        assertThat(stats.getFirst().maxSolvedRating()).isEqualTo(1500);
    }

    @Test
    void returnsNothingForNoProblemsOrUntaggedProblems() {
        assertThat(BuildTopicStats.build(List.of(), 1200, NOW)).isEmpty();
        assertThat(BuildTopicStats.build(List.of(problem(List.of(), 1200, true)), 1200, NOW)).isEmpty();
    }
}
