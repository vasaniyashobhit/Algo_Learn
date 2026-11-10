package com.algolearn.stuck;

import com.algolearn.common.web.IsoTime;
import com.algolearn.stuck.result.ProblemInfo;
import com.algolearn.stuck.result.StuckResult;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import java.util.List;

/** Legacy stuckView: the stored query as POST /stuck and GET /stuck/:id return it, and a history row. */
public final class StuckView {

    private StuckView() {
    }

    public static Response response(StoredQuery q) {
        return new Response(String.valueOf(q.id()), q.inputType(), IsoTime.format(q.createdAt()), q.result());
    }

    /** The stored problem, or one rebuilt from the top-level columns for a row without a result. */
    public static HistoryItem historyItem(StoredQuery q) {
        var problem = q.result() != null ? q.result().problem()
                : new ProblemInfo(q.matchedProblemId(), null, null, q.detectedTags(), null, q.estimatedRating());
        return new HistoryItem(String.valueOf(q.id()), q.inputType(), IsoTime.format(q.createdAt()), q.source(),
                problem, q.gap().stream().map(GapItem::topicKey).toList());
    }

    /** {@code { id, inputType, createdAt, ...result }} (never the solution or the raw input). */
    public record Response(String id, String inputType, String createdAt, @JsonUnwrapped StuckResult result) {
    }

    /** One row of GET /stuck/history. */
    public record HistoryItem(String id, String inputType, String createdAt, String source, ProblemInfo problem,
            List<String> gapTopics) {
    }
}
