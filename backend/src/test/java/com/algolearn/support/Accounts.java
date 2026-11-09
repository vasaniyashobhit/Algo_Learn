package com.algolearn.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;

/** Legacy tests/helpers/auth.js: signup bodies, signing up through the API, bearer headers. */
public final class Accounts {

    private static final AtomicInteger SEQ = new AtomicInteger();

    private Accounts() {
    }

    /** A valid signup body with a unique email: coderN@example.com / secret123 / "Coder N". */
    public static Map<String, Object> signupBody() {
        var n = SEQ.incrementAndGet();
        return Map.of("email", "coder" + n + "@example.com", "password", "secret123", "name", "Coder " + n);
    }

    public static MockHttpServletRequestBuilder postJson(String url, Object body) {
        return post(url).contentType(MediaType.APPLICATION_JSON).content(Json.MAPPER.writeValueAsString(body));
    }

    /** Signs up (201 expected) and returns the token, the user and what was sent. */
    public static Account signup(MockMvc mvc) throws Exception {
        var body = signupBody();
        var result = mvc.perform(postJson("/api/v1/auth/signup", body)).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        var data = Json.body(result).get("data");
        return new Account(data.get("token").asString(), data.get("user"), body);
    }

    public static <T extends MockHttpServletRequestBuilder> T bearer(T request, String token) {
        request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        return request;
    }

    /** Legacy expectPublicUser: exactly the public fields, no password hash. */
    public static void expectPublicUser(JsonNode user, String email, String name) {
        assertThat(user.propertyNames()).containsExactly("id", "email", "name", "cfRating", "cfMaxRating",
                "lastSyncedAt", "createdAt", "updatedAt", "cfHandle");
        assertThat(user.get("id").asString()).matches("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
        assertThat(user.get("email").asString()).isEqualTo(email);
        assertThat(user.get("name").asString()).isEqualTo(name);
        for (var field : new String[] {"cfHandle", "cfRating", "cfMaxRating", "lastSyncedAt"}) {
            assertThat(user.get(field).isNull()).as(field).isTrue();
        }
        assertThat(user.get("createdAt").asString()).matches("^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z$");
        assertThat(user.get("updatedAt").isString()).isTrue();
    }

    /** A signed-up account. */
    public record Account(String token, JsonNode user, Map<String, Object> body) {

        public String email() {
            return (String) body.get("email");
        }

        public String password() {
            return (String) body.get("password");
        }

        public String name() {
            return (String) body.get("name");
        }
    }
}
