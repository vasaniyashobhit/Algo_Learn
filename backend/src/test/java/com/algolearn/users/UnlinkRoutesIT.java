package com.algolearn.users;

import static com.algolearn.support.Handles.unlink;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.support.Accounts;
import com.algolearn.support.CfData;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Handles;
import com.algolearn.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy users.handle.unlink.routes.test.js. */
class UnlinkRoutesIT extends DatabaseTest {

    UnlinkRoutesIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    private long submissions() {
        return jdbc.queryForObject("SELECT count(*) FROM submissions", Long.class);
    }

    @Test
    void unlinksTheHandleAndDeletesTheSyncedSubmissions() throws Exception {
        cf.withUser(CfData.user("tourist")).withSubmissions(CfData.history(4));
        var token = Handles.syncedToken(mvc, "tourist");
        assertThat(submissions()).isEqualTo(4);
        var result = unlink(mvc, token);
        assertThat(result.andReturn().getResponse().getStatus()).isEqualTo(200);
        var data = Json.body(result).get("data");
        for (var field : new String[] {"cfHandle", "cfRating", "lastSyncedAt"}) {
            assertThat(data.get(field).isNull()).as(field).isTrue();
        }
        assertThat(submissions()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM topic_stats", Long.class)).isZero();
    }

    @Test
    void isANoOpSuccessWhenNoHandleIsLinked() throws Exception {
        var result = unlink(mvc, Accounts.signup(mvc).token());
        assertThat(result.andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(Json.body(result).get("data").get("cfHandle").isNull()).isTrue();
    }

    @Test
    void answers409WhileASyncIsRunning() throws Exception {
        var account = Accounts.signup(mvc);
        jdbc.update("UPDATE users SET sync_locked_until = now() + interval '1 hour'");
        Json.expectError(unlink(mvc, account.token()), 409, "SYNC_IN_PROGRESS");
    }

    @Test
    void answers401WithoutAToken() throws Exception {
        Json.expectError(unlink(mvc, null), 401, "AUTH_REQUIRED");
    }
}
