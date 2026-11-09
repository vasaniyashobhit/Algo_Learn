package com.algolearn.practice;

import com.algolearn.common.error.ConflictException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import com.algolearn.problems.ProblemService;
import com.algolearn.users.UserRepository;
import com.algolearn.users.UsersService;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

/**
 * Legacy practice.service.js: practice list CRUD. Every answer carries the full item(s), each with its
 * problem summary, so the client can reconcile optimistic updates.
 */
@Service
public class PracticeService {

    private final PracticeQueries queries;
    private final UserRepository users;
    private final Clock clock;

    public PracticeService(PracticeQueries queries, UserRepository users, Clock clock) {
        this.queries = queries;
        this.users = users;
        this.clock = clock;
    }

    public PracticePage list(UUID userId, String status) {
        var rows = queries.list(userId, status);
        var summaries = queries.summaries(rows.stream().map(PracticeRow::problemId).distinct().toList());
        var items = rows.stream().map(row -> PracticeItemView.of(row, summaries.get(row.problemId()))).toList();
        return new PracticePage(items, new PracticeMeta(items.size(), status));
    }

    public PracticeItemView add(UUID userId, String problemId, String addedFrom) {
        if (!users.existsById(userId)) {
            throw UsersService.accountGone();
        }
        var problem = queries.summary(problemId).orElseThrow(() -> ProblemService.notFound(problemId));
        try {
            return PracticeItemView.of(queries.insert(userId, problemId, addedFrom, clock.instant()), problem);
        } catch (DuplicateKeyException e) {
            throw new ConflictException(ErrorCode.PRACTICE_ITEM_EXISTS, "This problem is already in your practice list",
                    Map.of("problemId", problemId), e);
        }
    }

    public PracticeItemView update(UUID userId, String problemId, String status) {
        var row = queries.updateStatus(userId, problemId, status, clock.instant())
                .orElseThrow(() -> itemNotFound(problemId));
        return PracticeItemView.of(row, queries.summary(problemId).orElse(null));
    }

    public PracticeItemView remove(UUID userId, String problemId) {
        var row = queries.delete(userId, problemId).orElseThrow(() -> itemNotFound(problemId));
        return PracticeItemView.of(row, queries.summary(problemId).orElse(null));
    }

    static NotFoundException itemNotFound(String problemId) {
        return new NotFoundException(ErrorCode.NOT_FOUND, "Problem " + problemId + " is not in your practice list");
    }

    /** {@code meta: { total, status }} ({@code status} null when not filtered). */
    public record PracticeMeta(int total, String status) {
    }

    /** Items and meta. */
    public record PracticePage(List<PracticeItemView> items, PracticeMeta meta) {

        public PracticePage {
            items = List.copyOf(items);
        }
    }
}
