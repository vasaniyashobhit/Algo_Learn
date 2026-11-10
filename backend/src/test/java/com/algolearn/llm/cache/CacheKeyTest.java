package com.algolearn.llm.cache;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Ports legacy cacheKey.test.js. */
class CacheKeyTest {

    @Test
    void usesTheProblemIdWhenKnown() {
        assertThat(CacheKey.of("1/A", "whatever")).contains("problem:1/A");
    }

    @Test
    void hashesTheNormalizedTextOtherwise() {
        assertThat(CacheKey.of(null, "  a\r\n\tb  ")).contains("text:" + CacheKey.sha256Hex("a b"));
        assertThat(CacheKey.of(null, "a b")).isEqualTo(CacheKey.of(null, "a\n\n  b\n"));
        assertThat(CacheKey.of(null, "A b")).isNotEqualTo(CacheKey.of(null, "a b"));
        assertThat(CacheKey.of("", "a b")).isEqualTo(CacheKey.of(null, "a b"));
    }

    @Test
    void isEmptyWithoutInput() {
        assertThat(CacheKey.of(null, " \n ")).isEqualTo(Optional.empty());
        assertThat(CacheKey.of(null, null)).isEmpty();
    }

    @Test
    void normalizesUnicodeCompatibilityFormsAndWhitespace() {
        assertThat(CacheKey.normalize("ｎ ≤ 10")).isEqualTo("n ≤ 10");
        assertThat(CacheKey.normalize("a 　b c")).isEqualTo("a b c");
        assertThat(CacheKey.normalize(null)).isEmpty();
    }

    @Test
    void sha256MatchesNodeCrypto() {
        assertThat(CacheKey.sha256Hex("a b"))
                .isEqualTo("c8687a08aa5d6ed2044328fa6a697ab8e96dc34291e8c2034ae8c38e6fcc6d65");
    }
}
