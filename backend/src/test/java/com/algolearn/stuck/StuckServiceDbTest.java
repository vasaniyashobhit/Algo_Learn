package com.algolearn.stuck;

import static com.algolearn.stuck.ServiceHarness.USER_ID;
import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static com.algolearn.stuck.StuckFixtures.coachAnswer;
import static com.algolearn.stuck.StuckFixtures.dbProblem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.algolearn.llm.CachedAnswer;
import com.algolearn.llm.CoachResult;
import com.algolearn.stuck.gap.GapAnalysis.TopicStatRow;
import com.algolearn.stuck.input.ResolvedInput;
import com.algolearn.stuck.input.StuckInput;
import com.algolearn.stuck.result.ProblemInfo;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy stuck.service.db.test.js: the problem is found in the DB (tagsSource db). */
class StuckServiceDbTest {

    private static final String URL = "https://codeforces.com/contest/1/problem/A";
    private static final StuckInput URL_INPUT = new StuckInput("url", null, URL, null);

    @Test
    void usesTheStoredTagsRatingAndEditorialForACodeforcesUrl() {
        var h = new ServiceHarness(new ResolvedInput(null, "1/A", URL, null), List.of(dbProblem()), List.of(),
                List.of(new TopicStatRow("math", "single", 0.2, 5)), 1200, List.of());
        var answer = coachAnswer(List.of("dp"), 1000, List.of("Each side needs ceil(n / a) stones"), "Multiply.");
        h.coach = CoachResult.of(CoachResult.AI, new CachedAnswer(answer, "gemini", "a"));
        var result = h.service().solve(USER_ID, URL_INPUT);
        verify(h.resolver).resolve(URL_INPUT, Instant.ofEpochMilli(51_000));
        var request = h.coachCalls.getFirst();
        assertThat(request.problemId()).isEqualTo("1/A");
        assertThat(request.text()).contains("Theatre Square in the capital");
        assertThat(request.knownTags()).containsExactly("math");
        assertThat(request.deadline()).isEqualTo(Instant.ofEpochMilli(51_000));
        assertThat(result.result().problem()).isEqualTo(new ProblemInfo("1/A", "1/A", "Theatre Square",
                List.of("math"), "db", 1000));
        assertThat(result.result().source()).isEqualTo("ai");
        assertThat(result.result().provider()).isEqualTo("gemini");
        assertThat(result.result().notice()).isNull();
        assertThat(result.result().hasSolution()).isTrue();
        assertThat(result.result().editorialAvailable()).isTrue();
        assertThat(result.inputType()).isEqualTo("url");
        assertThat(result.result().hints()).isEqualTo(answer.hints());
        assertThat(result.result().gap().items()).singleElement()
                .satisfies(item -> assertThat(item.status() + item.strength()).isEqualTo("weak0.2"));
        verify(h.repo).topicStats(USER_ID, List.of("math"));
        verify(h.repo, never()).searchProblems(anyString(), anyInt());
        var similar = h.similarCalls.getValue();
        assertThat(similar.tags()).containsExactly("math");
        assertThat(similar).extracting("rating", "userRating", "k").containsExactly(850, 1200, 10);
        assertThat(similar.excludeIds()).containsExactly("1/A");
        assertThat(similar.excludeTitles()).containsExactly("Theatre Square");
        assertThat(result.result().similar().easier()).isTrue();
        assertThat(result.result().similar().targetRating()).isEqualTo(850);
    }

    @Test
    void savesTheQueryWithTheSolutionKeptApartFromThePublicResult() {
        var h = new ServiceHarness(new ResolvedInput(null, "1/A", URL, null), List.of(dbProblem()), List.of(),
                List.of(), 1200, List.of());
        h.coach = CoachResult.of(CoachResult.CACHE, new CachedAnswer(coachAnswer(), "gemini", "a"));
        var result = h.service().solve(USER_ID, URL_INPUT);
        var saved = h.saved.getValue();
        assertThat(saved.userId()).isEqualTo(USER_ID);
        assertThat(saved.rawInput()).isEqualTo(URL);
        assertThat(saved.matchedProblemId()).isEqualTo("1/A");
        assertThat(saved.detectedTags()).containsExactly("math");
        assertThat(saved.tagsSource()).isEqualTo("db");
        assertThat(saved.estimatedRating()).isEqualTo(1000);
        assertThat(saved.source()).isEqualTo("cache");
        assertThat(saved.gap()).containsExactly(new GapItem("math", "single", null, "unseen"));
        assertThat(saved.solution().code()).startsWith("#include");
        assertThat(result.id()).matches("^[0-9a-f-]{36}$");
        assertThat(result.createdAt()).isEqualTo("2026-10-30T12:00:00.000Z");
    }

    @Test
    void matchesPastedTextToAStoredProblemByItsTitle() {
        var problem = dbProblem("1/A", "Theatre Square", "x", 1000, List.of("math", "implementation"));
        var h = new ServiceHarness(new ResolvedInput(STATEMENT, null, STATEMENT, null), List.of(),
                List.of(dbProblem("9/B", "Other", "", 900, List.of()), problem), List.of(), 1200, List.of());
        var result = h.service().solve(USER_ID, new StuckInput("text", STATEMENT, null, null));
        verify(h.repo).searchProblems(contains("Theatre Square"), eq(5));
        assertThat(h.coachCalls.getFirst().problemId()).isEqualTo("1/A");
        assertThat(h.coachCalls.getFirst().text()).isEqualTo(STATEMENT);
        assertThat(result.result().problem().matchedProblemId()).isEqualTo("1/A");
        assertThat(result.result().problem().requestedProblemId()).isNull();
        assertThat(result.result().problem().tagsSource()).isEqualTo("db");
    }
}
