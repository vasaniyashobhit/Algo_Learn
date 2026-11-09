package com.algolearn.sync;

import static com.algolearn.support.CfData.problem;
import static com.algolearn.support.CfData.submission;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.codeforces.dto.CfProblem;
import com.algolearn.codeforces.dto.CfSubmission;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy cfSubmissions.test.js and pendingRefs.test.js. */
class CfSubmissionsTest {

    @Test
    void treatsAMissingVerdictTestingOrAnUnknownVerdictAsPending() {
        assertThat(CfSubmissions.isPending(submission(1, null))).isTrue();
        assertThat(CfSubmissions.isPending(submission(1, "TESTING"))).isTrue();
        assertThat(CfSubmissions.isPending(submission(1, "NEW_THING"))).isTrue();
        assertThat(CfSubmissions.isPending(submission(1, "WRONG_ANSWER"))).isFalse();
    }

    @Test
    void storesOnlyJudgedSubmissionsWhoseProblemHasAContestId() {
        assertThat(CfSubmissions.isStorable(submission(1))).isTrue();
        assertThat(CfSubmissions.isStorable(submission(1, "OK", problem(null, "A")))).isFalse();
        assertThat(CfSubmissions.isStorable(submission(1, "TESTING"))).isFalse();
        assertThat(CfSubmissions.isStorable(null)).isFalse();
    }

    @Test
    void copiesTheProblemTagsAndRatingFromThePayload() {
        var sub = new CfSubmission(42L, 1950, 1_000L, new CfProblem(1950, "F2", "x", null, 2100, List.of("graphs")),
                "OK");
        assertThat(CfSubmissions.toRow(sub)).isEqualTo(new NewSubmission(42, "1950/F2", 1950, "F2", 2100,
                List.of("graphs"), "OK", Instant.ofEpochMilli(1_000_000)));
    }

    @Test
    void defaultsAMissingRatingToNullAndMissingTagsToEmpty() {
        var row = CfSubmissions.toRow(submission(1, "OK", problem(5, "A")));
        assertThat(row.problemRating()).isNull();
        assertThat(row.problemTags()).isEmpty();
    }

    @Test
    void cursorMovesToTheNewestIdWhenEverythingIsJudged() {
        assertThat(CfSubmissions.nextCursor(List.of(submission(9), submission(7)), 3L)).isEqualTo(9);
    }

    @Test
    void cursorKeepsThePreviousValueWhenNothingWasFetched() {
        assertThat(CfSubmissions.nextCursor(List.of(), 5L)).isEqualTo(5);
        assertThat(CfSubmissions.nextCursor(List.of(), null)).isNull();
    }

    @Test
    void cursorStopsBelowTheOldestPendingSubmission() {
        var fetched = List.of(submission(10), submission(9, "TESTING"), submission(8), submission(6));
        assertThat(CfSubmissions.nextCursor(fetched, 2L)).isEqualTo(8);
    }

    @Test
    void cursorStaysWhenTheOldestFetchedOneIsPending() {
        assertThat(CfSubmissions.nextCursor(List.of(submission(10), submission(9, null)), 4L)).isEqualTo(4);
    }

    @Test
    void uniqueByIdDropsRepeatedIdsAndKeepsOrder() {
        var unique = CfSubmissions.uniqueById(List.of(submission(3), submission(2), submission(3)));
        assertThat(unique.stream().map(CfSubmission::id)).containsExactly(3L, 2L);
    }

    @Test
    void pendingRefsListsPendingSubmissionsToContestProblems() {
        var fetched = List.of(submission(9, "TESTING", problem(5, "B")), submission(8, null, problem(6, "C1")),
                submission(7, "OK"), submission(6, "TESTING", problem(null, "A")));
        assertThat(CfSubmissions.pendingRefs(fetched))
                .containsExactly(new PendingRef("5/B", 9), new PendingRef("6/C1", 8));
        assertThat(CfSubmissions.pendingRefs(List.of(submission(1)))).isEmpty();
    }
}
