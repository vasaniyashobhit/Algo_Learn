package com.algolearn.stuck;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.CoachRequest;
import com.algolearn.llm.FallbackReason;
import com.algolearn.llm.Llm;
import com.algolearn.llm.LlmFakes;
import com.algolearn.stuck.result.ProblemInfo;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy stuckView.test.js, plus the LLM adapter of the stuck flow. */
class StuckViewTest {

    private static final String ID = "6720f0c2a1b2c3d4e5f60718";
    private static final Instant AT = Instant.parse("2026-10-30T10:00:00Z");

    private static StoredQuery row(ProblemInfo problem) {
        var result = problem == null ? null : new com.algolearn.stuck.result.StuckResult("fallback", null, null,
                "n", "AI_BUSY", problem, List.of("h"), false, false,
                new com.algolearn.stuck.gap.Gap("m", List.of(), List.of()), null);
        return new StoredQuery(ID, "pdf", AT, "ai", "2/B", List.of("dp"), null, 1500,
                List.of(new GapItem("dp", "single", 0.1, "weak")), result, null);
    }

    @Test
    void spreadsTheStoredResultWithIdInputTypeAndCreatedAt() {
        var problem = new ProblemInfo("1/A", null, "T", List.of("math"), "db", 1000);
        var response = StuckView.response(row(problem));
        assertThat(response.id()).isEqualTo(ID.toString());
        assertThat(response.inputType()).isEqualTo("pdf");
        assertThat(response.createdAt()).isEqualTo("2026-10-30T10:00:00.000Z");
        assertThat(response.result().problem()).isEqualTo(problem);
    }

    @Test
    void buildsAHistoryRowFromTheStoredProblemAndGap() {
        var problem = new ProblemInfo("1/A", null, "T", List.of("math"), "db", 1000);
        assertThat(StuckView.historyItem(row(problem))).isEqualTo(new StuckView.HistoryItem(ID.toString(), "pdf",
                "2026-10-30T10:00:00.000Z", "ai", problem, List.of("dp")));
    }

    @Test
    void rebuildsTheProblemFromTopLevelFieldsForRowsWithoutAResult() {
        assertThat(StuckView.historyItem(row(null)).problem())
                .isEqualTo(new ProblemInfo("2/B", null, null, List.of("dp"), null, 1500));
    }

    @Test
    void adaptsTheLlmModuleWhichNeverThrows() {
        var ai = StuckAi.of(Llm.offline(LlmFakes.settings(LlmFakes.clockAt(0))));
        assertThat(ai.coach(CoachRequest.ofText("A statement long enough to ask about.")).reason())
                .isEqualTo(FallbackReason.AI_UNAVAILABLE);
        assertThat(ai.readImage(new byte[] {1}, "image/png", null)).isEmpty();
    }
}
