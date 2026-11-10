package com.algolearn.stuck.match;

import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static com.algolearn.stuck.StuckFixtures.coachAnswer;
import static com.algolearn.stuck.StuckFixtures.dbProblem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.algolearn.stuck.StuckRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Legacy stuck.locate.test.js. */
class LocatorTest {

    private final StuckRepository repo = mock(StuckRepository.class);
    private final Locator locator = new Locator(repo);

    @Test
    void findsAProblemByIdWithoutATextSearch() {
        when(repo.findProblem("1/A")).thenReturn(Optional.of(dbProblem()));
        assertThat(locator.locate("1/A", null)).isEqualTo(new Locator.Located(dbProblem(), null));
        verify(repo, never()).searchProblems(anyString(), anyInt());
    }

    @Test
    void searchesTheTextWhenTheIdIsUnknownAndMatchesNothingWithoutText() {
        when(repo.findProblem("999/Z")).thenReturn(Optional.empty());
        when(repo.searchProblems(anyString(), anyInt())).thenReturn(List.of(dbProblem()));
        assertThat(locator.locate("999/Z", STATEMENT))
                .isEqualTo(new Locator.Located(dbProblem(), List.of(dbProblem())));
        assertThat(locator.locate("999/Z", null)).isEqualTo(new Locator.Located(null, List.of()));
        assertThat(locator.locate(null, "")).isEqualTo(new Locator.Located(null, List.of()));
    }

    @Test
    void detectsTagsAsDbThenAiThenNeighborsThenNone() {
        var answer = coachAnswer(List.of("dp"), 1700, List.of("h"), "a");
        var special = dbProblem("1/A", "T", "", 1000, List.of("*special", "math"));
        assertThat(locator.detectTags(special, answer, null, null))
                .isEqualTo(new Locator.Detected(List.of("math"), "db", 1000));
        assertThat(locator.detectTags(null, answer, null, null))
                .isEqualTo(new Locator.Detected(List.of("dp"), "ai", 1700));
        var near = List.of(dbProblem("2/A", "N", "", 1000, List.of("greedy")));
        assertThat(locator.detectTags(null, null, near, null))
                .isEqualTo(new Locator.Detected(List.of("greedy"), "neighbors", 1000));
        assertThat(locator.detectTags(null, null, null, "")).isEqualTo(new Locator.Detected(List.of(), null, null));
        verify(repo, never()).searchProblems(anyString(), anyInt());
    }
}
