package com.algolearn.llm;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.cache.CoachCache;
import com.algolearn.llm.chain.ProviderCall;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.support.DatabaseTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** The check-coach task (legacy scripts/checks/coach.js) with a fake provider; also checks the LLM wiring. */
class CheckCoachTaskIT extends DatabaseTest {

    private final ProblemRepository problems;
    private final CoachCache cache;
    private final Llm wired;

    CheckCoachTaskIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, CoachCache cache, Llm wired) {
        super(mvc, jdbc);
        this.problems = problems;
        this.cache = cache;
        this.wired = wired;
    }

    private CheckCoachTask task(FakeProvider provider, String... args) {
        var settings = LlmFakes.settings(clock);
        var llm = new Llm(List.of(provider), cache, settings);
        return new CheckCoachTask(llm, cache, settings, problems, new DefaultApplicationArguments(args), clock);
    }

    @Test
    void contextWiresOneProviderPerGeminiModelAndNoGroqWithoutAKey() {
        assertThat(wired.providers().stream().map(ProviderCall::budgetKey))
                .containsExactly("gemini:gemini-a", "gemini:gemini-b");
    }

    @Test
    void usesTheImportedStatementAndCachesTheAnswer() {
        insertProblem("1/A", "hf", "Theatre Square", 1000, "math");
        var provider = FakeProvider.of("gemini", "a", LlmFakes.coachJson());
        var summary = task(provider).run();
        assertThat(summary).containsEntry("statement", "database").containsEntry("source", "ai")
                .containsEntry("provider", "gemini").containsEntry("model", "a").containsEntry("fresh", false)
                .containsEntry("estimatedRating", 1000).containsEntry("codeLines", 2)
                .containsEntry("providers", List.of("gemini:a")).containsKey("tookMs").doesNotContainKey("reason");
        assertThat(provider.prompts.getFirst()).contains("Theatre Square")
                .contains("Known tags for this problem: math");
        assertThat(cache.get("problem:1/A")).isPresent();
        assertThat(task(provider).run()).containsEntry("source", "cache");
    }

    @Test
    void freshSkipsTheCacheReadButStillWrites() {
        var provider = FakeProvider.of("gemini", "a", LlmFakes.coachJson());
        task(provider).run();
        var summary = task(provider, "--fresh").run();
        assertThat(summary).containsEntry("fresh", true).containsEntry("source", "ai")
                .containsEntry("statement", "built-in");
        assertThat(provider.jsonCalls).isEqualTo(2);
        assertThat(cache.get("problem:1/A")).isPresent();
    }

    @Test
    void reportsTheFallbackReasonWhenEveryProviderFails() {
        var summary = task(FakeProvider.of("gemini", "a", LlmFakes.httpError(404))).run();
        assertThat(summary).containsEntry("source", "fallback").containsEntry("provider", "-")
                .containsEntry("reason", "AI_UNAVAILABLE").doesNotContainKey("tags");
        assertThat(task(FakeProvider.of("gemini", "a", "x")).name()).isEqualTo("check-coach");
    }
}
