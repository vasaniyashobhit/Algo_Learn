package com.algolearn.sync;

import static com.algolearn.support.Handles.linkedAccount;
import static com.algolearn.support.Handles.sync;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.support.Accounts;
import com.algolearn.support.CfData;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Json;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy users.sync.routes.test.js (default settings: pages of 500, 20 s cooldown, stats recompute). */
class SyncRoutesIT extends DatabaseTest {

    SyncRoutesIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    @BeforeEach
    void knowTourist() {
        clock.set(Instant.parse("2026-10-29T10:00:00Z"));
        cf.withUser(CfData.user("tourist", 3400, 3400));
    }

    @Test
    void syncsReturnsTheCountsAndRecomputesTheStats() throws Exception {
        cf.withSubmissions(CfData.history(6));
        var account = linkedAccount(mvc, "tourist");
        var body = Json.body(sync(mvc, account.token()));
        assertThat(body.toString()).isEqualTo("{\"success\":true,\"data\":{\"newSubmissions\":6,\"totalSubmissions\":6,"
                + "\"lastSyncedAt\":\"2026-10-29T10:00:00.000Z\",\"pending\":[]}}");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM topic_stats", Long.class)).isEqualTo(3);
        clock.advance(Duration.ofSeconds(21));
        var again = Json.body(sync(mvc, account.token())).get("data");
        assertThat(again.get("newSubmissions").asInt()).isZero();
        assertThat(again.get("totalSubmissions").asInt()).isEqualTo(6);
    }

    @Test
    void answers429WithRetryAfterSecondsWithin20SecondsOfTheLastSync() throws Exception {
        cf.withSubmissions(CfData.history(1));
        var account = linkedAccount(mvc, "tourist");
        sync(mvc, account.token());
        clock.advance(Duration.ofMillis(4_200));
        var error = Json.expectError(sync(mvc, account.token()), 429, "RATE_LIMITED");
        assertThat(error.get("details").toString()).isEqualTo("{\"retryAfterSeconds\":16}");
    }

    @Test
    void answers400WithoutAHandle() throws Exception {
        Json.expectError(sync(mvc, Accounts.signup(mvc).token()), 400, "CF_HANDLE_NOT_LINKED");
    }

    @Test
    void answers409WhileAnotherSyncHoldsTheLock() throws Exception {
        var account = linkedAccount(mvc, "tourist");
        jdbc.update("UPDATE users SET sync_locked_until = now() + interval '1 hour'");
        Json.expectError(sync(mvc, account.token()), 409, "SYNC_IN_PROGRESS");
    }

    @Test
    void answers503WhenCodeforcesIsDown() throws Exception {
        var account = linkedAccount(mvc, "tourist");
        cf.failStatus = CfData::down;
        var error = Json.expectError(sync(mvc, account.token()), 503, "CF_UNAVAILABLE");
        assertThat(error.get("details").get("status").asInt()).isEqualTo(503);
        assertThat(error.get("details").get("retryable").asBoolean()).isTrue();
    }

    @Test
    void answers404WhenTheHandleWasRenamedOnCodeforces() throws Exception {
        var account = linkedAccount(mvc, "tourist");
        cf.users.clear();
        Json.expectError(sync(mvc, account.token()), 404, "CF_HANDLE_NOT_FOUND");
    }

    @Test
    void answers401WithoutAToken() throws Exception {
        Json.expectError(sync(mvc, null), 401, "AUTH_REQUIRED");
    }
}
