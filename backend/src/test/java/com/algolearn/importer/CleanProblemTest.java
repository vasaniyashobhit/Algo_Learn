package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Ports legacy cleanProblem.test.js (BigInt → Long/BigInteger, as DuckDB returns INT64). */
class CleanProblemTest {

    static DatasetRow row(String description, Object editorial, Object rating, Object tags) {
        return new DatasetRow("1950/F2", "1950", "F2", "  Theatre Square ", description, " n m ", "One number", null,
                editorial, rating, tags);
    }

    static DatasetRow row() {
        return row("  Given n and m.  ", null, 1000L, List.of("math", "dp"));
    }

    @Test
    void cleanTextTrimsStringsAndTurnsNonStringsIntoEmptyStrings() {
        assertThat(CleanProblem.cleanText("  a b  ")).isEqualTo("a b");
        assertThat(Arrays.asList(null, 5).stream().map(CleanProblem::cleanText)).containsOnly("");
    }

    @Test
    void toIntOrNullConvertsLongsNumbersAndNumericStringsAndKeepsMissingAsNull() {
        assertThat(CleanProblem.toIntOrNull(3500L)).isEqualTo(3500);
        assertThat(CleanProblem.toIntOrNull(BigInteger.valueOf(42))).isEqualTo(42);
        assertThat(CleanProblem.toIntOrNull("1950")).isEqualTo(1950);
        assertThat(CleanProblem.toIntOrNull(" 7 ")).isEqualTo(7);
        assertThat(CleanProblem.toIntOrNull(800)).isEqualTo(800);
        assertThat(CleanProblem.toIntOrNull(800.0)).isEqualTo(800);
        assertThat(Arrays.asList(null, "", "abc", "1.5", 1.5, Long.MAX_VALUE, true).stream()
                .map(CleanProblem::toIntOrNull)).containsOnlyNulls();
    }

    @Test
    void cleanTagsTrimsDropsEmptiesAndDeduplicatesInOrder() {
        assertThat(CleanProblem.cleanTags(Arrays.asList(" dp", "math", "dp", "", "math", null)))
                .containsExactly("dp", "math");
        assertThat(CleanProblem.cleanTags(null)).isEmpty();
        assertThat(CleanProblem.cleanTags("dp")).isEmpty();
    }

    @Test
    void mapsSnakeCaseToTheDocumentTrimsStringsAndSetsSourceHf() {
        assertThat(CleanProblem.clean(row())).contains(new ProblemDoc("1950/F2", 1950, "F2", "Theatre Square",
                "Given n and m.", "n m", "One number", "", "", 1000, List.of("math", "dp"), 2, false, "hf"));
    }

    @Test
    void skipsEmptyOrWhitespaceOnlyDescriptions() {
        assertThat(CleanProblem.clean(row("", null, 1L, null))).isEmpty();
        assertThat(CleanProblem.clean(row(" \n\t ", null, 1L, null))).isEmpty();
        assertThat(CleanProblem.clean(row(null, null, 1L, null))).isEmpty();
        assertThat(CleanProblem.clean(null)).isEmpty();
    }

    @Test
    void convertsAnInt64RatingAndKeepsANullRatingNull() {
        assertThat(CleanProblem.clean(row("d", null, 3500L, null)).orElseThrow().rating()).isEqualTo(3500);
        assertThat(CleanProblem.clean(row("d", null, null, null)).orElseThrow().rating()).isNull();
    }

    @Test
    void dedupesTagsAndCountsThemAndMissingTagsGiveAnEmptyList() {
        var doc = CleanProblem.clean(row("d", null, 1L, List.of("dp", "dp", "greedy"))).orElseThrow();
        assertThat(doc.tags()).containsExactly("dp", "greedy");
        assertThat(doc.tagCount()).isEqualTo(2);
        var none = CleanProblem.clean(row("d", null, 1L, null)).orElseThrow();
        assertThat(none.tags()).isEmpty();
        assertThat(none.tagCount()).isZero();
    }

    @Test
    void setsHasEditorialOnlyForANonBlankEditorial() {
        var doc = CleanProblem.clean(row("d", " Use prefix sums ", 1L, null)).orElseThrow();
        assertThat(doc.editorial()).isEqualTo("Use prefix sums");
        assertThat(doc.hasEditorial()).isTrue();
        assertThat(CleanProblem.clean(row("d", "   ", 1L, null)).orElseThrow().hasEditorial()).isFalse();
    }

    @Test
    void keepsTheSpecialTagAndFlagsItWithHasSpecialTag() {
        var doc = CleanProblem.clean(row("d", null, 1L, List.of("*special", "math"))).orElseThrow();
        assertThat(doc.tags()).containsExactly("*special", "math");
        assertThat(CleanProblem.hasSpecialTag(doc)).isTrue();
        assertThat(CleanProblem.hasSpecialTag(CleanProblem.clean(row()).orElseThrow())).isFalse();
    }
}
