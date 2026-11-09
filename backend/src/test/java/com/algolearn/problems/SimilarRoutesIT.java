package com.algolearn.problems;

import static com.algolearn.support.Problems.at;
import static com.algolearn.support.Problems.stub;
import static com.algolearn.support.Problems.titled;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Json;
import com.algolearn.support.ProblemDatabaseTest;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;

/** Legacy problems.similar.routes.test.js and findSimilarToProblem (problems.detail.service.test.js). */
class SimilarRoutesIT extends ProblemDatabaseTest {

    private static final String URL = "/api/v1/problems/1/A/similar";

    SimilarRoutesIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search) {
        super(mvc, jdbc, problems, search);
    }

    private JsonNode similar(String url) throws Exception {
        return Json.body(mvc.perform(get(url)));
    }

    @Test
    void returnsRankedProblemsWithStrategyMetaWithoutAuth() throws Exception {
        seed(at("1/A", 1500, "dp", "greedy"), at("2/A", 1600, "dp", "greedy"), at("3/A", 1500, "dp"));
        var json = similar(URL);
        assertThat(Json.ids(json)).containsExactly("2/A", "3/A");
        var similarity = json.get("data").get(0).get("similarity");
        assertThat(similarity.propertyNames()).containsExactly("score", "jaccard", "ratingCloseness");
        assertThat(similarity.get("jaccard").asDouble()).isEqualTo(1);
        assertThat(json.get("meta")).isEqualTo(Json.parse("{\"strategy\":\"primary\",\"strategies\":[\"primary\"],"
                + "\"ratingWindow\":300,\"targetRating\":1500,\"count\":2,\"problem\":{\"id\":\"1/A\","
                + "\"title\":\"Title 1/A\",\"rating\":1500,\"tags\":[\"dp\",\"greedy\"]}}"));
    }

    @Test
    void honoursKAndRatingWindow() throws Exception {
        seed(at("1/A", 1500, "dp"), at("2/A", 1540, "dp"), at("3/A", 1520, "dp"));
        var json = similar(URL + "?k=1&ratingWindow=50");
        assertThat(Json.ids(json)).containsExactly("3/A");
        assertThat(json.get("meta").get("ratingWindow").asInt()).isEqualTo(50);
        assertThat(json.get("meta").get("count").asInt()).isEqualTo(1);
    }

    @Test
    void fallsBackInsteadOfReturningNothing() throws Exception {
        seed(at("1/A", 1500, "flows"), at("2/A", 1200, "math"));
        var json = similar(URL);
        assertThat(Json.ids(json)).containsExactly("2/A");
        assertThat(json.get("meta").get("strategy").asString()).isEqualTo("near_user_rating");
    }

    @Test
    void excludesItselfAndExactTitleDuplicates() throws Exception {
        seed(titled("Same", at("1/A", 1500, "dp")), titled("Same", at("2/A", 1500, "dp")),
                titled("Same!", at("3/A", 1500, "dp")));
        var json = similar(URL);
        assertThat(Json.ids(json)).containsExactly("3/A");
        assertThat(json.get("meta").get("problem").get("title").asString()).isEqualTo("Same");
    }

    @Test
    void worksForAnUntaggedUnratedCfApiSource() throws Exception {
        seed(stub("9/A", null), at("1/A", 1250));
        var json = similar("/api/v1/problems/9/A/similar");
        assertThat(Json.ids(json)).containsExactly("1/A");
        assertThat(json.get("meta").get("strategy").asString()).isEqualTo("near_user_rating");
        assertThat(json.get("meta").get("problem").get("rating").isNull()).isTrue();
        assertThat(json.get("meta").get("problem").get("tags")).isEmpty();
    }

    @Test
    void unknownProblemsAre404() throws Exception {
        Json.expectError(mvc.perform(get(URL)), 404, "PROBLEM_NOT_FOUND");
    }

    @Test
    void rejectsKAbove30AndABadRatingWindowAndBadParams() throws Exception {
        var error = Json.expectError(mvc.perform(get(URL + "?k=31&ratingWindow=10")), 400, "VALIDATION_FAILED");
        assertThat(Json.fields(error)).containsExactlyInAnyOrder("query.k", "query.ratingWindow");
        var params = Json.expectError(mvc.perform(get("/api/v1/problems/1x/A/similar")), 400, "VALIDATION_FAILED");
        assertThat(Json.fields(params)).containsExactly("params.contestId");
    }
}
