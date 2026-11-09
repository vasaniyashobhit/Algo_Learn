package com.algolearn.practice;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.practice.VerifyOutcome.Judged;
import com.algolearn.problems.dto.ProblemSummary;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Legacy practice.helpers.test.js: practiceView, verifyOutcome, copyFilter. */
class PracticeHelpersTest {

    private static final PracticeRow ROW = new PracticeRow(UUID.randomUUID(), "1/A", "todo", "manual",
            Instant.EPOCH, Instant.ofEpochMilli(1));

    @Test
    void practiceItemReturnsTheWhitelistedFieldsWithTheProblemSummary() {
        var problem = new ProblemSummary("1/A", 1, "A", "T", 800, List.of("math"), false, "hf", null);
        assertThat(PracticeItemView.of(ROW, problem)).isEqualTo(new PracticeItemView(ROW.id().toString(), "1/A",
                "todo", "manual", "1970-01-01T00:00:00.000Z", "1970-01-01T00:00:00.001Z", problem));
    }

    @Test
    void practiceItemSetsProblemToNullWhenItIsGone() {
        assertThat(PracticeItemView.of(ROW, null).problem()).isNull();
    }

    @Test
    void solvedWhenAnySubmissionIsOkEvenWithANewerPendingOne() {
        assertThat(VerifyOutcome.reasonNotSolved(List.of(new Judged(5, "WRONG_ANSWER"), new Judged(6, "OK")),
                List.of(9L))).isEmpty();
    }

    @Test
    void stillJudgingWhenTheNewestSubmissionIsPending() {
        assertThat(VerifyOutcome.reasonNotSolved(List.of(new Judged(5, "WRONG_ANSWER")), List.of(7L)))
                .contains("STILL_JUDGING");
        assertThat(VerifyOutcome.reasonNotSolved(List.of(), List.of(1L))).contains("STILL_JUDGING");
    }

    @Test
    void notSolvedYetWhenAJudgedSubmissionIsNewerOrNothingExists() {
        assertThat(VerifyOutcome.reasonNotSolved(List.of(new Judged(8, "WRONG_ANSWER")), List.of(7L)))
                .contains("NOT_SOLVED_YET");
        assertThat(VerifyOutcome.reasonNotSolved(List.of(), List.of())).contains("NOT_SOLVED_YET");
    }

    @Test
    void copyContestsCoverContestsWithin2() {
        assertThat(CopyContests.around(1900)).containsExactly(1898, 1899, 1900, 1901, 1902);
    }

    @Test
    void copyContestsSkipIdsBelow1() {
        assertThat(CopyContests.around(1)).containsExactly(1, 2, 3);
    }

    @Test
    void verifyResultShapes() {
        assertThat(VerifyResult.notSolved("NOT_SOLVED_YET")).isEqualTo(new VerifyResult(false, null,
                "NOT_SOLVED_YET"));
        assertThat(VerifyResult.solved(PracticeItemView.of(ROW, null)).verified()).isTrue();
    }
}
