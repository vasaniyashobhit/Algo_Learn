package com.algolearn.practice;

import static com.algolearn.support.Accounts.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Accounts;
import com.algolearn.support.Json;
import com.algolearn.support.ProblemDatabaseTest;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;

/** Legacy tests/helpers/practice.js. The clock moves 1 s before every add, so "newest first" is well defined. */
abstract class PracticeTestBase extends ProblemDatabaseTest {

    static final String PRACTICE = "/api/v1/practice";
    static final Instant T0 = Instant.parse("2026-10-30T10:00:00Z");

    PracticeTestBase(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search) {
        super(mvc, jdbc, problems, search);
    }

    @BeforeEach
    void fixTime() {
        clock.set(T0);
    }

    String token() throws Exception {
        return Accounts.signup(mvc).token();
    }

    ResultActions add(String token, Object body) throws Exception {
        clock.advance(Duration.ofSeconds(1));
        return mvc.perform(bearer(Accounts.postJson(PRACTICE, body), token));
    }

    ResultActions list(String token, String query) throws Exception {
        return mvc.perform(bearer(get(PRACTICE + query), token));
    }

    ResultActions patchItem(String token, String path, Object body) throws Exception {
        var request = patch(PRACTICE + path).contentType(MediaType.APPLICATION_JSON)
                .content(Json.MAPPER.writeValueAsString(body));
        return mvc.perform(token == null ? request : bearer(request, token));
    }

    ResultActions deleteItem(String token, String path) throws Exception {
        var request = delete(PRACTICE + path);
        return mvc.perform(token == null ? request : bearer(request, token));
    }

    static int status(ResultActions result) {
        return result.andReturn().getResponse().getStatus();
    }

    /** The full practice item every endpoint returns. */
    static void expectItem(JsonNode item, String problemId, String status, String addedFrom) {
        var parts = problemId.split("/");
        assertThat(item.propertyNames()).containsExactly("id", "problemId", "status", "addedFrom", "createdAt",
                "updatedAt", "problem");
        assertThat(item.get("id").asString()).matches("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
        assertThat(item.get("problemId").asString()).isEqualTo(problemId);
        assertThat(item.get("status").asString()).isEqualTo(status);
        assertThat(item.get("addedFrom").asString()).isEqualTo(addedFrom);
        assertThat(item.get("createdAt").asString()).matches("^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z$");
        assertThat(item.get("updatedAt").isString()).isTrue();
        assertThat(item.get("problem").get("id").asString()).isEqualTo(problemId);
        assertThat(item.get("problem").get("contestId").asInt()).isEqualTo(Integer.parseInt(parts[0]));
        assertThat(item.get("problem").get("index").asString()).isEqualTo(parts[1]);
    }
}
