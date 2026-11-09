package com.algolearn.ratelimit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.algolearn.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@TestPropertySource(properties = "algolearn.rate-limit.global.limit=2")
class GlobalRateLimitIT extends IntegrationTest {

    GlobalRateLimitIT(MockMvc mvc) {
        super(mvc);
    }

    @Test
    void returnsTheRateLimitedShapeOnceTheLimitIsExceeded() throws Exception {
        var ip = "10.0.0.7";
        mvc.perform(get("/api/v1/health").with(r -> remote(r, ip))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/meta/tags").with(r -> remote(r, ip))).andExpect(status().isOk());
        var result = mvc.perform(get("/api/v1/health").with(r -> remote(r, ip)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(header().string("RateLimit-Policy", "2;w=60"))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.error.message").value("Too many requests, please slow down"))
                .andExpect(jsonPath("$.error.details.retryAfterSeconds").value(60))
                .andReturn();
        mvc.perform(get("/api/v1/health").with(r -> remote(r, ip)))
                .andExpect(jsonPath("$.error.requestId").isString());
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getHeader("X-Request-Id")).isNotBlank();
    }

    @Test
    void countsEachIpSeparately() throws Exception {
        mvc.perform(get("/api/v1/health").with(r -> remote(r, "10.0.0.8"))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/health").with(r -> remote(r, "10.0.0.9"))).andExpect(status().isOk());
    }

    private static org.springframework.mock.web.MockHttpServletRequest remote(
            org.springframework.mock.web.MockHttpServletRequest request, String ip) {
        request.setRemoteAddr(ip);
        return request;
    }
}
