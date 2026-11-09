package com.algolearn.stats.calc;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.stats.calc.TopicKeys.TopicKey;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy topicKeys.test.js. */
class TopicKeysTest {

    static List<String> keys(List<String> tags) {
        return TopicKeys.forTags(tags).stream().map(TopicKey::topicKey).toList();
    }

    @Test
    void returnsSortedSinglesThenSortedPairs() {
        assertThat(TopicKeys.forTags(List.of("dp", "bitmasks"))).containsExactly(new TopicKey("bitmasks", "single"),
                new TopicKey("dp", "single"), new TopicKey("bitmasks+dp", "pair"));
    }

    @Test
    void buildsEveryPairOfThreeTags() {
        assertThat(keys(List.of("math", "dp", "greedy")))
                .containsExactly("dp", "greedy", "math", "dp+greedy", "dp+math", "greedy+math");
    }

    @Test
    void excludesSpecialAndUnknownTags() {
        assertThat(keys(List.of("*special", "dp"))).containsExactly("dp");
        assertThat(keys(List.of("*special"))).isEmpty();
        assertThat(keys(List.of("dp", "quantum"))).containsExactly("dp");
    }

    @Test
    void removesDuplicateTagsAndHandlesNoTags() {
        assertThat(keys(List.of("dp", "dp"))).containsExactly("dp");
        assertThat(keys(List.of())).isEmpty();
        assertThat(keys(null)).isEmpty();
    }
}
