package com.algolearn.stats;

import static com.algolearn.support.Accounts.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.support.Accounts;
import com.algolearn.support.CfData;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Handles;
import com.algolearn.support.Json;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Legacy users.stats.routes.test.js. */
class StatsRoutesIT extends DatabaseTest {

    static final String STATS = "/api/v1/users/me/stats";

    StatsRoutesIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    @BeforeEach
    void knowTourist() {
        cf.withUser(CfData.user("tourist", 1500, 1500));
    }

    private ResultActions stats(String token, String query) throws Exception {
        var request = get(STATS + query);
        return mvc.perform(token == null ? request : bearer(request, token));
    }

    @Test
    void returnsStatsRecomputedByTheSyncHook() throws Exception {
        cf.withSubmissions(CfData.history(6));
        var token = Handles.syncedToken(mvc, "tourist");
        var body = Json.body(stats(token, ""));
        var data = body.get("data");
        assertThat(data.size()).isEqualTo(2);
        assertThat(data.get(0).get("topicKey").asString()).isEqualTo("dp");
        assertThat(data.get(1).get("topicKey").asString()).isEqualTo("math");
        var dp = data.get(0);
        assertThat(dp.get("kind").asString() + dp.get("attempted") + dp.get("solved") + dp.get("failed"))
                .isEqualTo("single660");
        assertThat(dp.get("comfortRating").asInt()).isEqualTo(1500);
        var meta = body.get("meta");
        assertThat(meta.propertyNames()).containsExactly("kind", "sort", "limit", "total", "lastSyncedAt");
        assertThat(meta.get("total").asInt()).isEqualTo(2);
        assertThat(meta.get("lastSyncedAt").isString()).isTrue();
        var pairs = Json.body(stats(token, "?kind=pair&sort=attempted&limit=1")).get("data");
        assertThat(pairs.size()).isEqualTo(1);
        assertThat(pairs.get(0).get("topicKey").asString()).isEqualTo("dp+math");
        assertThat(pairs.get(0).get("tags").toString()).isEqualTo("[\"dp\",\"math\"]");
        assertThat(pairs.get(0).get("attempted").asInt()).isEqualTo(6);
    }

    @Test
    void returnsEmptyDataWithMetaReasonNoHandle() throws Exception {
        var body = Json.body(stats(Accounts.signup(mvc).token(), ""));
        assertThat(body.toString()).isEqualTo("{\"success\":true,\"data\":[],\"meta\":{\"kind\":\"single\","
                + "\"sort\":\"strength\",\"limit\":50,\"total\":0,\"lastSyncedAt\":null,\"reason\":\"NO_HANDLE\"}}");
    }

    @Test
    void answers400ForABadKindSortOrLimit() throws Exception {
        var error = Json.expectError(stats(Accounts.signup(mvc).token(), "?kind=triple&sort=name&limit=0"), 400,
                "VALIDATION_FAILED");
        assertThat(Json.fields(error)).containsExactlyInAnyOrder("query.kind", "query.limit", "query.sort");
    }

    @Test
    void answers401WithoutAToken() throws Exception {
        Json.expectError(stats(null, ""), 401, "AUTH_REQUIRED");
    }
}
