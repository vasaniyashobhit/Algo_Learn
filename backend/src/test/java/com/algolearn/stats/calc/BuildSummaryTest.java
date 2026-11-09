package com.algolearn.stats.calc;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.stats.dto.Summary;
import com.algolearn.stats.dto.TopicStatView;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy buildSummary.test.js. */
class BuildSummaryTest {

    static final Instant NOW = Instant.parse("2026-10-29T10:00:00Z");

    static TopicStatDoc stat(String key, double strength, int attempted, String kind) {
        return new TopicStatDoc(key, kind, attempted, 0, attempted, null, null, null, strength, null, List.of());
    }

    static TopicStatDoc stat(String key, double strength, int attempted) {
        return stat(key, strength, attempted, "single");
    }

    static SubmissionRow sub(String id, String verdict, Integer rating) {
        return new SubmissionRow(id, rating, List.of("dp"), verdict, Instant.parse("2026-10-28T00:00:00Z"));
    }

    static List<String> keys(List<TopicStatView> list) {
        return list.stream().map(TopicStatView::topicKey).toList();
    }

    @Test
    void hasTheFullShapeWithZerosWhenThereIsNoData() {
        var summary = BuildSummary.build(List.of(), List.of(), NOW);
        assertThat(summary.totals()).isEqualTo(new Summary.Totals(0, 0, 0, 0, 0));
        assertThat(summary.strongest()).isEmpty();
        assertThat(summary.weakest()).isEmpty();
        assertThat(summary.solvedByRating().bands()).hasSize(14);
        assertThat(summary.activity()).hasSize(30);
    }

    @Test
    void countsSubmissionsProblemsTopicsAndPairs() {
        var summary = BuildSummary.build(List.of(sub("1/A", "WRONG_ANSWER", 1400), sub("1/A", "OK", 1400),
                sub("2/B", "WRONG_ANSWER", null)),
                List.of(stat("dp", 0.6, 2), stat("math", 0.4, 1), stat("dp+math", 0.5, 2, "pair")), NOW);
        assertThat(summary.totals()).isEqualTo(new Summary.Totals(3, 2, 1, 2, 1));
        assertThat(summary.solvedByRating().bands()).contains(new RatingBands.Band(1400, 1599, 1));
        assertThat(summary.activity().get(28)).isEqualTo(new Activity.Day("2026-10-28", 3, 1));
    }

    @Test
    void ranksTheTop5StrongestAndTheTop5WeakestWithAtLeast3Attempts() {
        var stats = List.of(stat("dp", 0.9, 10), stat("math", 0.8, 1), stat("greedy", 0.8, 5), stat("graphs", 0.2, 2),
                stat("trees", 0.3, 3), stat("strings", 0.35, 4), stat("games", 0.4, 3), stat("dsu", 0.45, 3),
                stat("hashing", 0.5, 3), stat("fft", 0.55, 3), stat("dp+math", 0.99, 9, "pair"));
        var summary = BuildSummary.build(List.of(), stats, NOW);
        assertThat(keys(summary.strongest())).containsExactly("dp", "greedy", "math", "fft", "hashing");
        assertThat(keys(summary.weakest())).containsExactly("trees", "strings", "games", "dsu", "hashing");
        var first = summary.strongest().getFirst();
        assertThat(first.tags()).containsExactly("dp");
        assertThat(first.strength()).isEqualTo(0.9);
        assertThat(first.attempted()).isEqualTo(10);
    }

    @Test
    void breaksStrengthTiesByAttemptsThenByKey() {
        var summary = BuildSummary.build(List.of(), List.of(stat("math", 0.5, 3), stat("dp", 0.5, 3),
                stat("greedy", 0.5, 4)), NOW);
        assertThat(keys(summary.strongest())).containsExactly("greedy", "dp", "math");
        assertThat(keys(summary.weakest())).containsExactly("greedy", "dp", "math");
    }
}
