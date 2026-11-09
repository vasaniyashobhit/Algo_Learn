package com.algolearn.practice;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Accounts;
import com.algolearn.support.Json;
import com.algolearn.support.Problems;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy practice.add.routes.test.js. */
class PracticeAddIT extends PracticeTestBase {

    PracticeAddIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search) {
        super(mvc, jdbc, problems, search);
    }

    @Test
    void addsAnItem201AndReturnsTheFullItemWithItsProblem() throws Exception {
        seed(Problems.at("4/B1"));
        var result = add(token(), Map.of("problemId", "4/b1", "addedFrom", "recommendation"));
        assertThat(status(result)).isEqualTo(201);
        var body = Json.body(result);
        assertThat(body.get("success").asBoolean()).isTrue();
        expectItem(body.get("data"), "4/B1", "todo", "recommendation");
        assertThat(body.get("data").get("problem").get("title").asString()).isEqualTo("Title 4/B1");
        assertThat(body.get("data").get("createdAt").asString()).isEqualTo("2026-10-30T10:00:01.000Z");
    }

    @Test
    void defaultsAddedFromToManual() throws Exception {
        seed(Problems.at("1/A"));
        expectItem(Json.body(add(token(), Map.of("problemId", "1/A"))).get("data"), "1/A", "todo", "manual");
    }

    @Test
    void answers409PracticeItemExistsForASecondAddOfTheSameProblem() throws Exception {
        seed(Problems.at("1/A"));
        var token = token();
        add(token, Map.of("problemId", "1/A"));
        var error = Json.expectError(add(token, Map.of("problemId", "1/A")), 409, "PRACTICE_ITEM_EXISTS");
        assertThat(error.get("details")).isEqualTo(Json.parse("{\"problemId\":\"1/A\"}"));
        assertThat(error.get("message").asString()).isEqualTo("This problem is already in your practice list");
    }

    @Test
    void letsTwoUsersAddTheSameProblem() throws Exception {
        seed(Problems.at("1/A"));
        assertThat(status(add(token(), Map.of("problemId", "1/A")))).isEqualTo(201);
        assertThat(status(add(token(), Map.of("problemId", "1/A")))).isEqualTo(201);
    }

    @Test
    void answers404ProblemNotFoundForAnUnknownProblem() throws Exception {
        Json.expectError(add(token(), Map.of("problemId", "99/Z")), 404, "PROBLEM_NOT_FOUND");
    }

    @Test
    void answers400ValidationFailedForABadIdOriginOrExtraField() throws Exception {
        var result = add(token(), Map.of("problemId", "nope", "addedFrom", "friend", "status", "solved"));
        var error = Json.expectError(result, 400, "VALIDATION_FAILED");
        assertThat(Json.fields(error)).containsExactlyInAnyOrder("body", "body.addedFrom", "body.problemId");
    }

    @Test
    void answers401AuthRequiredWithoutAToken() throws Exception {
        Json.expectError(mvc.perform(Accounts.postJson(PRACTICE, Map.of("problemId", "1/A"))), 401, "AUTH_REQUIRED");
    }
}
