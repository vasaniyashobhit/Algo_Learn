package com.algolearn.users;

import static com.algolearn.support.Accounts.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import com.algolearn.support.Accounts;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Json;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Legacy users.me.routes.test.js. */
class UsersMeIT extends DatabaseTest {

    UsersMeIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    private ResultActions patchMe(String token, Object body) throws Exception {
        return mvc.perform(bearer(patch("/api/v1/users/me"), token).contentType(MediaType.APPLICATION_JSON)
                .content(Json.MAPPER.writeValueAsString(body)));
    }

    @Test
    void getReturnsTheCurrentUserWithoutPasswordHash() throws Exception {
        var account = Accounts.signup(mvc);
        var json = Json.body(mvc.perform(bearer(get("/api/v1/users/me"), account.token())));
        Accounts.expectPublicUser(json.get("data"), account.email(), account.name());
    }

    @Test
    void getAnswers401WithoutOrWithAForgedToken() throws Exception {
        Json.expectError(mvc.perform(get("/api/v1/users/me")), 401, "AUTH_REQUIRED");
        Json.expectError(mvc.perform(bearer(get("/api/v1/users/me"), "aaa.bbb.ccc")), 401, "AUTH_INVALID_TOKEN");
    }

    @Test
    void patchUpdatesTheNameAndReturnsTheProfile() throws Exception {
        var account = Accounts.signup(mvc);
        var result = patchMe(account.token(), Map.of("name", "  Grace Hopper "));
        assertThat(result.andReturn().getResponse().getStatus()).isEqualTo(200);
        Accounts.expectPublicUser(Json.body(result).get("data"), account.email(), "Grace Hopper");
        var me = Json.body(mvc.perform(bearer(get("/api/v1/users/me"), account.token())));
        assertThat(me.get("data").get("name").asString()).isEqualTo("Grace Hopper");
    }

    @Test
    void patchAnswers400ForABadName() throws Exception {
        var account = Accounts.signup(mvc);
        var error = Json.expectError(patchMe(account.token(), Map.of("name", "x")), 400, "VALIDATION_FAILED");
        assertThat(Json.issues(error)).containsExactly("body.name: Name must be at least 2 characters");
    }

    @Test
    void patchRejectsAnyFieldOtherThanName() throws Exception {
        var account = Accounts.signup(mvc);
        var error = Json.expectError(patchMe(account.token(), Map.of("name", "Valid", "email", "evil@example.com")),
                400, "VALIDATION_FAILED");
        assertThat(Json.issues(error)).containsExactly("body: Unrecognized key: \"email\"");
    }

    @Test
    void patchAnswers401BeforeValidating() throws Exception {
        var request = patch("/api/v1/users/me").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"x\"}");
        Json.expectError(mvc.perform(request), 401, "AUTH_REQUIRED");
    }

    @Test
    void deletedAccountsAreAnInvalidToken() throws Exception {
        var account = Accounts.signup(mvc);
        jdbc.update("DELETE FROM users");
        Json.expectError(patchMe(account.token(), Map.of("name", "Ghost")), 401, "AUTH_INVALID_TOKEN");
        Json.expectError(mvc.perform(bearer(get("/api/v1/users/me"), account.token())), 401, "AUTH_INVALID_TOKEN");
    }
}
