package com.algolearn.stuck.match;

import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static com.algolearn.stuck.StuckFixtures.dbProblem;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy problemMatch.test.js and neighbors.test.js. */
class ProblemMatchTest {

    private static final String LONG =
            "Theatre Square in the capital city of Berland has a rectangular shape with the size n × m meters.";

    private static StuckProblem p(String id, String title, String description, Integer rating, String... tags) {
        return dbProblem(id, title, description, rating, List.of(tags));
    }

    @Test
    void readsTheFirstNonEmptyLineAndStripsAnIndexPrefix() {
        assertThat(ProblemMatch.firstLine("\n  \n  A. Title \nrest")).isEqualTo("A. Title");
        assertThat(ProblemMatch.firstLine(null)).isEmpty();
        assertThat(ProblemMatch.stripIndexPrefix("A. Theatre Square")).isEqualTo("Theatre Square");
        assertThat(ProblemMatch.stripIndexPrefix("1950F2 - Hard Version")).isEqualTo("Hard Version");
        assertThat(ProblemMatch.stripIndexPrefix("B1) Easy")).isEqualTo("Easy");
        assertThat(ProblemMatch.stripIndexPrefix("Array Game")).isEqualTo("Array Game");
    }

    @Test
    void buildsATextSearchStringWithoutQuotesOrMinusSigns() {
        assertThat(ProblemMatch.searchQuery("\"exact\" -not  here")).isEqualTo("exact not here");
        assertThat(ProblemMatch.searchQuery("x".repeat(2000))).hasSize(600);
        assertThat(ProblemMatch.searchQuery(null)).isEmpty();
    }

    @Test
    void matchesByTitleIgnoringIndexPrefixCaseAndSpaces() {
        var hit = p("1/A", "Theatre  square", "", 1000);
        assertThat(ProblemMatch.findExactMatch(STATEMENT, List.of(p("2/A", "Other", "", 1000), hit))).contains(hit);
    }

    @Test
    void matchesByTheStartOfALongEnoughDescription() {
        var description = LONG + "\n" + LONG + " Each flagstone is a × a.";
        var hit = p("1/A", "Different name", description, 1000);
        assertThat(ProblemMatch.findExactMatch("Problem\n" + description + "\nInput: n m a", List.of(hit)))
                .contains(hit);
        var tooShort = p("3/A", "X", "n × m meters.", 1000);
        assertThat(ProblemMatch.findExactMatch("Problem\n" + LONG, List.of(tooShort))).isEmpty();
    }

    @Test
    void returnsEmptyWhenNothingMatchesAndBuildsAStatement() {
        assertThat(ProblemMatch.findExactMatch(STATEMENT, List.of(p("9/A", "Watermelon", "", 800)))).isEmpty();
        assertThat(ProblemMatch.findExactMatch("", List.of())).isEmpty();
        var stored = new StuckProblem("1/A", "T", "D", "I", "", "N", null, null, null);
        assertThat(ProblemMatch.statementOf(stored)).isEqualTo("T\n\nD\n\nInput\nI\n\nNote\nN");
    }

    @Test
    void keepsTagsSharedByAtLeastTwoNeighborsMostCommonFirst() {
        var near = List.of(p("1", "a", "", null, "dp", "math"), p("2", "b", "", null, "dp", "greedy"),
                p("3", "c", "", null, "dp", "math", "*special"), p("4", "d", "", null, "graphs"),
                p("5", "e", "", null, "greedy"));
        assertThat(Neighbors.tags(near, 4)).containsExactly("dp", "greedy", "math");
        assertThat(Neighbors.tags(List.of(p("1", "a", "", null, "math"), p("2", "b", "", null, "dp"),
                p("3", "c", "", null, "trees")), 4)).containsExactly("dp");
        assertThat(Neighbors.tags(List.of(), 4)).isEmpty();
    }

    @Test
    void countsATagOncePerNeighborAndCapsTheList() {
        var near = List.of(p("1", "a", "", null, "dp", "dp", "a", "math"),
                p("2", "b", "", null, "dp", "math", "greedy", "graphs", "trees", "strings"),
                p("3", "c", "", null, "greedy", "graphs", "trees", "strings"), p("4", "d", "", 1));
        assertThat(Neighbors.tags(near, 3)).containsExactly("dp", "graphs", "greedy");
    }

    @Test
    void ratesByTheMedianOfRatedNeighborsRoundedTo100() {
        assertThat(Neighbors.rating(List.of(p("1", "a", "", 1200), p("2", "b", "", 1500), p("3", "c", "", null),
                p("4", "d", "", 1700)))).isEqualTo(1500);
        assertThat(Neighbors.rating(List.of(p("1", "a", "", 1200), p("2", "b", "", 1500)))).isEqualTo(1400);
        assertThat(Neighbors.rating(List.of(p("1", "a", "", null)))).isNull();
    }
}
