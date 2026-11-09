package com.algolearn.auth;

import static com.algolearn.support.Accounts.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.security.AuthUser;
import com.algolearn.security.JwtLifetime;
import com.algolearn.security.JwtServiceFactory;
import com.algolearn.support.Accounts;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Json;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy auth.me.routes.test.js. */
class AuthMeIT extends DatabaseTest {

    private static final String SECRET = "tttttttttttttttttttttttttttttttt";

    AuthMeIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    @Test
    void returnsTheCurrentUserWithoutPasswordHash() throws Exception {
        var account = Accounts.signup(mvc);
        var json = Json.body(mvc.perform(bearer(get("/api/v1/auth/me"), account.token())));
        assertThat(json.get("success").asBoolean()).isTrue();
        Accounts.expectPublicUser(json.get("data"), account.email(), account.name());
        assertThat(json.get("data")).isEqualTo(account.user());
    }

    @Test
    void answersAuthRequiredWithoutAToken() throws Exception {
        Json.expectError(mvc.perform(get("/api/v1/auth/me")), 401, "AUTH_REQUIRED");
    }

    @Test
    void answersAuthInvalidTokenForAMalformedHeader() throws Exception {
        Json.expectError(mvc.perform(get("/api/v1/auth/me").header("Authorization", "Basic abc")),
                401, "AUTH_INVALID_TOKEN");
    }

    @Test
    void answersAuthTokenExpiredForAnExpiredToken() throws Exception {
        var account = Accounts.signup(mvc);
        var id = UUID.fromString(account.user().get("id").asString());
        var past = Clock.fixed(Instant.now().minusSeconds(5), ZoneOffset.UTC);
        var token = JwtServiceFactory.create(SECRET, JwtLifetime.parse("1s"), past)
                .sign(new AuthUser(id, account.email()));
        var error = Json.expectError(mvc.perform(bearer(get("/api/v1/auth/me"), token)), 401, "AUTH_TOKEN_EXPIRED");
        assertThat(error.get("message").asString()).isEqualTo("Your session has expired");
    }

    @Test
    void answersAuthInvalidTokenWhenTheAccountWasDeleted() throws Exception {
        var account = Accounts.signup(mvc);
        jdbc.update("DELETE FROM users");
        var error = Json.expectError(mvc.perform(bearer(get("/api/v1/auth/me"), account.token())),
                401, "AUTH_INVALID_TOKEN");
        assertThat(error.get("message").asString()).isEqualTo("This account no longer exists");
    }
}
