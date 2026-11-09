package com.algolearn.security;

import static com.algolearn.support.Accounts.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.algolearn.support.Accounts;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Json;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Deny by default, with the legacy behaviour for unknown routes and guarded prefixes. */
class SecurityIT extends DatabaseTest {

    SecurityIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/auth/me", "/api/v1/users/me", "/api/v1/users/me/stats", "/api/v1/users/nope",
        "/api/v1/practice", "/api/v1/recommendations", "/api/v1/stuck/history"})
    void protectedRoutesAndGuardedPrefixesNeedAToken(String path) throws Exception {
        var error = Json.expectError(mvc.perform(get(path)), 401, "AUTH_REQUIRED");
        assertThat(error.get("message").asString()).isEqualTo("Authentication required");
    }

    @Test
    void unknownRoutesAnswerJson404NotAuth() throws Exception {
        var error = Json.expectError(mvc.perform(get("/api/v1/nope")), 404, "ROUTE_NOT_FOUND");
        assertThat(error.get("message").asString()).isEqualTo("Route GET /api/v1/nope not found");
        Json.expectError(mvc.perform(post("/api/v1/auth/me")), 404, "ROUTE_NOT_FOUND");
        Json.expectError(mvc.perform(get("/api/v1/auth/nope")), 404, "ROUTE_NOT_FOUND");
        Json.expectError(mvc.perform(post("/api/v1/problems")), 404, "ROUTE_NOT_FOUND");
        Json.expectError(mvc.perform(get("/nope")), 404, "ROUTE_NOT_FOUND");
    }

    @Test
    void unknownRoutesUnderAGuardedPrefixAre404OnceAuthenticated() throws Exception {
        var account = Accounts.signup(mvc);
        Json.expectError(mvc.perform(bearer(get("/api/v1/users/nope"), account.token())), 404, "ROUTE_NOT_FOUND");
        Json.expectError(mvc.perform(bearer(post("/api/v1/users/me"), account.token())), 404, "ROUTE_NOT_FOUND");
    }

    @Test
    void publicRoutesWorkWithoutATokenAndIgnoreABadOne() throws Exception {
        for (var path : new String[] {"/api/v1/health", "/api/v1/meta/tags", "/api/v1/problems"}) {
            assertThat(mvc.perform(get(path)).andReturn().getResponse().getStatus()).as(path).isEqualTo(200);
            var withBadToken = mvc.perform(get(path).header("Authorization", "Bearer a.b.c")).andReturn();
            assertThat(withBadToken.getResponse().getStatus()).as(path).isEqualTo(200);
        }
        Json.expectError(mvc.perform(get("/api/v1/problems/1/A")), 404, "PROBLEM_NOT_FOUND");
        Json.expectError(mvc.perform(get("/api/v1/problems/1/A/similar")), 404, "PROBLEM_NOT_FOUND");
        Json.expectError(mvc.perform(post("/api/v1/auth/login")), 400, "VALIDATION_FAILED");
    }

    @Test
    void theTokenIsCheckedBeforeTheBody() throws Exception {
        var request = patch("/api/v1/users/me").contentType("application/json").content("{\"name\":\"x\"}");
        Json.expectError(mvc.perform(request), 401, "AUTH_REQUIRED");
        var forged = patch("/api/v1/users/me").header("Authorization", "Bearer aaa.bbb.ccc");
        Json.expectError(mvc.perform(forged), 401, "AUTH_INVALID_TOKEN");
        Json.expectError(mvc.perform(get("/api/v1/users/me").header("Authorization", "  ")), 401, "AUTH_REQUIRED");
    }
}
