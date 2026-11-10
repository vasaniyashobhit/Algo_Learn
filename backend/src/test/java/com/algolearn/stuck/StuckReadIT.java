package com.algolearn.stuck;

import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.stuck.url.UrlFakes;
import com.algolearn.support.Accounts;
import com.algolearn.support.Json;
import com.algolearn.support.StuckDoubles;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Legacy stuck.read.routes.test.js: history, one result, delete, and ids that are not the user's. */
class StuckReadIT extends StuckIT {

    StuckReadIT(MockMvc mvc, JdbcTemplate jdbc, StuckDoubles.FakeAi ai, StuckDoubles.FakeOcr ocr,
            UrlFakes.Hosts hosts, UrlFakes.Pages pages, ProblemRepository problems) {
        super(mvc, jdbc, ai, ocr, hosts, pages, problems);
    }

    private MvcResult as(String token, MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(Accounts.bearer(request, token)).andReturn();
    }

    private String solveAt(String token, Instant at) throws Exception {
        clock.set(at);
        return data(postStuck(token, Map.of("inputType", "text", "text", STATEMENT))).get("id").asString();
    }

    @Test
    void pagesTheUsersQueriesNewestFirst20PerPage() throws Exception {
        var token = user();
        var start = Instant.parse("2026-10-01T00:00:00Z");
        for (var i = 0; i < 22; i++) {
            solveAt(token, start.plus(Duration.ofHours(i)));
        }
        solveAt(user(), start);
        var first = Json.body(as(token, get(PATH + "/history")));
        assertThat(first.get("meta")).isEqualTo(Json.parse("{\"page\":1,\"limit\":20,\"total\":22,\"totalPages\":2}"));
        var row = first.get("data").get(0);
        assertThat(row.propertyNames()).containsExactly("id", "inputType", "createdAt", "source", "problem",
                "gapTopics");
        assertThat(row.get("createdAt").asString()).isEqualTo("2026-10-01T21:00:00.000Z");
        assertThat(row.get("source").asString()).isEqualTo("fallback");
        assertThat(row.get("problem").get("title").asString()).isEqualTo("Theatre Square");
        var second = Json.body(as(token, get(PATH + "/history?page=2")));
        assertThat(second.get("data").get(1).get("createdAt").asString()).isEqualTo("2026-10-01T00:00:00.000Z");
        assertThat(second.get("data")).hasSize(2);
    }

    @Test
    void validatesThePageAndRequiresAuth() throws Exception {
        error(as(user(), get(PATH + "/history?page=0")), 400, "VALIDATION_FAILED");
        error(mvc.perform(get(PATH + "/history")).andReturn(), 401, "AUTH_REQUIRED");
    }

    @Test
    void returnsTheSavedResultWithoutTheSolutionThenDeletesIt() throws Exception {
        var token = user();
        var created = data(postStuck(token, Map.of("inputType", "text", "text", STATEMENT)));
        var id = created.get("id").asString();
        var res = as(token, get(PATH + "/" + id));
        assertThat(res.getResponse().getStatus()).isEqualTo(200);
        assertThat(data(res)).isEqualTo(created);
        assertThat(data(res).propertyNames()).doesNotContain("rawInput", "solution");
        assertThat(Json.body(as(token, delete(PATH + "/" + id))))
                .isEqualTo(Json.parse("{\"success\":true,\"data\":{\"id\":\"" + id + "\",\"deleted\":true}}"));
        error(as(token, get(PATH + "/" + id)), 404, "STUCK_QUERY_NOT_FOUND");
    }

    @Test
    void answersNotFoundForAnotherUsersIdAnUnknownIdAndAMalformedId() throws Exception {
        var id = data(postStuck(user(), Map.of("inputType", "text", "text", STATEMENT))).get("id").asString();
        var other = user();
        for (var bad : new String[] {id, "ffffffff-ffff-ffff-ffff-ffffffffffff", "not-an-id", "f".repeat(24),
            "1-1-1-1-1"}) {
            error(as(other, get(PATH + "/" + bad)), 404, "STUCK_QUERY_NOT_FOUND");
            error(as(other, delete(PATH + "/" + bad)), 404, "STUCK_QUERY_NOT_FOUND");
            error(as(other, get(PATH + "/" + bad + "/solution")), 404, "STUCK_QUERY_NOT_FOUND");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM stuck_queries", Long.class)).isEqualTo(1);
    }

    @Test
    void requiresAuth() throws Exception {
        var id = "a".repeat(24);
        error(mvc.perform(get(PATH + "/" + id)).andReturn(), 401, "AUTH_REQUIRED");
        error(mvc.perform(delete(PATH + "/" + id)).andReturn(), 401, "AUTH_REQUIRED");
        error(mvc.perform(get(PATH + "/" + id + "/solution")).andReturn(), 401, "AUTH_REQUIRED");
    }
}
