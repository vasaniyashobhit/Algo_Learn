package com.algolearn.config.env;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EnvRulesTest {

    @Test
    void checksPorts() {
        assertThat(EnvRules.isPort("1")).isTrue();
        assertThat(EnvRules.isPort("65535")).isTrue();
        assertThat(EnvRules.isPort("0")).isFalse();
        assertThat(EnvRules.isPort("65536")).isFalse();
        assertThat(EnvRules.isPort("abc")).isFalse();
    }

    @Test
    void acceptsOnlyHttpUrlsWithAHost() {
        assertThat(EnvRules.isHttpUrl("http://localhost:5173")).isTrue();
        assertThat(EnvRules.isHttpUrl("https://algolearn.vercel.app/")).isTrue();
        assertThat(EnvRules.isHttpUrl("ftp://x.test")).isFalse();
        assertThat(EnvRules.isHttpUrl("localhost")).isFalse();
        assertThat(EnvRules.isHttpUrl("http://bad host")).isFalse();
    }

    @Test
    void stripsTrailingSlashes() {
        assertThat(EnvRules.stripTrailingSlashes("https://a.test//")).isEqualTo("https://a.test");
    }

    @Test
    void splitsCommaLists() {
        assertThat(EnvRules.commaList(" a, b ,,c ")).containsExactly("a", "b", "c");
        assertThat(EnvRules.commaList(" , ")).isEmpty();
    }

    @Test
    void validatesFiveFieldCronExpressions() {
        assertThat(EnvRules.isCron("0 */6 * * *")).isTrue();
        assertThat(EnvRules.isCron("0 3 * * 0")).isTrue();
        assertThat(EnvRules.isCron("0 0 */6 * * *")).isFalse();
        assertThat(EnvRules.isCron("61 * * * *")).isFalse();
    }

    @Test
    void checksMinimumLength() {
        assertThat(EnvRules.minLength("abcd", 4)).isTrue();
        assertThat(EnvRules.minLength("abc", 4)).isFalse();
    }
}
