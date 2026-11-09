package com.algolearn.stats;

import static com.algolearn.support.Accounts.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.support.Accounts;
import com.algolearn.support.CfData;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Handles;
import com.algolearn.support.Json;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Legacy users.stats.summary.routes.test.js. */
class SummaryRoutesIT extends DatabaseTest {

    SummaryRoutesIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    private ResultActions summary(String token) throws Exception {
        var request = get("/api/v1/users/me/stats/summary");
        return mvc.perform(token == null ? request : bearer(request, token));
    }

    @Test
    void summarizesTheSyncedSubmissions() throws Exception {
        cf.withUser(CfData.user("tourist", 1500, 1500)).withSubmissions(CfData.history(4));
        var body = Json.body(summary(Handles.syncedToken(mvc, "tourist")));
        var meta = body.get("meta");
        assertThat(meta.propertyNames()).containsExactly("cfHandle", "cfRating", "lastSyncedAt");
        assertThat(meta.get("cfHandle").asString() + meta.get("cfRating").asInt()).isEqualTo("tourist1500");
        var data = body.get("data");
        assertThat(data.get("totals").toString()).isEqualTo("{\"submissions\":4,\"problemsAttempted\":4,"
                + "\"problemsSolved\":4,\"topicsAttempted\":2,\"pairsTracked\":1}");
        assertThat(data.get("strongest").get(0).get("topicKey").asString()).isEqualTo("dp");
        assertThat(data.get("strongest").get(1).get("topicKey").asString()).isEqualTo("math");
        assertThat(data.get("weakest").size()).isEqualTo(2);
        assertThat(data.get("solvedByRating").get("bands").get(3).toString())
                .isEqualTo("{\"from\":1400,\"to\":1599,\"solved\":4}");
        assertThat(data.get("activity").size()).isEqualTo(30);
    }

    @Test
    void returnsTheZeroFilledSummaryWithMetaReasonNoHandle() throws Exception {
        var body = Json.body(summary(Accounts.signup(mvc).token()));
        assertThat(body.get("success").asBoolean()).isTrue();
        assertThat(body.get("meta").toString())
                .isEqualTo("{\"cfHandle\":null,\"cfRating\":null,\"lastSyncedAt\":null,\"reason\":\"NO_HANDLE\"}");
        assertThat(body.get("data").propertyNames()).containsExactly("totals", "strongest", "weakest", "solvedByRating",
                "activity");
        assertThat(body.get("data").get("totals").get("submissions").asInt()).isZero();
        assertThat(body.get("data").get("solvedByRating").get("unrated").asInt()).isZero();
    }

    @Test
    void answers401AuthInvalidTokenWhenTheAccountWasDeleted() throws Exception {
        var account = Accounts.signup(mvc);
        jdbc.update("DELETE FROM users WHERE id = ?", UUID.fromString(account.user().get("id").asString()));
        Json.expectError(summary(account.token()), 401, "AUTH_INVALID_TOKEN");
    }

    @Test
    void answers401AuthRequiredWithoutAToken() throws Exception {
        Json.expectError(summary(null), 401, "AUTH_REQUIRED");
    }
}
