package com.algolearn.stuck;

import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static com.algolearn.stuck.StuckFixtures.coachAnswer;
import static com.algolearn.stuck.StuckFixtures.html;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.CachedAnswer;
import com.algolearn.llm.CoachResult;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.stuck.url.UrlFakes;
import com.algolearn.support.Json;
import com.algolearn.support.StuckDoubles;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy stuck.solve.routes.test.js: POST /stuck with text and links. */
class StuckSolveIT extends StuckIT {

    StuckSolveIT(MockMvc mvc, JdbcTemplate jdbc, StuckDoubles.FakeAi ai, StuckDoubles.FakeOcr ocr,
            UrlFakes.Hosts hosts, UrlFakes.Pages pages, ProblemRepository problems) {
        super(mvc, jdbc, ai, ocr, hosts, pages, problems);
    }

    private void theatre() {
        seed("1/A", "Theatre Square", "Pave the theatre square with flagstones.", 1000, "Ceil both.", "math");
    }

    @Test
    void answersACodeforcesUrlFromTheDbWithTheAiAnswer() throws Exception {
        theatre();
        seed("4/A", "Watermelon", "Divide it.", 800, null, "math");
        ai.coach = CoachResult.of(CoachResult.AI, new CachedAnswer(coachAnswer(), "gemini", "a"));
        var token = user();
        var res = postStuck(token, Map.of("inputType", "url", "url", "https://codeforces.com/problemset/problem/1/A"));
        assertThat(res.getResponse().getStatus()).isEqualTo(201);
        var data = data(res);
        assertThat(data.propertyNames()).containsExactly("id", "inputType", "createdAt", "source", "provider", "model",
                "notice", "fallbackReason", "problem", "hints", "hasSolution", "editorialAvailable", "gap", "similar");
        assertThat(data.get("id").asString()).matches("^[0-9a-f-]{36}$");
        assertThat(data.get("createdAt").asString()).matches("^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z$");
        assertThat(data.get("source").asString()).isEqualTo("ai");
        assertThat(data.get("notice").isNull()).isTrue();
        assertThat(data.get("problem")).isEqualTo(Json.parse("{\"matchedProblemId\":\"1/A\",\"requestedProblemId\":"
                + "\"1/A\",\"title\":\"Theatre Square\",\"tags\":[\"math\"],\"tagsSource\":\"db\",\"rating\":1000}"));
        assertThat(data.get("hints").get(0).asString()).isEqualTo("Each side needs ceil(n / a) stones");
        assertThat(data.get("hasSolution").asBoolean()).isTrue();
        assertThat(data.get("gap").get("items").get(0).get("status").asString()).isEqualTo("unseen");
        assertThat(data.get("similar").get("items").get(0).get("id").asString()).isEqualTo("4/A");
        assertThat(data.get("similar").get("easier").asBoolean()).isTrue();
        assertThat(data.get("similar").get("strategies").get(0).asString()).isEqualTo("primary");
        var stored = jdbc.queryForMap("SELECT user_id::text AS u, solution->>'code' AS code FROM stuck_queries");
        assertThat(stored.get("code")).asString().startsWith("#include");
    }

    @Test
    void answersPastedTextWithTheNeverBlankFallback() throws Exception {
        theatre();
        var data = data(postStuck(user(), Map.of("inputType", "text", "text", STATEMENT)));
        assertThat(data.get("source").asString()).isEqualTo("fallback");
        assertThat(data.get("notice").asString()).isEqualTo(StuckConstants.FALLBACK_NOTICE);
        assertThat(data.get("fallbackReason").asString()).isEqualTo("AI_UNAVAILABLE");
        assertThat(data.get("problem").get("matchedProblemId").asString()).isEqualTo("1/A");
        assertThat(data.get("hints").toString()).contains("From the editorial: Ceil both.");
    }

    @Test
    void readsAnotherWebPageThroughTheSsrfCheckedFetch() throws Exception {
        hosts.add("example.com", "93.184.216.34");
        pages.add("https://example.com/p", UrlFakes.page(html("<main>" + STATEMENT + "</main>")));
        var res = postStuck(user(), Map.of("inputType", "url", "url", "https://example.com/p"));
        assertThat(res.getResponse().getStatus()).isEqualTo(201);
        assertThat(data(res).get("problem").get("title").asString()).isEqualTo("Theatre Square");
    }

    @Test
    void refusesAPrivateUrlAndMapsAFailedFetch() throws Exception {
        hosts.add("internal.example", "10.1.2.3").add("example.com", "93.184.216.34");
        var token = user();
        var refused = error(postStuck(token, Map.of("inputType", "url", "url", "http://internal.example/")), 400,
                "URL_NOT_ALLOWED");
        assertThat(refused.get("details")).isEqualTo(Json.parse("{\"reason\":\"private\"}"));
        var failed = error(postStuck(token, Map.of("inputType", "url", "url", "https://example.com/gone")), 502,
                "URL_FETCH_FAILED");
        assertThat(failed.get("details")).isEqualTo(Json.parse("{\"reason\":\"status\",\"status\":404}"));
    }
}
