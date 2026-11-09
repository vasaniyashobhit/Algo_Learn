package com.algolearn.stats.calc;

import static com.algolearn.stats.calc.GroupByProblemTest.day;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.stats.LastResult;
import com.algolearn.stats.calc.ComfortRating.Solve;
import com.algolearn.stats.calc.StrengthMath.Contribution;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy topicTotals.test.js. */
class TopicTotalsTest {

    static final Instant NOW = Instant.parse("2026-10-29T00:00:00Z");

    static ProblemAttempt attempt(String id, boolean solved, Integer rating, int day) {
        return new ProblemAttempt(id, rating, List.of("dp"), solved, 1, day(day));
    }

    @Test
    void startsEmpty() {
        var totals = new TopicTotals("dp", "single");
        assertThat(totals.attempted).isZero();
        assertThat(totals.solved).isZero();
        assertThat(totals.solvedScore + totals.failScore).isZero();
        assertThat(totals.solves).isEmpty();
        assertThat(totals.results).isEmpty();
        assertThat(totals.lastActivityAt).isNull();
    }

    @Test
    void addsProblemsAndKeepsTheLatestActivity() {
        var totals = new TopicTotals("dp", "single")
                .add(attempt("1/A", true, 1400, 5), new Contribution(1, 0))
                .add(attempt("2/A", false, 1600, 2), new Contribution(0, 0.5))
                .add(attempt("3/A", true, null, 3), new Contribution(0.75, 0));
        assertThat(totals.attempted).isEqualTo(3);
        assertThat(totals.solved).isEqualTo(2);
        assertThat(totals.solvedScore).isEqualTo(1.75);
        assertThat(totals.failScore).isEqualTo(0.5);
        assertThat(totals.lastActivityAt).isEqualTo(day(5));
        assertThat(totals.solves).containsExactly(new Solve(1400, day(5)));
    }

    @Test
    void buildsTheDocumentFields() {
        var totals = new TopicTotals("dp+math", "pair")
                .add(attempt("1/A", true, 1400, 5), new Contribution(1, 0))
                .add(attempt("2/B", true, 1601, 6), new Contribution(1, 0))
                .add(attempt("3/C", false, 1800, 7), new Contribution(0, 1));
        assertThat(totals.toDoc(1500, NOW)).isEqualTo(new TopicStatDoc("dp+math", "pair", 3, 2, 1, 1501, 1601, 1500,
                3.5 / 6, day(7), List.of(new LastResult("3/C", false), new LastResult("2/B", true),
                        new LastResult("1/A", true))));
    }

    @Test
    void usesNullsWhenNothingRatedWasSolved() {
        var doc = new TopicTotals("dp", "single").add(attempt("1/A", false, 1400, 1), new Contribution(0, 1))
                .toDoc(null, NOW);
        assertThat(doc.avgSolvedRating()).isNull();
        assertThat(doc.maxSolvedRating()).isNull();
        assertThat(doc.comfortRating()).isNull();
        assertThat(doc.strength()).isEqualTo(0.375);
    }

    @Test
    void keepsThe5NewestAttemptsNewestFirstTiesById() {
        var days = new int[] {8, 3, 9, 1, 9, 5, 7};
        var results = new ArrayList<TopicTotals.Result>();
        for (var i = 0; i < days.length; i++) {
            results.add(new TopicTotals.Result(i + "/A", i % 2 == 0, day(days[i])));
        }
        assertThat(TopicTotals.lastResults(results, 5)).containsExactly(new LastResult("2/A", true),
                new LastResult("4/A", true), new LastResult("0/A", true), new LastResult("6/A", true),
                new LastResult("5/A", false));
        assertThat(TopicTotals.lastResults(results, 2)).hasSize(2);
        assertThat(TopicTotals.lastResults(List.of(), 5)).isEmpty();
    }
}
