package com.algolearn.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Reads MockMvc responses as JSON trees and checks the shared error envelope. */
public final class Json {

    public static final JsonMapper MAPPER = JsonMapper.builder().build();

    private Json() {
    }

    public static JsonNode body(ResultActions result) throws Exception {
        return body(result.andReturn());
    }

    public static JsonNode body(MvcResult result) throws Exception {
        return MAPPER.readTree(result.getResponse().getContentAsString());
    }

    public static JsonNode parse(String json) {
        return MAPPER.readTree(json);
    }

    /** The {@code id} of every item in {@code data}. */
    public static List<String> ids(JsonNode body) {
        var ids = new ArrayList<String>();
        body.get("data").forEach(item -> ids.add(item.get("id").asString()));
        return ids;
    }

    /** Legacy expectErrorShape: status, code, details and the request id (stack outside production). */
    public static JsonNode expectError(ResultActions result, int status, String code) throws Exception {
        var response = result.andReturn().getResponse();
        assertThat(response.getStatus()).isEqualTo(status);
        var error = body(result).get("error");
        assertThat(body(result).get("success").asBoolean()).isFalse();
        assertThat(error.get("code").asString()).isEqualTo(code);
        assertThat(error.get("message").isString()).isTrue();
        assertThat(error.get("requestId").asString()).isEqualTo(response.getHeader("X-Request-Id"));
        assertThat(error.get("stack").isString()).isTrue();
        return error;
    }

    /** The error's {@code details} as {@code field: message} lines, in order. */
    public static List<String> issues(JsonNode error) {
        var lines = new ArrayList<String>();
        error.get("details").forEach(d -> lines.add(d.get("field").asString() + ": " + d.get("message").asString()));
        return lines;
    }

    public static List<String> fields(JsonNode error) {
        var fields = new ArrayList<String>();
        error.get("details").forEach(d -> fields.add(d.get("field").asString()));
        return fields;
    }
}
