package com.algolearn.practice;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Accounts;
import com.algolearn.support.Json;
import com.algolearn.support.Problems;
import com.algolearn.support.UserData;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;

/** Legacy practice.list.routes.test.js. */
class PracticeListIT extends PracticeTestBase {

    PracticeListIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search) {
        super(mvc, jdbc, problems, search);
    }

    private String seeded() throws Exception {
        seed(Problems.at("1/A"), Problems.at("2/A"), Problems.at("3/A"));
        var token = token();
        for (var id : List.of("1/A", "2/A", "3/A")) {
            add(token, Map.of("problemId", id));
        }
        patchItem(token, "/2/A", Map.of("status", "solved"));
        return token;
    }

    private static List<String> values(JsonNode body, String field) {
        var values = new ArrayList<String>();
        body.get("data").forEach(item -> values.add(item.get(field).asString()));
        return values;
    }

    @Test
    void listsTheItemsNewestFirstWithMeta() throws Exception {
        var result = list(seeded(), "");
        assertThat(status(result)).isEqualTo(200);
        var body = Json.body(result);
        assertThat(values(body, "problemId")).containsExactly("3/A", "2/A", "1/A");
        assertThat(body.get("meta")).isEqualTo(Json.parse("{\"total\":3,\"status\":null}"));
    }

    @Test
    void filtersByStatus() throws Exception {
        var body = Json.body(list(seeded(), "?status=solved"));
        assertThat(values(body, "problemId")).containsExactly("2/A");
        assertThat(values(body, "status")).containsExactly("solved");
        assertThat(body.get("meta")).isEqualTo(Json.parse("{\"total\":1,\"status\":\"solved\"}"));
    }

    @Test
    void onlyShowsTheCallersItemsWithProblemNullWhenTheProblemIsGone() throws Exception {
        seeded();
        var other = Accounts.signup(mvc);
        assertThat(Json.body(list(other.token(), "")).get("data").size()).isZero();
        UserData.practice(jdbc, UUID.fromString(other.user().get("id").asString()), "77/A");
        var data = Json.body(list(other.token(), "")).get("data");
        assertThat(data.size()).isEqualTo(1);
        assertThat(data.get(0).get("problemId").asString()).isEqualTo("77/A");
        assertThat(data.get(0).get("problem").isNull()).isTrue();
    }

    @Test
    void answers400ValidationFailedForAnUnknownStatus() throws Exception {
        var error = Json.expectError(list(token(), "?status=done"), 400, "VALIDATION_FAILED");
        assertThat(Json.fields(error)).containsExactly("query.status");
    }

    @Test
    void answers401AuthRequiredWithoutAToken() throws Exception {
        Json.expectError(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get(PRACTICE)), 401, "AUTH_REQUIRED");
    }
}
