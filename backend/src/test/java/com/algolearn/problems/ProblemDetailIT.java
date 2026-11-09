package com.algolearn.problems;

import static com.algolearn.support.Problems.at;
import static com.algolearn.support.Problems.stub;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.common.error.NotFoundException;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Json;
import com.algolearn.support.ProblemDatabaseTest;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy problems.detail.service.test.js (getById) and problems.get.routes.test.js. */
class ProblemDetailIT extends ProblemDatabaseTest {

    private final ProblemService service;

    ProblemDetailIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            ProblemService service) {
        super(mvc, jdbc, problems, search);
        this.service = service;
    }

    @Test
    void returnsTheFullProblemTextWithoutAuth() throws Exception {
        var problem = at("1723/GP1");
        problem.setDescription("Statement");
        problem.setNote("Note");
        problem.setEditorial("Idea");
        problem.setHasEditorial(true);
        seed(problem);
        var data = Json.body(mvc.perform(get("/api/v1/problems/1723/GP1"))).get("data");
        assertThat(data.get("id").asString()).isEqualTo("1723/GP1");
        assertThat(data.get("contestId").asInt()).isEqualTo(1723);
        assertThat(data.get("index").asString()).isEqualTo("GP1");
        assertThat(data.get("description").asString()).isEqualTo("Statement");
        assertThat(data.get("note").asString()).isEqualTo("Note");
        assertThat(data.get("editorial").asString()).isEqualTo("Idea");
        assertThat(data.get("hasEditorial").asBoolean()).isTrue();
        assertThat(data.get("hasStatement").asBoolean()).isTrue();
    }

    @Test
    void acceptsALowercaseIndexAndNumericIndexes() throws Exception {
        seed(at("4/B1"), at("921/01"));
        assertThat(Json.body(mvc.perform(get("/api/v1/problems/4/b1"))).get("data").get("id").asString())
                .isEqualTo("4/B1");
        assertThat(Json.body(mvc.perform(get("/api/v1/problems/921/01"))).get("data").get("id").asString())
                .isEqualTo("921/01");
    }

    @Test
    void returnsACfApiRowWithEmptyTextFields() throws Exception {
        seed(stub("2001/A", 1500, "dp"));
        var data = Json.body(mvc.perform(get("/api/v1/problems/2001/A"))).get("data");
        assertThat(data.get("source").asString()).isEqualTo("cf_api");
        assertThat(data.get("description").asString()).isEmpty();
        assertThat(data.get("editorial").asString()).isEmpty();
        assertThat(data.get("rating").asInt()).isEqualTo(1500);
        assertThat(data.get("hasStatement").asBoolean()).isFalse();
    }

    @Test
    void unknownProblemsAre404ProblemNotFound() throws Exception {
        var error = Json.expectError(mvc.perform(get("/api/v1/problems/1/A")), 404, "PROBLEM_NOT_FOUND");
        assertThat(error.get("message").asString()).isEqualTo("Problem 1/A was not found");
        var thrown = catchThrowableOfType(NotFoundException.class, () -> service.getById("1/Z"));
        assertThat(thrown.code().name()).isEqualTo("PROBLEM_NOT_FOUND");
    }

    @ParameterizedTest
    @CsvSource({"/api/v1/problems/abc/A, params.contestId", "/api/v1/problems/0/A, params.contestId",
        "/api/v1/problems/1/ABCD, params.index", "/api/v1/problems/1/A-1, params.index"})
    void rejectsBadParams(String url, String field) throws Exception {
        var error = Json.expectError(mvc.perform(get(url)), 400, "VALIDATION_FAILED");
        assertThat(Json.fields(error)).containsExactly(field);
    }
}
