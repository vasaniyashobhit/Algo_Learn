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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** The strict auth limit end to end (limit 3 here): shared by signup and login, never on /auth/me. */
@TestPropertySource(properties = {"algolearn.rate-limit.auth.limit=3", "algolearn.rate-limit.auth.window=1m"})
class AuthRateLimitIT extends DatabaseTest {

    AuthRateLimitIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    private int badLogin() throws Exception {
        return mvc.perform(postJson("/api/v1/auth/login", Map.of("email", "a@b.co", "password", "x")))
                .andReturn().getResponse().getStatus();
    }

    @Test
    void sharesOneCounterAndLeavesTheRestOfTheApiAlone() throws Exception {
        var account = Accounts.signup(mvc);
        assertThat(mvc.perform(postJson("/api/v1/auth/signup", Map.of())).andReturn().getResponse().getStatus())
                .isEqualTo(400);
        assertThat(badLogin()).isEqualTo(401);
        var limited = mvc.perform(postJson("/api/v1/auth/login", Map.of("email", "a@b.co", "password", "x")));
        var error = Json.expectError(limited, 429, "RATE_LIMITED");
        assertThat(error.get("details")).isEqualTo(Json.parse("{\"retryAfterSeconds\":60}"));
        assertThat(mvc.perform(postJson("/api/v1/auth/signup", Map.of())).andReturn().getResponse().getStatus())
                .isEqualTo(429);
        assertThat(mvc.perform(get("/api/v1/health")).andReturn().getResponse().getStatus()).isEqualTo(200);
        for (var i = 0; i < 5; i++) {
            var me = mvc.perform(bearer(get("/api/v1/auth/me"), account.token())).andReturn();
            assertThat(me.getResponse().getStatus()).isEqualTo(200);
        }
        assertThat(mvc.perform(get("/api/v1/auth/me")).andReturn().getResponse().getStatus()).isEqualTo(401);
    }
}
