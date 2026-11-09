package com.algolearn.stats.calc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.algolearn.stats.StatsConstants;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/** Legacy sigmoid.test.js, decay.test.js, difficultyWeight.test.js. */
class StrengthMathTest {

    static final Instant NOW = Instant.parse("2026-10-29T12:00:00Z");

    static Instant daysAgo(double days) {
        return NOW.minusMillis((long) (days * StatsConstants.DAY_MS));
    }

    @Test
    void sigmoidIsHalfAtZeroAndSymmetric() {
        assertThat(StrengthMath.sigmoid(0)).isEqualTo(0.5);
        assertThat(StrengthMath.sigmoid(1)).isCloseTo(0.7310586, within(1e-7));
        assertThat(StrengthMath.sigmoid(-1)).isCloseTo(0.2689414, within(1e-7));
        assertThat(StrengthMath.sigmoid(2) + StrengthMath.sigmoid(-2)).isCloseTo(1, within(1e-12));
    }

    @Test
    void sigmoidStaysInsideZeroOne() {
        assertThat(StrengthMath.sigmoid(50)).isLessThanOrEqualTo(1);
        assertThat(StrengthMath.sigmoid(-50)).isGreaterThan(0);
    }

    @Test
    void decayHalvesEvery90Days() {
        assertThat(StrengthMath.decay(NOW, NOW)).isEqualTo(1);
        assertThat(StrengthMath.decay(daysAgo(90), NOW)).isCloseTo(0.5, within(1e-12));
        assertThat(StrengthMath.decay(daysAgo(180), NOW)).isCloseTo(0.25, within(1e-12));
        assertThat(StrengthMath.decay(daysAgo(45), NOW)).isCloseTo(Math.sqrt(0.5), within(1e-12));
    }

    @Test
    void decayTreatsAFutureDateAsToday() {
        var tomorrow = NOW.plusMillis(StatsConstants.DAY_MS);
        assertThat(StrengthMath.decay(tomorrow, NOW)).isEqualTo(1);
        assertThat(StrengthMath.ageDays(tomorrow, NOW)).isZero();
    }

    @Test
    void decayAcceptsAnotherHalfLife() {
        assertThat(StrengthMath.decay(daysAgo(30), NOW, 30)).isCloseTo(0.5, within(1e-12));
    }

    @Test
    void ageIsMeasuredInFractionalDays() {
        assertThat(StatsConstants.DAY_MS).isEqualTo(86_400_000L);
        assertThat(StrengthMath.ageDays(daysAgo(1.5), NOW)).isCloseTo(1.5, within(1e-12));
    }

    @Test
    void difficultyWeightIsSigmoidOfTheRatingGapOver300() {
        assertThat(StrengthMath.difficultyWeight(1200, 1200)).isEqualTo(0.5);
        assertThat(StrengthMath.difficultyWeight(1500, 1200)).isCloseTo(0.7310586, within(1e-7));
        assertThat(StrengthMath.difficultyWeight(900, 1200)).isCloseTo(0.2689414, within(1e-7));
        assertThat(StrengthMath.difficultyWeight(1800, 1200)).isCloseTo(0.8807971, within(1e-7));
    }

    @Test
    void difficultyWeightIsHalfWhenEitherRatingIsUnknown() {
        assertThat(StrengthMath.difficultyWeight(null, 1200)).isEqualTo(0.5);
        assertThat(StrengthMath.difficultyWeight(1500, null)).isEqualTo(0.5);
        assertThat(StrengthMath.difficultyWeight(null, null)).isEqualTo(0.5);
    }

    @Test
    void difficultyWeightAcceptsAnotherScale() {
        assertThat(StrengthMath.difficultyWeight(1300, 1200, 100)).isCloseTo(0.7310586, within(1e-7));
    }
}
