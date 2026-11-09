package com.algolearn.auth;

import static com.algolearn.support.Accounts.postJson;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.algolearn.support.Accounts;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Json;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy auth.signup.routes.test.js. */
class SignupIT extends DatabaseTest {

    SignupIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    private org.springframework.test.web.servlet.ResultActions signup(Object body) throws Exception {
        return mvc.perform(postJson("/api/v1/auth/signup", body));
    }

    @Test
    void createsTheAccountAndAnswers201WithTokenAndUser() throws Exception {
        var body = new HashMap<>(Accounts.signupBody());
        body.put("email", "  New.Coder@Example.COM ");
        var result = signup(body);
        var json = Json.body(result);
        assertThat(result.andReturn().getResponse().getStatus()).isEqualTo(201);
        assertThat(json.get("success").asBoolean()).isTrue();
        assertThat(json.get("data").get("token").asString()).matches("^[\\w-]+\\.[\\w-]+\\.[\\w-]+$");
        Accounts.expectPublicUser(json.get("data").get("user"), "new.coder@example.com", (String) body.get("name"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE email = 'new.coder@example.com'",
                Integer.class)).isEqualTo(1);
    }

    @Test
    void answers409AuthEmailTakenCaseInsensitively() throws Exception {
        var body = new HashMap<>(Accounts.signupBody());
        signup(body);
        body.put("email", ((String) body.get("email")).toUpperCase());
        var error = Json.expectError(signup(body), 409, "AUTH_EMAIL_TAKEN");
        assertThat(error.get("message").asString()).isEqualTo("An account with this email already exists");
        assertThat(error.get("details").isNull()).isTrue();
    }

    @Test
    void answers400WithEveryFieldProblem() throws Exception {
        var error = Json.expectError(signup(Map.of("email", "nope", "password", "abcdefgh", "name", "A")),
                400, "VALIDATION_FAILED");
        assertThat(Json.issues(error)).containsExactly(
                "body.email: Invalid email address",
                "body.password: Password must contain at least one digit",
                "body.name: Name must be at least 2 characters");
    }

    @Test
    void answers400ForAnEmptyBody() throws Exception {
        var error = Json.expectError(mvc.perform(post("/api/v1/auth/signup")), 400, "VALIDATION_FAILED");
        assertThat(Json.issues(error)).containsExactly("body: Invalid input: expected object, received undefined");
        var array = Json.expectError(signup(new int[0]), 400, "VALIDATION_FAILED");
        assertThat(Json.fields(array)).containsExactly("body");
    }

    @Test
    void answers400ForMalformedJson() throws Exception {
        var request = post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content("{\"email\":");
        var result = mvc.perform(request);
        Json.expectError(result, 400, "VALIDATION_FAILED");
    }

    @Test
    void ignoresUnknownKeysAndHashesThePassword() throws Exception {
        var body = new HashMap<>(Accounts.signupBody());
        body.put("role", "admin");
        assertThat(signup(body).andReturn().getResponse().getStatus()).isEqualTo(201);
        var hash = jdbc.queryForObject("SELECT password_hash FROM users", String.class);
        assertThat(hash).startsWith("$2b$04$").isNotEqualTo(body.get("password"));
    }
}
