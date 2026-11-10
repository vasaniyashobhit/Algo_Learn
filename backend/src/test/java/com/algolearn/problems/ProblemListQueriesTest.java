package com.algolearn.problems;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy listQuery.test.js: the filter built from validated values only. */
class ProblemListQueriesTest {

    private static ListQuery query(List<String> tags, boolean matchAll, Integer min, Integer max, String q) {
        return new ListQuery(tags, matchAll, min, max, q, 1, 20);
    }

    @Test
    void isEmptyWithoutFilters() {
        assertThat(ProblemListQueries.where(query(List.of(), false, null, null, null))).isEmpty();
    }

    @Test
    void matchesAnyTagByDefaultAndAllTagsWithMatchAll() {
        assertThat(ProblemListQueries.where(query(List.of("dp", "math"), false, null, null, null)))
                .isEqualTo(" WHERE tags && CAST(:tags AS text[])");
        assertThat(ProblemListQueries.where(query(List.of("dp", "math"), true, null, null, null)))
                .isEqualTo(" WHERE tags @> CAST(:tags AS text[])");
    }

    @Test
    void buildsOpenOrClosedRatingRangesIncludingZero() {
        assertThat(ProblemListQueries.where(query(List.of(), false, 800, null, null)))
                .isEqualTo(" WHERE rating >= :minRating");
        assertThat(ProblemListQueries.where(query(List.of(), false, null, 0, null)))
                .isEqualTo(" WHERE rating <= :maxRating");
        assertThat(ProblemListQueries.where(query(List.of("dp"), false, 800, 1200, "x")))
                .isEqualTo(" WHERE tags && CAST(:tags AS text[]) AND rating >= :minRating AND rating <= :maxRating"
                        + " AND " + TextScore.MATCH);
    }

    @Test
    void textSearchMatchesAnyWordWithoutQuerySyntax() {
        assertThat(ProblemListQueries.anyWord("two arrays")).isEqualTo("two or arrays");
        assertThat(ProblemListQueries.anyWord("  \"tree\"  -dp or  x ")).isEqualTo("tree or dp or x");
        assertThat(ProblemListQueries.anyWord("\" -")).isEmpty();
    }
}
