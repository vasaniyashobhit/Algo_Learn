package com.algolearn.stuck.gap;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.stuck.gap.GapAnalysis.TopicStatRow;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Legacy gapAnalysis.test.js. */
class GapAnalysisTest {

    private static TopicStatRow stat(String key, double strength) {
        return new TopicStatRow(key, key.contains("+") ? "pair" : "single", strength, 4);
    }

    private static List<String> tags(String... tags) {
        return Arrays.asList(tags);
    }

    @ParameterizedTest
    @CsvSource(value = {"null, unseen", "0, weak", "0.39, weak", "0.4, developing", "0.7, developing",
        "0.71, strong", "1, strong"}, nullValues = "null")
    void mapsStrengthToStatus(Double strength, String status) {
        assertThat(GapAnalysis.status(strength)).isEqualTo(status);
    }

    @Test
    void ratesEverySingleAndPairKeyAndSortsTheGapWeakestFirst() {
        var gap = GapAnalysis.analyze(tags("dp", "bitmasks", "*special"),
                List.of(stat("dp", 0.8), stat("bitmasks", 0.3)));
        assertThat(gap.topics().stream().map(t -> t.topicKey() + ":" + t.status()))
                .containsExactly("bitmasks:weak", "bitmasks+dp:unseen", "dp:strong");
        assertThat(gap.items().stream().map(GapTopic::topicKey)).containsExactly("bitmasks", "bitmasks+dp");
        assertThat(gap.items().getFirst()).isEqualTo(new GapTopic("bitmasks", "single", 0.3, "weak", 4,
                "Your bitmasks strength is low (0.30)."));
        assertThat(gap.message()).isEqualTo("This problem needs bitmasks + dp. Your bitmasks strength is low (0.30).");
    }

    @Test
    void ordersWeakBeforeUnseenThenStrengthThenSinglesBeforePairs() {
        var gap = GapAnalysis.analyze(tags("dp", "graphs", "math"), List.of(stat("math", 0.35), stat("dp", 0.1)));
        assertThat(gap.items().stream().map(GapTopic::topicKey))
                .containsExactly("dp", "math", "graphs", "dp+graphs", "dp+math", "graphs+math");
    }

    @Test
    void marksEveryTopicUnseenForAUserWithoutStats() {
        assertThat(GapAnalysis.analyze(tags("greedy"), List.of()).items()).containsExactly(
                new GapTopic("greedy", "single", null, "unseen", 0, "You have not practised greedy yet."));
    }

    @Test
    void saysTheUserLooksReadyWhenThereIsNoGapAndRoundsTo2Decimals() {
        var gap = GapAnalysis.analyze(tags("math"), List.of(stat("math", 0.5555)));
        assertThat(gap.items()).isEmpty();
        assertThat(gap.topics().getFirst().strength()).isEqualTo(0.56);
        assertThat(gap.topics().getFirst().message()).isEqualTo("Your math is developing (0.56).");
        assertThat(gap.message()).isEqualTo("This problem needs math. You look ready for every topic in it.");
    }

    @Test
    void describesStrongTopicsHandlesNoTagsAndLabelsPairs() {
        assertThat(GapAnalysis.analyze(tags("math"), List.of(stat("math", 0.9))).topics().getFirst().message())
                .isEqualTo("You are strong at math (0.90).");
        assertThat(GapAnalysis.analyze(List.of(), List.of()))
                .isEqualTo(new Gap("We could not detect the topics of this problem.", List.of(), List.of()));
        assertThat(GapAnalysis.label("bitmasks+dp")).isEqualTo("bitmasks + dp");
    }

    @Test
    void buildsFallbackHintsFromTopicsWeakestSingleAndEditorial() {
        var weak = new GapTopic("bitmasks", "single", 0.3, "weak", 4, "Your bitmasks strength is low (0.30).");
        var pair = new GapTopic("bitmasks+dp", "pair", null, "unseen", 0, "You have not practised bitmasks + dp yet.");
        assertThat(FallbackHints.of(tags("bitmasks", "dp"), List.of(pair, weak), "Use a mask.\n\nMore."))
                .containsExactly("This problem most likely uses bitmasks, dp.",
                "Review bitmasks first. Your bitmasks strength is low (0.30).", "From the editorial: Use a mask.");
        assertThat(FallbackHints.of(tags("dp"), List.of(pair), null))
                .containsExactly("This problem most likely uses dp.");
        assertThat(FallbackHints.of(List.of(), List.of(), null)).containsExactly(FallbackHints.GENERIC);
    }

    @Test
    void readsTheFirstEditorialParagraphCappedAt500() {
        assertThat(FallbackHints.firstParagraph("\n\n  First idea.\nStill first. \n\nSecond."))
                .isEqualTo("First idea.\nStill first.");
        assertThat(FallbackHints.firstParagraph("x".repeat(600))).hasSize(500).endsWith("…");
        assertThat(FallbackHints.firstParagraph("  ")).isNull();
        assertThat(FallbackHints.firstParagraph(null)).isNull();
    }
}
