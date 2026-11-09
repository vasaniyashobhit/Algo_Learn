package com.algolearn.common.error;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.algolearn.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

class ErrorHandlingIT extends IntegrationTest {

    ErrorHandlingIT(MockMvc mvc) {
        super(mvc);
    }

    @Test
    void sendsTheExactSharedShapeForAnAppExceptionWithTheRequestId() throws Exception {
        var result = mvc.perform(get("/api/v1/__test/conflict")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("PRACTICE_ITEM_EXISTS"))
                .andExpect(jsonPath("$.error.message").value("Already in your list"))
                .andExpect(jsonPath("$.error.details.problemId").value("1/A"))
                .andExpect(jsonPath("$.error.stack").value(containsString("Already in your list")))
                .andReturn();
        var id = result.getResponse().getHeader("X-Request-Id");
        mvc.perform(get("/api/v1/__test/conflict").header("X-Request-Id", "abc-1"))
                .andExpect(jsonPath("$.error.requestId").value("abc-1"));
        org.assertj.core.api.Assertions.assertThat(id).isNotBlank();
    }

    @Test
    void unknownErrorsGetAGenericMessageAnd500() throws Exception {
        mvc.perform(get("/api/v1/__test/unknown")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Something went wrong on our side"))
                .andExpect(jsonPath("$.error.details").value(nullValue()));
    }

    @Test
    void lostDatabaseConnectionsAre503DbUnavailable() throws Exception {
        mvc.perform(get("/api/v1/__test/db")).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("DB_UNAVAILABLE"));
    }

    @Test
    void unknownRoutesAnswer404RouteNotFoundWithoutTheQuery() throws Exception {
        mvc.perform(get("/api/v1/meta/nope")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("ROUTE_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("Route GET /api/v1/meta/nope not found"))
                .andExpect(jsonPath("$.error.details").value(nullValue()))
                .andExpect(jsonPath("$.error.stack").isString());
        mvc.perform(post("/missing?token=abc")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.message").value("Route POST /missing not found"));
        mvc.perform(get("/nowhere")).andExpect(jsonPath("$.error.code").value("ROUTE_NOT_FOUND"));
    }

    @Test
    void unsupportedMethodsAlsoAnswerRouteNotFound() throws Exception {
        mvc.perform(delete("/api/v1/health")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("ROUTE_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("Route DELETE /api/v1/health not found"));
    }

    @Test
    void malformedJsonIsValidationFailedEvenOnRoutesWithoutABody() throws Exception {
        for (var body : new String[] {"{bad", "{\"a\":", "\"abc\""}) {
            mvc.perform(post("/api/v1/health").contentType("application/json").content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"))
                    .andExpect(jsonPath("$.error.message").value("Malformed JSON body"))
                    .andExpect(jsonPath("$.error.details[0].field").value("body"))
                    .andExpect(jsonPath("$.error.details[0].message").value("Body is not valid JSON"));
        }
    }

    @Test
    void rejectsJsonBodiesOverOneMegabyteWith413() throws Exception {
        var big = "{\"text\":\"" + "a".repeat(1_100_000) + "\"}";
        mvc.perform(post("/api/v1/health").contentType("application/json").content(big))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.error.code").value("FILE_TOO_LARGE"))
                .andExpect(content().contentTypeCompatibleWith("application/json"));
    }
}
