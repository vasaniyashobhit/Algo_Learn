package com.algolearn.stuck;

import static com.algolearn.stuck.ServiceHarness.USER_ID;
import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static com.algolearn.stuck.StuckFixtures.coachAnswer;
import static com.algolearn.stuck.StuckFixtures.dbProblem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.algolearn.llm.CachedAnswer;
import com.algolearn.llm.CoachResult;
import com.algolearn.stuck.input.ResolvedInput;
import com.algolearn.stuck.input.StuckInput;
import com.algolearn.stuck.match.StuckProblem;
import com.algolearn.stuck.result.ProblemInfo;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy stuck.service.sources.test.js: an unknown problem (tags from ai → neighbors). */
class StuckServiceSourcesTest {

    private static final String TEXT =
            "You are given a tree with n vertices. Count the paths whose xor is zero, modulo 998244353.";
    private static final ResolvedInput INPUT = new ResolvedInput(TEXT, null, TEXT, null);

    private static StuckProblem neighbor(String id, Integer rating, String... tags) {
        return dbProblem(id, "N " + id, "", rating, List.of(tags));
    }

    private static ProblemInfo solve(ServiceHarness h) {
        return h.service().solve(USER_ID, new StuckInput("text", TEXT, null, null)).result().problem();
    }

    private static ServiceHarness harness(ResolvedInput input, List<StuckProblem> problems, StuckProblem... near) {
        return new ServiceHarness(input, problems, List.of(near), List.of(), 1200, List.of());
    }

    private static CoachResult ai(List<String> tags, Integer rating) {
        return CoachResult.of(CoachResult.AI, new CachedAnswer(coachAnswer(tags, rating, List.of("h"), "a"), "g", "m"));
    }

    @Test
    void usesTheAiTagsAndRating() {
        var h = harness(INPUT, List.of(), neighbor("7/C", 1500, "dp"));
        h.coach = ai(List.of("trees", "bitmasks"), 2100);
        assertThat(solve(h)).isEqualTo(new ProblemInfo(null, null, TEXT, List.of("trees", "bitmasks"), "ai", 2100));
    }

    @Test
    void fallsBackToTheNearestProblemsMostCommonTagsAndMedianRating() {
        var h = harness(INPUT, List.of(), neighbor("1/B", 1800, "dp", "trees"),
                neighbor("2/B", 2000, "trees", "dfs and similar"), neighbor("3/B", null, "dp", "trees"),
                neighbor("4/B", 2400, "math"), neighbor("5/B", 1900));
        var result = h.service().solve(USER_ID, new StuckInput("text", TEXT, null, null)).result();
        assertThat(result.problem().tags()).containsExactly("trees", "dp");
        assertThat(result.problem().tagsSource()).isEqualTo("neighbors");
        assertThat(result.problem().rating()).isEqualTo(2000);
        assertThat(result.fallbackReason()).isEqualTo("AI_UNAVAILABLE");
        verify(h.repo, times(1)).searchProblems(contains("tree"), anyInt());
    }

    @Test
    void keepsTheAiRatingWhenTheTagsComeFromNeighbors() {
        var h = harness(INPUT, List.of(), neighbor("1/B", 2500, "dp"));
        h.coach = ai(List.of(), 1300);
        var problem = solve(h);
        assertThat(problem.tags()).containsExactly("dp");
        assertThat(problem.rating()).isEqualTo(1300);
    }

    @Test
    void searchesTheNeighborsAfterAnIdMatchWithoutTagsExcludingTheProblemItself() {
        var stored = dbProblem("1/A", "Theatre Square", "d", null, List.of());
        var h = harness(new ResolvedInput(STATEMENT, "1/A", "x", null), List.of(stored), stored,
                neighbor("8/A", 1100, "greedy"));
        var problem = solve(h);
        assertThat(problem.matchedProblemId()).isEqualTo("1/A");
        assertThat(problem.tags()).containsExactly("greedy");
        assertThat(problem.tagsSource()).isEqualTo("neighbors");
        assertThat(problem.rating()).isEqualTo(1100);
    }

    @Test
    void searchesTheStoredStatementWhenAnIdMatchHasNoTagsAndNoTextWasGiven() {
        var stored = dbProblem("1/A", "Theatre Square", "Theatre Square in the capital city of Berland.", 1600,
                List.of());
        var h = harness(new ResolvedInput(null, "1/A", "url", null), List.of(stored), neighbor("8/A", 1100, "greedy"));
        var problem = solve(h);
        verify(h.repo).searchProblems(contains("Theatre Square"), eq(5));
        assertThat(problem.tagsSource()).isEqualTo("neighbors");
        assertThat(problem.rating()).isEqualTo(1600);
    }
}
