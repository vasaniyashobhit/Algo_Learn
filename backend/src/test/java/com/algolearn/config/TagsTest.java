package com.algolearn.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.ValidationException;
import java.util.HashSet;
import org.junit.jupiter.api.Test;

class TagsTest {

    @Test
    void has37UniqueCodeforcesTagsIncludingSpecial() {
        assertThat(Tags.ALL_TAGS).hasSize(37).doesNotHaveDuplicates().contains(Tags.SPECIAL_TAG);
    }

    @Test
    void has36TopicTagsWithoutSpecial() {
        assertThat(Tags.TOPIC_TAGS).hasSize(36).doesNotContain("*special");
    }

    @Test
    void isImmutable() {
        assertThat(Tags.ALL_TAGS).isUnmodifiable();
        assertThat(Tags.TOPIC_TAGS).isUnmodifiable();
        assertThat(Tags.TOPIC_PAIR_KEYS).isUnmodifiable();
    }

    @Test
    void builds630UniqueSortedPairKeys() {
        assertThat(Tags.TOPIC_PAIR_KEYS).hasSize(630).contains("bitmasks+dp").isSorted();
        assertThat(new HashSet<>(Tags.TOPIC_PAIR_KEYS)).hasSize(630);
    }

    @Test
    void acceptsTopicTagsAndRejectsSpecialUnknownAndNull() {
        assertThat(Tags.isTopicTag("dp")).isTrue();
        assertThat(Tags.isTopicTag("2-sat")).isTrue();
        assertThat(Tags.isTopicTag("*special")).isFalse();
        assertThat(Tags.isTopicTag("DP")).isFalse();
        assertThat(Tags.isTopicTag(null)).isFalse();
    }

    @Test
    void pairKeySortsAlphabeticallyAndJoinsWithPlus() {
        assertThat(Tags.pairKey("dp", "bitmasks")).isEqualTo("bitmasks+dp");
        assertThat(Tags.pairKey("bitmasks", "dp")).isEqualTo("bitmasks+dp");
        assertThat(Tags.pairKey("trees", "2-sat")).isEqualTo("2-sat+trees");
    }

    @Test
    void pairKeyThrowsAValidationErrorForEqualUnknownOrSpecialTags() {
        assertThatThrownBy(() -> Tags.pairKey("dp", "dp")).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> Tags.pairKey("dp", "nope")).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> Tags.pairKey("*special", "dp")).hasMessageContaining("two distinct topic tags");
    }
}
