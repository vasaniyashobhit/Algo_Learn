package com.algolearn.recommendations.calc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.algolearn.recommendations.calc.TopicFrequency.TagCount;
import com.algolearn.recommendations.calc.TopicFrequency.TagCountRow;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Legacy topicFrequency.test.js (the aggregation itself is covered by TagCountsCacheIT). */
class TopicFrequencyTest {

    private static final List<TagCountRow> COUNTS = List.of(new TagCountRow(800, 50, Map.of("math", 50L)),
            new TagCountRow(1200, 40, Map.of("dp", 10L, "math", 20L)),
            new TagCountRow(1500, 60, Map.of("dp", 30L, "greedy", 6L)),
            new TagCountRow(1600, 10, Map.of("graphs", 10L)));

    @Test
    void mergesTheCountsIntoOneRowPerRatingSortedTopicTagsOnly() {
        var totals = new LinkedHashMap<Integer, Long>();
        totals.put(1500, 3L);
        totals.put(1200, 2L);
        var rows = TopicFrequency.toTagCounts(totals, List.of(new TagCount(1200, "dp", 2),
                new TagCount(1500, "*special", 1), new TagCount(1500, "math", 3), new TagCount(9999, "dp", 1)));
        assertThat(rows).containsExactly(new TagCountRow(1200, 2, Map.of("dp", 2L)),
                new TagCountRow(1500, 3, Map.of("math", 3L)));
    }

    @Test
    void handlesAnEmptyResult() {
        assertThat(TopicFrequency.toTagCounts(Map.of(), List.of())).isEmpty();
    }

    @Test
    void usesProblemsWithin300OfTheRatingInclusive() {
        var freq = TopicFrequency.atRating(COUNTS, 1300);
        assertThat(freq.rating()).isEqualTo(1300);
        assertThat(freq.total()).isEqualTo(110);
        assertThat(freq.share("dp")).isCloseTo(40 / 110.0, within(1e-12));
        assertThat(freq.share("graphs")).isEqualTo(10 / 110.0);
        assertThat(freq.share("math")).isCloseTo(20 / 110.0, within(1e-12));
    }

    @Test
    void fallsBackTo1200WithoutARating() {
        var freq = TopicFrequency.atRating(COUNTS, null);
        assertThat(freq.rating()).isEqualTo(1200);
        assertThat(freq.total()).isEqualTo(100);
    }

    @Test
    void listsAll36TopicTagsZeroWhenNothingIsInRange() {
        var freq = TopicFrequency.atRating(COUNTS, 3000);
        assertThat(freq.total()).isZero();
        assertThat(freq.frequency()).hasSize(36);
        assertThat(freq.frequency().values()).allMatch(share -> share == 0);
        assertThat(freq.share("not-a-tag")).isZero();
    }

    @Test
    void acceptsACustomWindow() {
        assertThat(TopicFrequency.atRating(COUNTS, 1500, 0).total()).isEqualTo(60);
    }
}
