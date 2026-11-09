package com.algolearn.health;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.algolearn.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** The database probe reports "down" (as when Postgres stops after startup). */
class HealthDbDownIT extends IntegrationTest {

    @MockitoBean
    private DbProbe probe;

    HealthDbDownIT(MockMvc mvc) {
        super(mvc);
    }

    @BeforeEach
    void dbIsDown() {
        when(probe.state()).thenReturn("down");
    }

    @Test
    void livenessStillAnswers200Degraded() throws Exception {
        mvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("degraded"))
                .andExpect(jsonPath("$.data.db").value("down"));
    }

    @Test
    void readinessAnswers503DbUnavailable() throws Exception {
        mvc.perform(get("/api/v1/health/ready"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("DB_UNAVAILABLE"))
                .andExpect(jsonPath("$.error.message").value("Database is not connected"));
    }
}
