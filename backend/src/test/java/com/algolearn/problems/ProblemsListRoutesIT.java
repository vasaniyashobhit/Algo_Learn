package com.algolearn.problems;

import static com.algolearn.support.Problems.at;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Json;
import com.algolearn.support.ProblemDatabaseTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy problems.list.routes.test.js. */
class ProblemsListRoutesIT extends ProblemDatabaseTest {

    ProblemsListRoutesIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search) {
        super(mvc, jdbc, problems, search);
    }

    @BeforeEach
    void seedProblems() {
        seed(at("1/A", 800, "math"), at("2/A", 1500, "dp", "math"), at("3/A", 1900, "dp"));
    }

    @Test
    void isPublicAndReturnsItemsWithPaginationMeta() throws Exception {
        var json = Json.body(mvc.perform(get("/api/v1/problems?limit=2&page=1")));
        assertThat(json.get("success").asBoolean()).isTrue();
        assertThat(Json.ids(json)).containsExactly("3/A", "2/A");
        assertThat(json.get("meta")).isEqualTo(Json.parse("{\"page\":1,\"limit\":2,\"total\":3,\"totalPages\":2}"));
        assertThat(json.get("data").get(0).has("description")).isFalse();
    }

    @Test
    void appliesCommaListMatchAllAndRatingFilters() throws Exception {
        var json = Json.body(mvc.perform(get("/api/v1/problems?tags=dp,math&matchAll=true&minRating=1000")));
        assertThat(Json.ids(json)).containsExactly("2/A");
        assertThat(json.get("meta").get("total").asInt()).isEqualTo(1);
    }

    @Test
    void acceptsRepeatedTagsAndTagsWithSpaces() throws Exception {
        assertThat(Json.ids(Json.body(mvc.perform(get("/api/v1/problems?tags=dp&tags=math&maxRating=1500")))))
                .containsExactly("2/A", "1/A");
        var spaced = Json.body(mvc.perform(get("/api/v1/problems").param("tags", "data structures")));
        assertThat(spaced.get("data")).isEmpty();
    }

    @Test
    void rejectsAnUnknownTag() throws Exception {
        var error = Json.expectError(mvc.perform(get("/api/v1/problems?tags=dp,nope")), 400, "VALIDATION_FAILED");
        assertThat(Json.issues(error)).containsExactly("query.tags.1: Unknown tag");
    }

    @Test
    void rejectsLimitOver50AndMinAboveMaxTogether() throws Exception {
        var error = Json.expectError(mvc.perform(get("/api/v1/problems?limit=51&minRating=2000&maxRating=1000")),
                400, "VALIDATION_FAILED");
        assertThat(Json.fields(error)).containsExactlyInAnyOrder("query.limit", "query.minRating");
    }

    @Test
    void rejectsANonNumericPage() throws Exception {
        var error = Json.expectError(mvc.perform(get("/api/v1/problems?page=abc")), 400, "VALIDATION_FAILED");
        assertThat(Json.fields(error)).containsExactly("query.page");
    }

    @Test
    void treatsAnEmptyValueAsNotGiven() throws Exception {
        var json = Json.body(mvc.perform(get("/api/v1/problems?limit=&page=&tags=&q=")));
        assertThat(json.get("meta")).isEqualTo(Json.parse("{\"page\":1,\"limit\":20,\"total\":3,\"totalPages\":1}"));
    }
}
