package com.algolearn.problems.similar;

import static com.algolearn.problems.similar.SimilarityMath.jaccard;
import static com.algolearn.problems.similar.SimilarityMath.ratingCloseness;
import static com.algolearn.problems.similar.SimilarityMath.score;
import static com.algolearn.problems.similar.SimilarityMath.topicTagsOf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.algolearn.problems.ProblemConstants;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy similarity.test.js. */
class SimilarityMathTest {

    @Test
    void topicTagsDropSpecialUnknownAndDuplicatesKeepingOrder() {
        assertThat(topicTagsOf(List.of("dp", "*special", "nope", "greedy", "dp"))).containsExactly("dp", "greedy");
        assertThat(topicTagsOf(null)).isEmpty();
    }

    @Test
    void jaccardIsSharedOverUnion() {
        assertThat(jaccard(List.of("dp", "greedy"), List.of("dp", "math"))).isCloseTo(1.0 / 3, within(1e-12));
        assertThat(jaccard(List.of("dp", "greedy"), List.of("greedy", "dp"))).isEqualTo(1);
        assertThat(jaccard(List.of("dp"), List.of("math"))).isZero();
    }

    @Test
    void jaccardIsZeroWhenASideIsEmpty() {
        assertThat(jaccard(List.of(), List.of())).isZero();
        assertThat(jaccard(List.of(), List.of("dp"))).isZero();
        assertThat(jaccard(null, List.of("dp"))).isZero();
    }

    @Test
    void jaccardIgnoresSpecialAndDuplicates() {
        assertThat(jaccard(List.of("*special"), List.of("*special"))).isZero();
        assertThat(jaccard(List.of("dp", "*special"), List.of("dp"))).isEqualTo(1);
        assertThat(jaccard(List.of("dp", "*special"), List.of("dp", "math", "*special"))).isEqualTo(0.5);
        assertThat(jaccard(List.of("dp", "dp"), List.of("dp"))).isEqualTo(1);
    }

    @Test
    void closenessFallsLinearlyAcrossTheWindow() {
        assertThat(ratingCloseness(1500.0, 1500.0, 300)).isEqualTo(1);
        assertThat(ratingCloseness(1500.0, 1650.0, 300)).isEqualTo(0.5);
        assertThat(ratingCloseness(1650.0, 1500.0, 300)).isEqualTo(0.5);
        assertThat(ratingCloseness(1500.0, 1800.0, 300)).isZero();
        assertThat(ratingCloseness(1500.0, 2500.0, 300)).isZero();
        assertThat(ratingCloseness(1000.0, 1000.0 + ProblemConstants.DEFAULT_RATING_WINDOW / 2.0)).isEqualTo(0.5);
    }

    @Test
    void closenessIsZeroWithoutARatingAndExactForAZeroWindow() {
        assertThat(ratingCloseness(null, 1500.0)).isZero();
        assertThat(ratingCloseness(1500.0, null)).isZero();
        assertThat(ratingCloseness(Double.NaN, 1500.0)).isZero();
        assertThat(ratingCloseness(1500.0, 1500.0, 0)).isEqualTo(1);
        assertThat(ratingCloseness(1500.0, 1501.0, 0)).isZero();
    }

    @Test
    void scoreWeightsJaccard075AndCloseness025() {
        assertThat(ProblemConstants.JACCARD_WEIGHT + ProblemConstants.RATING_WEIGHT).isEqualTo(1);
        assertThat(score(1, 1)).isEqualTo(1);
        assertThat(score(1, 0)).isEqualTo(0.75);
        assertThat(score(0, 1)).isEqualTo(0.25);
        assertThat(score(0, 0)).isZero();
    }
}
