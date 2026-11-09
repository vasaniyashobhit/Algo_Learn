package com.algolearn.auth;

import static com.algolearn.support.Accounts.bearer;
import static com.algolearn.support.Accounts.postJson;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.support.Accounts;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Json;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Legacy auth.login.routes.test.js. */
class LoginIT extends DatabaseTest {

    LoginIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    private ResultActions login(Object body) throws Exception {
        return mvc.perform(postJson("/api/v1/auth/login", body));
    }

    @Test
    void answers200WithTokenAndUserAndTheTokenWorks() throws Exception {
        var account = Accounts.signup(mvc);
        var result = login(Map.of("email", " " + account.email().toUpperCase() + " ", "password", account.password()));
        assertThat(result.andReturn().getResponse().getStatus()).isEqualTo(200);
        var data = Json.body(result).get("data");
        Accounts.expectPublicUser(data.get("user"), account.email(), account.name());
        var me = mvc.perform(bearer(get("/api/v1/auth/me"), data.get("token").asString())).andReturn();
        assertThat(me.getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void answers401InvalidCredentialsForAWrongPassword() throws Exception {
        var account = Accounts.signup(mvc);
        var error = Json.expectError(login(Map.of("email", account.email(), "password", "wrong1234")),
                401, "AUTH_INVALID_CREDENTIALS");
        assertThat(error.get("message").asString()).isEqualTo("Invalid email or password");
    }

    @Test
    void answersExactlyTheSameForAnUnknownEmail() throws Exception {
        var account = Accounts.signup(mvc);
        var wrong = Json.expectError(login(Map.of("email", account.email(), "password", "wrong1234")),
                401, "AUTH_INVALID_CREDENTIALS");
        var unknown = Json.expectError(login(Map.of("email", "ghost@example.com", "password", account.password())),
                401, "AUTH_INVALID_CREDENTIALS");
        assertThat(unknown.get("message")).isEqualTo(wrong.get("message"));
    }

    @Test
    void answers400ForAMissingPassword() throws Exception {
        var error = Json.expectError(login(Map.of("email", "a@b.co")), 400, "VALIDATION_FAILED");
        assertThat(Json.issues(error)).containsExactly("body.password: Password is required");
    }

    @Test
    void doesNotAcceptOperatorObjectsAsTheEmail() throws Exception {
        var error = Json.expectError(login(Map.of("email", Map.of("$ne", ""), "password", "secret123")),
                400, "VALIDATION_FAILED");
        assertThat(Json.fields(error).getFirst()).isEqualTo("body.email");
    }
}
