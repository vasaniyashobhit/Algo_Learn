package com.algolearn.practice;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Json;
import com.algolearn.support.Problems;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy practice.update.routes.test.js (PATCH and DELETE). */
class PracticeUpdateIT extends PracticeTestBase {

    PracticeUpdateIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search) {
        super(mvc, jdbc, problems, search);
    }

    private String withItem() throws Exception {
        seed(Problems.at("4/B1"));
        var token = token();
        add(token, Map.of("problemId", "4/B1", "addedFrom", "similar"));
        return token;
    }

    private long count() {
        var count = jdbc.queryForObject("SELECT count(*) FROM practice_items", Long.class);
        return count == null ? 0 : count;
    }

    @Test
    void updatesTheStatusAndReturnsTheFullItemIndexIsCaseInsensitive() throws Exception {
        var token = withItem();
        clock.advance(java.time.Duration.ofMinutes(1));
        var result = patchItem(token, "/4/b1", Map.of("status", "skipped"));
        assertThat(status(result)).isEqualTo(200);
        var item = Json.body(result).get("data");
        expectItem(item, "4/B1", "skipped", "similar");
        assertThat(item.get("updatedAt").asString()).isEqualTo("2026-10-30T10:01:01.000Z");
        assertThat(item.get("createdAt").asString()).isEqualTo("2026-10-30T10:00:01.000Z");
    }

    @Test
    void answers404NotFoundForAProblemThatIsNotInTheList() throws Exception {
        var error = Json.expectError(patchItem(withItem(), "/5/A", Map.of("status", "solved")), 404, "NOT_FOUND");
        assertThat(error.get("message").asString()).isEqualTo("Problem 5/A is not in your practice list");
    }

    @Test
    void answers400ValidationFailedForABadStatusExtraFieldsOrBadParams() throws Exception {
        var result = patchItem(withItem(), "/0/a-b", Map.of("status", "done", "addedFrom", "x"));
        var error = Json.expectError(result, 400, "VALIDATION_FAILED");
        assertThat(Json.fields(error)).containsExactlyInAnyOrder("body", "body.status", "params.contestId",
                "params.index");
    }

    @Test
    void patchAnswers401AuthRequiredWithoutAToken() throws Exception {
        Json.expectError(patchItem(null, "/1/A", Map.of("status", "todo")), 401, "AUTH_REQUIRED");
    }

    @Test
    void removesTheItemAndReturnsIt() throws Exception {
        var result = deleteItem(withItem(), "/4/B1");
        assertThat(status(result)).isEqualTo(200);
        expectItem(Json.body(result).get("data"), "4/B1", "todo", "similar");
        assertThat(count()).isZero();
    }

    @Test
    void answers404NotFoundWhenTheItemDoesNotExist() throws Exception {
        var token = withItem();
        deleteItem(token, "/4/B1");
        Json.expectError(deleteItem(token, "/4/B1"), 404, "NOT_FOUND");
    }

    @Test
    void deleteAnswers400ForBadParamsAnd401WithoutAToken() throws Exception {
        assertThat(status(deleteItem(withItem(), "/x/A"))).isEqualTo(400);
        Json.expectError(deleteItem(null, "/4/B1"), 401, "AUTH_REQUIRED");
    }
}
