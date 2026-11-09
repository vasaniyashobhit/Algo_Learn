package com.algolearn.common.error.mapping;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.algolearn.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

class ValidationMappingIT extends IntegrationTest {

    ValidationMappingIT(MockMvc mvc) {
        super(mvc);
    }

    @Test
    void validBodiesReachTheControllerAndGetTheSuccessEnvelope() throws Exception {
        mvc.perform(post("/api/v1/__test/body").contentType("application/json")
                        .content("{\"email\":\"a@b.test\",\"count\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("a@b.test"))
                .andExpect(jsonPath("$.meta.echo").value(true));
    }

    @Test
    void invalidBodiesListBodyPrefixedFields() throws Exception {
        mvc.perform(post("/api/v1/__test/body").contentType("application/json")
                        .content("{\"email\":\"nope\",\"count\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.error.message").value("Request validation failed"))
                .andExpect(jsonPath("$.error.details.length()").value(2))
                .andExpect(jsonPath("$.error.details[?(@.field == 'body.email')]").exists())
                .andExpect(jsonPath("$.error.details[?(@.field == 'body.count')]").exists());
    }

    @Test
    void unreadableBodiesAreMalformed() throws Exception {
        mvc.perform(post("/api/v1/__test/body").contentType("application/json").content("{\"count\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].field").value("body"));
    }

    @Test
    void invalidParamsUseParamsAndQueryPrefixes() throws Exception {
        mvc.perform(get("/api/v1/__test/params/0").param("limit", "99"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[?(@.field == 'params.id')]").exists())
                .andExpect(jsonPath("$.error.details[?(@.field == 'query.limit')]").exists());
        mvc.perform(get("/api/v1/__test/params/3").param("limit", "4"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").value(7));
    }

    @Test
    void typeMismatchAndMissingParamsAreValidationFailed() throws Exception {
        mvc.perform(get("/api/v1/__test/params/x").param("limit", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].field").value("params.id"))
                .andExpect(jsonPath("$.error.details[0].message").value("Invalid value for id"));
        mvc.perform(get("/api/v1/__test/params/1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].field").value("query.limit"));
    }
}
