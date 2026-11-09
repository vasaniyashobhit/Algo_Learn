package com.algolearn.stats.calc;

import static com.algolearn.stats.calc.StrengthMathTest.NOW;
import static com.algolearn.stats.calc.StrengthMathTest.daysAgo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy contribution.test.js and strength.test.js. */
class ContributionStrengthTest {

    static ProblemAttempt problem(Integer rating, boolean solved, Instant lastAt) {
        return new ProblemAttempt("1/A", rating, List.of("dp"), solved, 1, lastAt);
    }

    @Test
    void solvedAtTheUserRatingTodayIsOne() {
        assertThat(StrengthMath.contribution(problem(1200, true, NOW), 1200, NOW))
                .isEqualTo(new StrengthMath.Contribution(1, 0));
    }

    @Test
    void aHarderSolveCountsMore() {
        assertThat(StrengthMath.contribution(problem(1500, true, NOW), 1200, NOW).solvedScore())
                .isCloseTo(1.2310586, within(1e-7));
    }

    @Test
    void failingAnEasyProblemHurtsMoreThanFailingAHardOne() {
        var easy = StrengthMath.contribution(problem(900, false, NOW), 1200, NOW);
        var hard = StrengthMath.contribution(problem(1500, false, NOW), 1200, NOW);
        assertThat(easy.solvedScore()).isZero();
        assertThat(easy.failScore()).isCloseTo(1.2310586, within(1e-7));
        assertThat(hard.failScore()).isCloseTo(0.7689414, within(1e-7));
    }

    @Test
    void decaysWithAge() {
        assertThat(StrengthMath.contribution(problem(1200, true, daysAgo(90)), 1200, NOW).solvedScore())
                .isCloseTo(0.5, within(1e-12));
    }

    @Test
    void usesTheNeutralWeightForAnUnratedProblemOrUser() {
        assertThat(StrengthMath.contribution(problem(null, false, NOW), 1200, NOW).failScore()).isEqualTo(1);
        assertThat(StrengthMath.contribution(problem(2000, true, NOW), null, NOW).solvedScore()).isEqualTo(1);
    }

    @Test
    void strengthIsThePriorMeanWithoutData() {
        assertThat(StrengthMath.strength(0, 0)).isEqualTo(0.5);
    }

    @Test
    void oneFreshSolveAtTheUserRatingIs0625() {
        assertThat(StrengthMath.strength(1, 0)).isEqualTo(0.625);
    }

    @Test
    void theBestSingleSolveStaysBelowTwoThirds() {
        assertThat(StrengthMath.strength(1.5, 0)).isCloseTo(2.0 / 3, within(1e-12));
    }

    @Test
    void oneFailureAtTheUserRatingIs0375() {
        assertThat(StrengthMath.strength(0, 1)).isEqualTo(0.375);
    }

    @Test
    void mixesSolvesAndFailures() {
        assertThat(StrengthMath.strength(1, 0.7689414)).isCloseTo(0.5242254, within(1e-6));
    }

    @Test
    void approachesOneOnlyWithManySolves() {
        assertThat(StrengthMath.strength(10, 0)).isCloseTo(11.5 / 13, within(1e-12));
        assertThat(StrengthMath.strength(1000, 0)).isLessThan(1);
    }

    @Test
    void acceptsAnotherPrior() {
        assertThat(StrengthMath.strength(1, 0, 1, 0)).isEqualTo(0.5);
    }
}
