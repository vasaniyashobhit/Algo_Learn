package com.algolearn.recommendations.calc;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Legacy targetRange.test.js. */
class TargetRangeTest {

    @Test
    void isComfortPlus100ToComfortPlus300() {
        assertThat(TargetRange.of(1400)).isEqualTo(new TargetRange(1500, 1700));
    }

    @Test
    void roundsEachBoundToTheNearest100() {
        assertThat(TargetRange.of(1449)).isEqualTo(new TargetRange(1500, 1700));
        assertThat(TargetRange.of(1450)).isEqualTo(new TargetRange(1600, 1800));
        assertThat(TargetRange.of(1320)).isEqualTo(new TargetRange(1400, 1600));
    }

    @Test
    void baseRatingPrefersTheTopicComfortThenTheUserRatingThen1200() {
        assertThat(TargetRange.baseRating(1500, 1700)).isEqualTo(1500);
        assertThat(TargetRange.baseRating(null, 1700)).isEqualTo(1700);
        assertThat(TargetRange.baseRating(null, null)).isEqualTo(1200);
    }
}
