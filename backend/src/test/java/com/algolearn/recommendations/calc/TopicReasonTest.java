package com.algolearn.recommendations.calc;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Legacy topicReason.test.js. */
class TopicReasonTest {

    @Test
    void formatShareRoundsToAWholePercentUnder1ForRareTags() {
        assertThat(TopicReason.formatShare(0.2249)).isEqualTo("22%");
        assertThat(TopicReason.formatShare(0.004)).isEqualTo("under 1%");
        assertThat(TopicReason.formatShare(0)).isEqualTo("0%");
    }

    @Test
    void usesTheSolvedAttemptedCountsAndTheShareAtTheUserLevel() {
        var stat = Picks.stat("dp", "single", 11, 4, 0.4, null);
        assertThat(TopicReason.of("dp", stat, 0.22, 1500, true))
                .isEqualTo("You've solved 4 of 11 dp problems; dp shows up in 22% of problems at your level");
    }

    @Test
    void namesTheRatingWhenTheUserHasNone() {
        assertThat(TopicReason.of("greedy", null, 0.3, 1200, false))
                .isEqualTo("New topic for you: greedy shows up in 30% of problems rated around 1200");
    }

    @Test
    void treatsAStatWithNoAttemptsAsNew() {
        var stat = Picks.stat("math", "single", 0, 0, 0, null);
        assertThat(TopicReason.of("math", stat, 0.1, 1400, true))
                .isEqualTo("New topic for you: math shows up in 10% of problems at your level");
    }
}
