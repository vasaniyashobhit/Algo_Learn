package com.algolearn.stuck;

import com.algolearn.common.db.ObjectIds;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import com.algolearn.common.validation.JsText;
import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.stuck.result.StuckSolution;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Read and delete side of /stuck (legacy stuck.queries), always per user. A malformed id, an unknown id and another
 * user's id all answer the same 404 STUCK_QUERY_NOT_FOUND.
 */
@Service
public class StuckQueries {

    private final StuckQueryStore store;

    public StuckQueries(StuckQueryStore store) {
        this.store = store;
    }

    public Page history(UUID userId, int page) {
        var limit = StuckConstants.HISTORY_LIMIT;
        var items = store.page(userId, (page - 1) * limit, limit).stream().map(StuckView::historyItem).toList();
        var total = store.count(userId);
        return new Page(items, new HistoryMeta(page, limit, total, (total + limit - 1) / limit));
    }

    public StuckView.Response get(UUID userId, String id) {
        return StuckView.response(own(userId, id));
    }

    /** The full AI solution and/or the editorial; {@code kind} none (with the notice) when neither exists. */
    public SolutionView solution(UUID userId, String id) {
        var query = own(userId, id);
        var editorial = query.matchedProblemId() == null ? null : store.editorial(query.matchedProblemId())
                .map(JsText::trim).filter(text -> !text.isEmpty()).orElse(null);
        var kind = query.solution() != null ? "ai" : editorial != null ? "editorial" : "none";
        var items = query.result() == null ? List.<ProblemSummary>of() : query.result().similar().items();
        return new SolutionView(query.id(), kind, query.solution(), editorial,
                "none".equals(kind) ? StuckConstants.FALLBACK_NOTICE : null,
                items.stream().filter(ProblemSummary::hasEditorial).toList());
    }

    public Deleted remove(UUID userId, String id) {
        if (store.delete(userId, parse(id)) == 0) {
            throw notFound();
        }
        return new Deleted(id, true);
    }

    private StoredQuery own(UUID userId, String id) {
        return store.find(userId, parse(id)).orElseThrow(StuckQueries::notFound);
    }

    /** A 24-hex id in any case (legacy ObjectId parsing); anything else is simply not found. */
    private static String parse(String id) {
        return ObjectIds.parse(id).orElseThrow(StuckQueries::notFound);
    }

    private static NotFoundException notFound() {
        return new NotFoundException(ErrorCode.STUCK_QUERY_NOT_FOUND, "This stuck query was not found");
    }

    /** GET /stuck/:id/solution. */
    public record SolutionView(String id, String kind, StuckSolution solution, String editorial, String notice,
            List<ProblemSummary> similarWithEditorial) {
    }

    /** One history page and its meta. */
    public record Page(List<StuckView.HistoryItem> items, HistoryMeta meta) {
    }

    /** {@code { page, limit, total, totalPages }}. */
    public record HistoryMeta(int page, int limit, long total, long totalPages) {
    }

    /** DELETE /stuck/:id. */
    public record Deleted(String id, boolean deleted) {
    }
}
