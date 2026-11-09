package com.algolearn.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.common.error.mapping.BodyErrorMapper;
import com.algolearn.common.error.mapping.ExceptionMapper;
import com.algolearn.common.web.RequestIdFilter;
import com.algolearn.support.TestProperties;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

class ErrorResponseWriterTest {

    private final JsonMapper json = JsonMapper.builder().build();
    private final ExceptionMapper mapper = new ExceptionMapper(List.of(new BodyErrorMapper()));

    private ErrorResponseWriter writer(boolean production) {
        return new ErrorResponseWriter(mapper, json, TestProperties.app(production));
    }

    private static MockHttpServletRequest request() {
        var request = new MockHttpServletRequest("GET", "/boom");
        request.setAttribute(RequestIdFilter.ATTRIBUTE, "req-1");
        return request;
    }

    @Test
    void developmentSendsTheSharedShapeWithAStack() {
        var error = new ConflictException(ErrorCode.PRACTICE_ITEM_EXISTS, "Already in your list",
                Map.of("problemId", "1/A"));
        var entity = writer(false).toResponse(error, request());
        assertThat(entity.getStatusCode().value()).isEqualTo(409);
        var body = entity.getBody().error();
        assertThat(entity.getBody().success()).isFalse();
        assertThat(body.code()).isEqualTo("PRACTICE_ITEM_EXISTS");
        assertThat(body.message()).isEqualTo("Already in your list");
        assertThat(body.details()).isEqualTo(Map.of("problemId", "1/A"));
        assertThat(body.requestId()).isEqualTo("req-1");
        assertThat(body.stack()).contains("Already in your list");
    }

    @Test
    void developmentIncludesTheOriginalStackForUnknownErrors() {
        var body = writer(false).toResponse(new IllegalStateException("db exploded"), request()).getBody().error();
        assertThat(body.code()).isEqualTo("INTERNAL_ERROR");
        assertThat(body.message()).isEqualTo("Something went wrong on our side");
        assertThat(body.stack()).contains("db exploded");
    }

    @Test
    void productionHidesStacksAndInternalMessages() throws Exception {
        var response = new MockHttpServletResponse();
        var error = new IllegalStateException("jdbc:postgresql://admin:hunter2@db refused");
        writer(true).write(error, request(), response);
        assertThat(response.getStatus()).isEqualTo(500);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat(response.getContentAsString()).isEqualTo("{\"success\":false,\"error\":{\"code\":\"INTERNAL_ERROR\","
                + "\"message\":\"Something went wrong on our side\",\"details\":null,\"requestId\":\"req-1\"}}");
    }

    @Test
    void productionKeepsTypedMessagesAndDetailsButNoStack() {
        var error = new NotFoundException(ErrorCode.PROBLEM_NOT_FOUND, "Problem 9999/Z not found",
                Map.of("id", "9999/Z"));
        var body = writer(true).toResponse(error, request()).getBody().error();
        assertThat(body.message()).isEqualTo("Problem 9999/Z not found");
        assertThat(body.details()).isEqualTo(Map.of("id", "9999/Z"));
        assertThat(body.stack()).isNull();
    }

    @Test
    void requestIdIsNullOutsideAFilteredRequestAndCommittedResponsesAreLeftAlone() throws Exception {
        var plain = new MockHttpServletRequest("GET", "/x");
        assertThat(writer(true).toResponse(new NotFoundException(), plain).getBody().error().requestId()).isNull();
        var response = new MockHttpServletResponse();
        response.setCommitted(true);
        writer(true).write(new NotFoundException(), plain, response);
        assertThat(response.getContentAsString()).isEmpty();
    }
}
