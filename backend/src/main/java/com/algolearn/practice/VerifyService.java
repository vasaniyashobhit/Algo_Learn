package com.algolearn.practice;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.RateLimitException;
import com.algolearn.problems.ProblemService;
import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.recommendations.calc.SolvedCopies;
import com.algolearn.recommendations.calc.SolvedCopies.ProblemRef;
import com.algolearn.sync.PendingRef;
import com.algolearn.sync.SyncService;
import java.time.Clock;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Legacy practice.verify.js, "I solved it": syncs the user first (409 SYNC_IN_PROGRESS and other sync
 * errors pass through), then looks for an OK on the problem or a Div1/Div2 copy. Solved → the item
 * becomes solved (created with addedFrom "recommendation" if missing). Inside the sync cooldown the
 * stored submissions are checked instead; without a solve there the RATE_LIMITED error is re-thrown.
 */
@Service
public class VerifyService {

    private final SyncService sync;
    private final PracticeQueries practice;
    private final VerifyQueries queries;
    private final Clock clock;

    public VerifyService(SyncService sync, PracticeQueries practice, VerifyQueries queries, Clock clock) {
        this.sync = sync;
        this.practice = practice;
        this.queries = queries;
        this.clock = clock;
    }

    public VerifyResult verify(UUID userId, String problemId) {
        var problem = practice.summary(problemId).orElseThrow(() -> ProblemService.notFound(problemId));
        List<PendingRef> pending = List.of();
        RateLimitException cooldown = null;
        try {
            pending = sync.syncUser(userId).pending();
        } catch (RateLimitException e) {
            if (e.code() != ErrorCode.RATE_LIMITED) {
                throw e;
            }
            cooldown = e;
        }
        var ids = copyIdsOf(problem);
        var pendingIds = pending.stream().filter(ref -> ids.contains(ref.problemId()))
                .map(PendingRef::cfSubmissionId).toList();
        var reason = VerifyOutcome.reasonNotSolved(queries.submissions(userId, ids), pendingIds);
        if (reason.isEmpty()) {
            var row = practice.markSolved(userId, problem.id(), clock.instant());
            return VerifyResult.solved(PracticeItemView.of(row, problem));
        }
        if (cooldown != null) {
            throw cooldown;
        }
        return VerifyResult.notSolved(reason.get());
    }

    private List<String> copyIdsOf(ProblemSummary problem) {
        var self = new ProblemRef(problem.id(), problem.title(), problem.contestId());
        var ids = new LinkedHashSet<String>();
        ids.add(problem.id());
        queries.inContests(CopyContests.around(problem.contestId())).stream()
                .filter(ref -> SolvedCopies.isSameOrCopy(self, ref)).forEach(ref -> ids.add(ref.id()));
        return List.copyOf(ids);
    }
}
