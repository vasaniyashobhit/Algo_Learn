package com.algolearn.sync;

import com.algolearn.codeforces.dto.CfSubmission;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;

/** Pure helpers for Codeforces submissions (legacy helpers/cfSubmissions.js). */
public final class CfSubmissions {

    /** Every final verdict the Codeforces API can return (all CF verdicts except TESTING). */
    static final Set<String> FINAL_VERDICTS = Set.of("FAILED", "OK", "PARTIAL", "COMPILATION_ERROR",
            "RUNTIME_ERROR", "WRONG_ANSWER", "PRESENTATION_ERROR", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED",
            "IDLENESS_LIMIT_EXCEEDED", "SECURITY_VIOLATED", "CRASHED", "INPUT_PREPARATION_CRASHED", "CHALLENGED",
            "SKIPPED", "REJECTED");

    private CfSubmissions() {
    }

    /** Still being judged: no verdict yet, TESTING, or a verdict we do not know. */
    public static boolean isPending(CfSubmission submission) {
        return submission == null || submission.verdict() == null || !FINAL_VERDICTS.contains(submission.verdict());
    }

    /** Worth storing: a judged submission to a problem that belongs to a contest. */
    public static boolean isStorable(CfSubmission submission) {
        return hasContest(submission) && !isPending(submission);
    }

    private static boolean hasContest(CfSubmission submission) {
        return submission != null && submission.problem() != null && submission.problem().contestId() != null;
    }

    public static NewSubmission toRow(CfSubmission s) {
        var p = s.problem();
        return new NewSubmission(s.id(), p.contestId() + "/" + p.index(), p.contestId(), p.index(), p.rating(),
                p.tags() == null ? List.of() : p.tags(), s.verdict(), Instant.ofEpochSecond(s.creationTimeSeconds()));
    }

    /** {@code { problemId, cfSubmissionId }} of every pending submission to a contest problem. */
    public static List<PendingRef> pendingRefs(List<CfSubmission> fetched) {
        return fetched.stream().filter(s -> isPending(s) && hasContest(s))
                .map(s -> new PendingRef(s.problem().contestId() + "/" + s.problem().index(), s.id())).toList();
    }

    /**
     * The next lastSubmissionId. It never moves past a pending submission, so the next sync fetches it
     * again once it is judged (already-stored newer ones are ignored as duplicates).
     */
    public static Long nextCursor(List<CfSubmission> fetched, Long previous) {
        var lowestPending = fetched.stream().filter(CfSubmissions::isPending).mapToLong(CfSubmission::id).min()
                .orElse(Long.MAX_VALUE);
        var safe = fetched.stream().mapToLong(CfSubmission::id).filter(id -> id < lowestPending).max();
        if (safe.isEmpty()) {
            return previous;
        }
        return Math.max(previous == null ? 0 : previous, safe.getAsLong());
    }

    /** Drops repeats (pages can overlap mid-sync): first position, last copy, like a JS Map. */
    public static List<CfSubmission> uniqueById(List<CfSubmission> submissions) {
        var byId = new LinkedHashMap<Long, CfSubmission>();
        submissions.forEach(s -> byId.put(s.id(), s));
        return List.copyOf(byId.values());
    }
}
