package com.algolearn.common.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.algolearn.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

class WebFiltersIT extends IntegrationTest {

    private static final String UUID = "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

    WebFiltersIT(MockMvc mvc) {
        super(mvc);
    }

    private String requestId(String incoming) throws Exception {
        var request = get("/api/v1/meta/tags");
        if (incoming != null) {
            request.header("X-Request-Id", incoming);
        }
        return mvc.perform(request).andReturn().getResponse().getHeader("X-Request-Id");
    }

    @Test
    void generatesADifferentUuidPerRequestAndEchoesIt() throws Exception {
        var first = requestId(null);
        assertThat(first).matches(UUID);
        assertThat(requestId(null)).matches(UUID).isNotEqualTo(first);
    }

    @Test
    void reusesASafeIncomingIdAndReplacesUnsafeOrOversizedOnes() throws Exception {
        assertThat(requestId("proxy-abc.123")).isEqualTo("proxy-abc.123");
        assertThat(requestId("<script>")).matches(UUID);
        assertThat(requestId("a".repeat(65))).matches(UUID);
    }

    @Test
    void appliesHelmetStyleSecurityHeaders() throws Exception {
        var response = mvc.perform(get("/api/v1/health")).andReturn().getResponse();
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeader("X-Frame-Options")).isEqualTo("SAMEORIGIN");
        assertThat(response.getHeader("Content-Security-Policy")).startsWith("default-src 'self'");
        assertThat(response.getHeader("X-Powered-By")).isNull();
    }

    @Test
    void allowsTheConfiguredClientOriginOnly() throws Exception {
        mvc.perform(get("/api/v1/health").header("Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(header().string("Access-Control-Expose-Headers", containsString("X-Request-Id")));
        var other = mvc.perform(get("/api/v1/health").header("Origin", "https://evil.test")).andReturn();
        assertThat(other.getResponse().getHeader("Access-Control-Allow-Origin")).isNotEqualTo("https://evil.test");
    }

    @Test
    void answersPreflightsWith204() throws Exception {
        mvc.perform(options("/api/v1/auth/login").header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type,authorization"))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE"))
                .andExpect(header().string("Access-Control-Allow-Headers", "content-type,authorization"))
                .andExpect(header().exists("X-Request-Id"));
    }

    @Test
    void sendsDraft7RateLimitHeadersOnApiRoutes() throws Exception {
        mvc.perform(get("/api/v1/health"))
                .andExpect(header().string("RateLimit-Policy", "1000;w=60"))
                .andExpect(header().string("RateLimit", containsString("limit=1000, remaining=")))
                .andExpect(header().doesNotExist("X-RateLimit-Limit"));
        mvc.perform(get("/nowhere")).andExpect(header().doesNotExist("RateLimit"));
    }
}
