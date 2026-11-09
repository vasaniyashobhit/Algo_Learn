package com.algolearn.recommendations.calc;

import static com.algolearn.recommendations.calc.Picks.freq;
import static com.algolearn.recommendations.calc.Picks.stat;
import static com.algolearn.recommendations.calc.Picks.topics;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Legacy pickNextTopics.zone.test.js. */
class PickNextTopicsZoneTest {

    @Test
    void needsAtLeast3AttemptedProblems() {
        assertThat(PickNextTopics.inLearningZone(2, 0.5)).isFalse();
        assertThat(PickNextTopics.inLearningZone(3, 0.5)).isTrue();
    }

    @Test
    void includesBothStrengthBoundsAndNothingOutside() {
        assertThat(PickNextTopics.inLearningZone(5, 0.2)).isTrue();
        assertThat(PickNextTopics.inLearningZone(5, 0.75)).isTrue();
        assertThat(PickNextTopics.inLearningZone(5, 0.199)).isFalse();
        assertThat(PickNextTopics.inLearningZone(5, 0.751)).isFalse();
    }

    @Test
    void priorityIsOneMinusStrengthTimesLogOnePlusShare() {
        assertThat(PickNextTopics.priority(0.4, 0.5)).isCloseTo(0.6 * Math.log(1.5), within(1e-9));
        assertThat(PickNextTopics.priority(0.4, 0)).isZero();
    }

    @Test
    void ranksZoneTopicsByPriorityAndSkipsWeakMasteredAndBarelyTriedOnes() {
        var stats = List.of(stat("dp", 11, 0.4), stat("greedy", 6, 0.6), stat("math", 8, 0.3),
                stat("graphs", 10, 0.1), stat("trees", 2, 0.5), stat("strings", 9, 0.9));
        var picks = PickNextTopics.pick(stats,
                freq(Map.of("dp", 0.4, "greedy", 0.4, "math", 0.1, "graphs", 0.5, "trees", 0.3), 1500), 3, true);
        assertThat(topics(picks)).containsExactly("dp", "greedy", "math");
        var dp = picks.getFirst();
        assertThat(dp.basis()).isEqualTo("learning_zone");
        assertThat(dp.strength()).isEqualTo(0.4);
        assertThat(dp.attempted()).isEqualTo(11);
        assertThat(dp.comfortRating()).isEqualTo(1400);
        assertThat(dp.frequency()).isEqualTo(0.4);
        assertThat(dp.priority()).isEqualTo(Math.round(0.6 * Math.log(1.4) * 10_000) / 10_000.0);
    }

    @Test
    void breaksPriorityTiesByLowerStrengthThenName() {
        var tie = freq(Map.of("dp", 0.2, "greedy", 0.2, "math", 0.2), 1500);
        var picks = PickNextTopics.pick(List.of(stat("math", 5, 0.5), stat("greedy", 5, 0.4), stat("dp", 5, 0.5)),
                tie, 2, true);
        assertThat(topics(picks)).containsExactly("greedy", "dp");
    }

    @Test
    void buildsTheReasonFromTheStatAndTheShare() {
        var picks = PickNextTopics.pick(List.of(stat("dp", "single", 11, 4, 0.4, 1400)),
                freq(Map.of("dp", 0.22), 1500), 1, true);
        assertThat(picks.getFirst().reason())
                .isEqualTo("You've solved 4 of 11 dp problems; dp shows up in 22% of problems at your level");
    }

    @Test
    void ignoresPairStatsAndUnknownKeys() {
        var stats = List.of(stat("dp+greedy", "pair", 9, 5, 0.5, null), stat("*special", 9, 0.5), stat("dp", 9, 0.5));
        assertThat(topics(PickNextTopics.pick(stats, freq(Map.of("dp", 0.3), 1500), 1, true))).containsExactly("dp");
    }
}
