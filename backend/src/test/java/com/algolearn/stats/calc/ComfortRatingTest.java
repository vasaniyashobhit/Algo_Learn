package com.algolearn.stats.calc;

import static com.algolearn.stats.calc.StrengthMathTest.NOW;
import static com.algolearn.stats.calc.StrengthMathTest.daysAgo;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.stats.calc.ComfortRating.Solve;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

/** Legacy comfortRating.test.js. */
class ComfortRatingTest {

    static Solve solve(int rating, double days) {
        return new Solve(rating, daysAgo(days));
    }

    static List<Solve> recent(int... ratings) {
        return IntStream.of(ratings).mapToObj(r -> solve(r, 10)).toList();
    }

    @Test
    void medianTakesTheMiddleValueOrTheMeanOfTheTwoMiddleValues() {
        assertThat(ComfortRating.median(List.of(3, 1, 2))).isEqualTo(2);
        assertThat(ComfortRating.median(List.of(4, 1, 3, 2))).isEqualTo(2.5);
        assertThat(ComfortRating.median(List.of(7))).isEqualTo(7);
    }

    @Test
    void isTheMedianOfTheTop5RecentSolves() {
        assertThat(ComfortRating.of(recent(1200, 1400, 1600, 1800, 2000, 2200), 1500, NOW)).isEqualTo(1800);
    }

    @Test
    void usesAllRecentSolvesWhenThereAre3Or4Rounded() {
        assertThat(ComfortRating.of(recent(1000, 1200, 1300), 900, NOW)).isEqualTo(1200);
        assertThat(ComfortRating.of(recent(1000, 1101, 1200, 1300), 900, NOW)).isEqualTo(1151);
    }

    @Test
    void ignoresSolvesOlderThan365DaysForTheMedian() {
        var solves = List.of(solve(2400, 400), solve(1500, 10), solve(1600, 10));
        assertThat(ComfortRating.of(solves, 1900, NOW)).isEqualTo(1900);
        assertThat(ComfortRating.of(solves, 2600, NOW)).isEqualTo(2400);
    }

    @Test
    void countsASolveExactly365DaysOldAsRecent() {
        var solves = List.of(solve(1000, 365), solve(1100, 10), solve(1200, 10));
        assertThat(ComfortRating.of(solves, 3000, NOW)).isEqualTo(1100);
    }

    @Test
    void fallsBackToWhicheverRatingIsKnown() {
        assertThat(ComfortRating.of(List.of(solve(1700, 10)), null, NOW)).isEqualTo(1700);
        assertThat(ComfortRating.of(List.of(), 1400, NOW)).isEqualTo(1400);
        assertThat(ComfortRating.of(List.of(), null, NOW)).isNull();
    }
}
