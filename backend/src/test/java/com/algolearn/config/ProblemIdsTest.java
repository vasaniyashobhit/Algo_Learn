package com.algolearn.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class ProblemIdsTest {

    private static List<String> matching(Pattern pattern, List<String> values) {
        return values.stream().filter(v -> pattern.matcher(v).matches()).toList();
    }

    @Test
    void problemIdPatternAcceptsOneToThreeCharIndexesOnly() {
        var ok = List.of("1/A", "1950/F2", "1723/GP1", "1723/GP2", "921/01", "921/02");
        var bad = List.of("1A", "/A", "1/", "1/ABCD", "1/a", "x/A", "1/A-1");
        assertThat(matching(ProblemIds.PROBLEM_ID_PATTERN, ok)).isEqualTo(ok);
        assertThat(matching(ProblemIds.PROBLEM_ID_PATTERN, bad)).isEmpty();
    }

    @Test
    void indexAndContestPatternsMatchRouteParams() {
        var indexes = List.of("A", "B1", "F2", "GP1", "01");
        assertThat(matching(ProblemIds.PROBLEM_INDEX_PATTERN, indexes)).isEqualTo(indexes);
        assertThat(matching(ProblemIds.PROBLEM_INDEX_PATTERN, List.of("", "a", "ABCD", "A-1"))).isEmpty();
        var contests = List.of("1", "1950", "1000000");
        assertThat(matching(ProblemIds.CONTEST_ID_PATTERN, contests)).isEqualTo(contests);
        assertThat(matching(ProblemIds.CONTEST_ID_PATTERN, List.of("0", "01", "x", "", "12345678"))).isEmpty();
    }
}
