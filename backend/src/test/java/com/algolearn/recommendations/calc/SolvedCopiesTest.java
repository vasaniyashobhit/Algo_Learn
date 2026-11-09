package com.algolearn.recommendations.calc;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.recommendations.calc.SolvedCopies.ProblemRef;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy solvedCopies.test.js. */
class SolvedCopiesTest {

    private static ProblemRef p(String id, String title) {
        return new ProblemRef(id, title, Integer.parseInt(id.split("/")[0]));
    }

    @Test
    void normalizeTitleTrimsCollapsesSpacesAndLowerCases() {
        assertThat(SolvedCopies.normalizeTitle("  Two   Arrays ")).isEqualTo("two arrays");
        assertThat(SolvedCopies.normalizeTitle(null)).isEmpty();
    }

    @Test
    void matchesTheSameId() {
        assertThat(SolvedCopies.isSameOrCopy(p("5/A", "X"), p("5/A", "Y"))).isTrue();
    }

    @Test
    void matchesTheSameTitleCaseInsensitiveUpTo2ContestsApart() {
        assertThat(SolvedCopies.isSameOrCopy(p("1900/C", "Game On"), p("1901/A", "game on"))).isTrue();
        assertThat(SolvedCopies.isSameOrCopy(p("1900/C", "Game On"), p("1902/A", "GAME ON"))).isTrue();
        assertThat(SolvedCopies.isSameOrCopy(p("1902/A", "Game On"), p("1900/C", "Game On"))).isTrue();
    }

    @Test
    void doesNotMatch3ContestsApartOtherTitlesOrEmptyTitles() {
        assertThat(SolvedCopies.isSameOrCopy(p("1900/C", "Game On"), p("1903/A", "Game On"))).isFalse();
        assertThat(SolvedCopies.isSameOrCopy(p("1900/C", "Game On"), p("1901/A", "Game Off"))).isFalse();
        assertThat(SolvedCopies.isSameOrCopy(p("1900/C", ""), p("1901/A", ""))).isFalse();
        assertThat(SolvedCopies.isSameOrCopy(p("1900/C", "X"), new ProblemRef("7/A", "x", null))).isFalse();
    }

    private final java.util.function.Predicate<ProblemRef> isSolved = SolvedCopies.matcher(
            List.of(p("1900/C", "Game On"), new ProblemRef("77/B", null, null)));

    @Test
    void matcherMatchesSolvedIdsIncludingOnesWithoutAKnownTitle() {
        assertThat(isSolved.test(p("1900/C", "whatever"))).isTrue();
        assertThat(isSolved.test(p("77/B", "Unknown"))).isTrue();
    }

    @Test
    void matcherMatchesDiv1Div2CopiesOfSolvedProblems() {
        assertThat(isSolved.test(p("1901/A", "GAME ON"))).isTrue();
        assertThat(isSolved.test(p("1898/E", "game on"))).isTrue();
    }

    @Test
    void matcherRejectsUnrelatedProblemsAndFarAwayTitles() {
        assertThat(isSolved.test(p("1901/B", "Other"))).isFalse();
        assertThat(isSolved.test(p("1950/A", "Game On"))).isFalse();
    }

    @Test
    void matcherMatchesNothingForAnEmptyHistory() {
        assertThat(SolvedCopies.matcher(List.of()).test(p("1/A", "A"))).isFalse();
    }
}
