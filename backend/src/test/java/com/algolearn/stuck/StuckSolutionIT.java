package com.algolearn.stuck;

import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static com.algolearn.stuck.StuckFixtures.coachAnswer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.llm.CachedAnswer;
import com.algolearn.llm.CoachResult;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.stuck.url.UrlFakes;
import com.algolearn.support.Accounts;
import com.algolearn.support.Json;
import com.algolearn.support.StuckDoubles;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;

/** Legacy stuck.solution.routes.test.js: hints first, the solution on request. */
class StuckSolutionIT extends StuckIT {

    StuckSolutionIT(MockMvc mvc, JdbcTemplate jdbc, StuckDoubles.FakeAi ai, StuckDoubles.FakeOcr ocr,
            UrlFakes.Hosts hosts, UrlFakes.Pages pages, ProblemRepository problems) {
        super(mvc, jdbc, ai, ocr, hosts, pages, problems);
    }

    private JsonNode solution(Map<String, Object> body) throws Exception {
        var token = user();
        var id = data(postStuck(token, body)).get("id").asString();
        var res = mvc.perform(Accounts.bearer(get(PATH + "/" + id + "/solution"), token)).andReturn();
        assertThat(res.getResponse().getStatus()).isEqualTo(200);
        return data(res);
    }

    @Test
    void returnsTheFullAiSolutionAndTheEditorialWhenBothExist() throws Exception {
        seed("1/A", "Theatre Square", "Pave it.", 1000, "  Ceil both sides.  ", "math");
        ai.coach = CoachResult.of(CoachResult.AI, new CachedAnswer(coachAnswer(), "gemini", "a"));
        var data = solution(Map.of("inputType", "url", "url", "https://codeforces.com/contest/1/problem/A"));
        assertThat(data.propertyNames()).containsExactly("id", "kind", "solution", "editorial", "notice",
                "similarWithEditorial");
        assertThat(data.get("kind").asString()).isEqualTo("ai");
        assertThat(data.get("editorial").asString()).isEqualTo("Ceil both sides.");
        assertThat(data.get("notice").isNull()).isTrue();
        assertThat(data.get("similarWithEditorial")).isEmpty();
        assertThat(data.get("solution")).isEqualTo(Json.parse("{\"approach\":\"Multiply ceil(n/a) by ceil(m/a).\","
                + "\"solutionSteps\":[\"Read input\",\"Print the product\"],\"complexity\":\"O(1)\","
                + "\"code\":\"#include <cstdio>\\nint main() {}\",\"pitfalls\":[\"Use 64-bit integers\"]}"));
    }

    @Test
    void returnsTheEditorialWhenTheAiWasUnavailable() throws Exception {
        seed("1/A", "Theatre Square", "Pave it.", 1000, "Ceil both sides.", "math");
        var data = solution(Map.of("inputType", "text", "text", STATEMENT));
        assertThat(data.get("kind").asString()).isEqualTo("editorial");
        assertThat(data.get("solution").isNull()).isTrue();
        assertThat(data.get("editorial").asString()).isEqualTo("Ceil both sides.");
    }

    @Test
    void returnsKindNoneWithTheNoticeAndSimilarProblemsThatHaveEditorials() throws Exception {
        seed("7/A", "Seven", "Numbers.", 1200, "E", "math");
        seed("8/A", "Eight", "Numbers.", 1200, null, "math");
        ai.coach = CoachResult.of(CoachResult.AI, new CachedAnswer(coachAnswer(List.of("math"), 1200,
                List.of("h"), ""), "gemini", "a"));
        var data = solution(Map.of("inputType", "text", "text", "Unknown statement about numbers and sums, long."));
        assertThat(data.get("kind").asString()).isEqualTo("none");
        assertThat(data.get("solution").isNull()).isTrue();
        assertThat(data.get("editorial").isNull()).isTrue();
        assertThat(data.get("notice").asString()).isEqualTo(StuckConstants.FALLBACK_NOTICE);
        assertThat(Json.ids(Json.parse("{\"data\":" + data.get("similarWithEditorial") + "}")))
                .containsExactly("7/A");
    }

    @Test
    void keepsAnAnswerWhoseCodeFailedTheCheckWithCodeNull() throws Exception {
        ai.coach = CoachResult.of(CoachResult.AI, new CachedAnswer(coachAnswer().withCode(null), "gemini", "a"));
        var data = solution(Map.of("inputType", "text", "text", STATEMENT));
        assertThat(data.get("kind").asString()).isEqualTo("ai");
        assertThat(data.get("solution").get("code").isNull()).isTrue();
        assertThat(data.get("solution").get("solutionSteps")).hasSize(2);
    }

    @Test
    void requiresAuth() throws Exception {
        error(mvc.perform(get(PATH + "/" + "a".repeat(24) + "/solution")).andReturn(), 401, "AUTH_REQUIRED");
    }
}
