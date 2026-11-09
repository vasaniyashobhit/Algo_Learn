package com.algolearn.recommendations.calc;

import static com.algolearn.recommendations.calc.Picks.freq;
import static com.algolearn.recommendations.calc.Picks.stat;
import static com.algolearn.recommendations.calc.Picks.topics;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Legacy pickNextTopics.coldStart.test.js. */
class PickNextTopicsColdStartTest {

    @Test
    void withoutStatsPicksTheMostFrequentTagsAtTheRatingTiesByName() {
        var picks = PickNextTopics.pick(List.of(),
                freq(Map.of("math", 0.5, "greedy", 0.3, "dp", 0.3, "graphs", 0.1), 1200), 3, true);
        assertThat(topics(picks)).containsExactly("math", "dp", "greedy");
        assertThat(picks.getFirst()).isEqualTo(new TopicPick("math", "frequent", null, 0, 0, null, 0.5, null,
                "New topic for you: math shows up in 50% of problems at your level"));
    }

    @Test
    void saysRatedAround1200WhenTheUserHasNoRating() {
        var picks = PickNextTopics.pick(null, freq(Map.of("dp", 0.25), 1200), 1, false);
        assertThat(picks.getFirst().reason())
                .isEqualTo("New topic for you: dp shows up in 25% of problems rated around 1200");
    }

    @Test
    void fillsMissingSlotsWithFrequentTopicsSkippingMasteredAndPickedOnes() {
        var stats = List.of(stat("dp", "single", 5, 2, 0.4, null), stat("math", "single", 9, 9, 0.9, null),
                stat("greedy", "single", 1, 1, 0.6, null));
        var picks = PickNextTopics.pick(stats,
                freq(Map.of("math", 0.6, "dp", 0.5, "greedy", 0.4, "graphs", 0.2), 1200), 3, true);
        assertThat(picks).extracting(p -> p.topic() + ":" + p.basis())
                .containsExactly("dp:learning_zone", "greedy:frequent", "graphs:frequent");
        assertThat(picks.get(1).reason())
                .isEqualTo("You've solved 1 of 1 greedy problems; greedy shows up in 40% of problems at your level");
    }

    @Test
    void isNeverEmptyEvenWhenNoProblemIsInRange() {
        var picks = PickNextTopics.pick(List.of(), freq(Map.of(), 1200), 3, true);
        assertThat(picks).hasSize(3).allMatch(p -> p.frequency() == 0);
    }

    @Test
    void returnsExactlyN() {
        assertThat(PickNextTopics.pick(List.of(), freq(Map.of("dp", 0.1), 1200), 5, true)).hasSize(5);
    }
}
