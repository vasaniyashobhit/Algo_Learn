package com.algolearn.health;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.algolearn.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

/** With the Testcontainers database connected. */
class HealthIT extends IntegrationTest {

    static final String ISO = "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$";

    HealthIT(MockMvc mvc) {
        super(mvc);
    }

    @Test
    void reportsOkAndDbUpWithUptimeAndIsoTime() throws Exception {
        mvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(header().exists("X-Request-Id"))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ok"))
                .andExpect(jsonPath("$.data.db").value("up"))
                .andExpect(jsonPath("$.data.uptime").value(greaterThanOrEqualTo(0.0)))
                .andExpect(jsonPath("$.data.time").value(matchesPattern(ISO)))
                .andExpect(jsonPath("$.meta").doesNotExist());
    }

    @Test
    void isReady() throws Exception {
        mvc.perform(get("/api/v1/health/ready"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ok"))
                .andExpect(jsonPath("$.data.db").value("up"));
    }
}
