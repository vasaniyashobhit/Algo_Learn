package com.algolearn.recommendations.calc;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.dto.ProblemSummary;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy rankByFailed.test.js. */
class RankByFailedTest {

    private static final List<FailedProblem> FAILED = List.of(new FailedProblem("9/A", List.of("dp", "greedy")),
            new FailedProblem("8/A", List.of("graphs")));

    private static ProblemSummary p(String id, Integer rating, String... tags) {
        return new ProblemSummary(id, Integer.parseInt(id.split("/")[0]), "A", "T", rating, List.of(tags), false,
                "hf", null);
    }

    @Test
    void maxJaccardIsTheBestJaccardAgainstAnyFailedProblem() {
        assertThat(RankByFailed.maxJaccard(List.of("dp"), FAILED)).isEqualTo(0.5);
        assertThat(RankByFailed.maxJaccard(List.of("graphs"), FAILED)).isEqualTo(1);
        assertThat(RankByFailed.maxJaccard(List.of("dp"), List.of())).isZero();
    }

    @Test
    void sortsBySimilarityDescThenRatingAscUnratedLastThenId() {
        var ranked = RankByFailed.rank(List.of(p("1/A", 1500, "math"), p("2/A", 1700, "graphs"),
                p("3/A", null, "math"), p("4/A", 1400, "math"), p("0/A", 1500, "math"), p("5/A", 1600)), FAILED);
        assertThat(ranked).extracting(r -> r.problem().id())
                .containsExactly("2/A", "4/A", "0/A", "1/A", "5/A", "3/A");
        assertThat(ranked.getFirst().similarityToFailed()).isEqualTo(1);
    }

    @Test
    void roundsTheSimilarityTo4Decimals() {
        var ranked = RankByFailed.rank(List.of(p("1/A", 1, "dp")),
                List.of(new FailedProblem("9/A", List.of("dp", "greedy", "math"))));
        assertThat(ranked.getFirst().similarityToFailed()).isEqualTo(0.3333);
    }
}
