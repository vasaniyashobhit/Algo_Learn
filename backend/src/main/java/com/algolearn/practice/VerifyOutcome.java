package com.algolearn.practice;

import java.util.List;
import java.util.Optional;

/**
 * Legacy verifyOutcome.js over the stored and the still-pending submissions (both already limited to the
 * problem and its Div1/Div2 copies). Any OK → solved; else STILL_JUDGING when the newest is pending.
 */
public final class VerifyOutcome {

    private VerifyOutcome() {
    }

    /** Empty = solved; otherwise the reason it is not. */
    public static Optional<String> reasonNotSolved(List<Judged> submissions, List<Long> pendingIds) {
        if (submissions.stream().anyMatch(s -> "OK".equals(s.verdict()))) {
            return Optional.empty();
        }
        var newestPending = pendingIds.stream().mapToLong(Long::longValue).max().orElse(0);
        var newestJudged = submissions.stream().mapToLong(Judged::cfSubmissionId).max().orElse(0);
        var judging = Math.max(0, newestPending) > Math.max(0, newestJudged);
        return Optional.of(judging ? PracticeConstants.STILL_JUDGING : PracticeConstants.NOT_SOLVED_YET);
    }

    /** A stored submission's id and verdict. */
    public record Judged(long cfSubmissionId, String verdict) {
    }
}
