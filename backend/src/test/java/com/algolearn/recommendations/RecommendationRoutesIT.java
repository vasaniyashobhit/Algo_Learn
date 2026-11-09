package com.algolearn.recommendations;

import static com.algolearn.support.Accounts.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Accounts;
import com.algolearn.support.CfData;
import com.algolearn.support.Handles;
import com.algolearn.support.Json;
import com.algolearn.users.UserRepository;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy recommendations.routes.test.js. */
class RecommendationRoutesIT extends RecommendationTestBase {

    private static final String URL = "/api/v1/recommendations";

    RecommendationRoutesIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            RecommendationService service, UserRepository users, TagCountsCache cache) {
        super(mvc, jdbc, problems, search, service, users, cache);
    }

    @Test
    void recommendsTopicsAndProblemsAfterASyncExcludingSolvedOnes() throws Exception {
        clock.reset();
        seed(at("1001/A", 1500, "dp", "math"), at("2000/A", 1700, "dp"));
        cf.withUser(CfData.user("tourist", 1400, 1500)).withSubmissions(CfData.history(3));
        var token = Handles.syncedToken(mvc, "tourist");
        var result = mvc.perform(bearer(get(URL), token));
        assertThat(result.andReturn().getResponse().getStatus()).isEqualTo(200);
        var body = Json.body(result);
        assertThat(body.get("success").asBoolean()).isTrue();
        var topics = body.get("data").get("topics");
        assertThat(topics.size()).isEqualTo(3);
        var ids = new ArrayList<String>();
        topics.forEach(t -> t.get("problems").forEach(p -> ids.add(p.get("id").asString())));
        assertThat(ids).contains("2000/A").doesNotContain("1001/A");
        var first = topics.get(0);
        assertThat(first.propertyNames()).containsExactly("topic", "basis", "strength", "attempted", "solved",
                "comfortRating", "frequency", "priority", "reason", "targetRange", "problems");
        assertThat(first.get("targetRange").propertyNames()).containsExactly("min", "max");
        var meta = body.get("meta");
        assertThat(meta.get("userRating").asInt()).isEqualTo(1400);
        assertThat(meta.get("coldStart").asBoolean()).isFalse();
        assertThat(meta.get("recentFailed").asInt()).isZero();
        assertThat(meta.has("reason")).isFalse();
    }

    @Test
    void isNeverBlankForANewAccount() throws Exception {
        seed(at("1/A", 1200, "math"));
        var token = Accounts.signup(mvc).token();
        var body = Json.body(mvc.perform(bearer(get(URL), token)));
        var math = body.get("data").get("topics").get(0);
        assertThat(math.get("topic").asString()).isEqualTo("math");
        assertThat(math.get("basis").asString()).isEqualTo("frequent");
        assertThat(math.get("priority").isNull()).isTrue();
        var problem = math.get("problems").get(0);
        assertThat(problem.propertyNames()).containsExactly("id", "contestId", "index", "title", "rating", "tags",
                "hasEditorial", "source", "similarityToFailed", "pickedBy");
        assertThat(problem.get("id").asString()).isEqualTo("1/A");
        assertThat(math.get("problems").size()).isEqualTo(1);
        assertThat(body.get("meta").get("coldStart").asBoolean()).isTrue();
        assertThat(body.get("meta").get("reason").asString()).isEqualTo("NO_HANDLE");
    }

    @Test
    void answers401AuthRequiredWithoutAToken() throws Exception {
        Json.expectError(mvc.perform(get(URL)), 401, "AUTH_REQUIRED");
    }
}
