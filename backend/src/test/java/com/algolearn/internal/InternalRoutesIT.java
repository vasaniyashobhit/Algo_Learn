package com.algolearn.internal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.algolearn.support.CfData;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Json;
import com.algolearn.support.Users;
import com.algolearn.users.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Legacy internal.routes.test.js and server.scheduler.test.js (secret from the env). Background jobs are
 * off in tests, so a 202 must not sync anyone; BackgroundJobs itself is covered by JobUnitsTest.
 */
class InternalRoutesIT extends DatabaseTest {

    static final String SECRET = "cron-secret-for-tests";
    static final String URL = "/api/v1/internal/sync-all";

    private final UserRepository users;

    InternalRoutesIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users) {
        super(mvc, jdbc);
        this.users = users;
    }

    @Test
    void answers202AtOnceAndHandsTheJobToTheBackground() throws Exception {
        cf.withUser(CfData.user("alpha")).withSubmissions(CfData.history(2));
        users.save(Users.user("alpha"));
        var result = mvc.perform(post(URL).header("x-cron-secret", SECRET));
        assertThat(result.andReturn().getResponse().getStatus()).isEqualTo(202);
        assertThat(Json.body(result).toString())
                .isEqualTo("{\"success\":true,\"data\":{\"started\":true,\"job\":\"syncAllUsers\"}}");
        assertThat(cf.calls).isEmpty();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"not-the-secret", "cron-", ""})
    void answers403ForbiddenWhenTheSecretIsMissingOrWrong(String secret) throws Exception {
        var request = post(URL);
        if (secret != null) {
            request.header("x-cron-secret", secret);
        }
        Json.expectError(mvc.perform(request), 403, "FORBIDDEN");
    }

    @Test
    void doesNotAcceptTheSecretInTheQueryString() throws Exception {
        Json.expectError(mvc.perform(post(URL + "?x-cron-secret=" + SECRET)), 403, "FORBIDDEN");
    }

    @Test
    void guardsEveryInternalPathLikeTheLegacyRouter() throws Exception {
        Json.expectError(mvc.perform(get("/api/v1/internal/other")), 403, "FORBIDDEN");
        Json.expectError(mvc.perform(get(URL).header("x-cron-secret", SECRET)), 404, "ROUTE_NOT_FOUND");
    }

    @Test
    void secretsMatchOnlyTheExactConfiguredSecret() {
        assertThat(CronSecretFilter.secretsMatch("s3cret-value", "s3cret-value")).isTrue();
        assertThat(CronSecretFilter.secretsMatch("s3cret-valuE", "s3cret-value")).isFalse();
        assertThat(CronSecretFilter.secretsMatch("s3cret", "s3cret-value")).isFalse();
        assertThat(CronSecretFilter.secretsMatch("", "")).isFalse();
        assertThat(CronSecretFilter.secretsMatch(null, "x")).isFalse();
        assertThat(CronSecretFilter.secretsMatch("x", null)).isFalse();
    }
}
