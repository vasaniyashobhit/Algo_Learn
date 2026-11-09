package com.algolearn.common.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import com.algolearn.support.Json;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.context.request.ServletWebRequest;

/** Query value rules, the issue collector and the raw JSON body. */
class QueryValuesTest {

    @Test
    void integersFollowZodCoercion() {
        var query = new LinkedMultiValueMap<String, String>();
        query.add("a", "Infinity");
        query.add("b", "-Infinity");
        query.add("c", "");
        query.add("d", "7");
        var issues = new Issues();
        var values = new QueryValues(query, issues);
        assertThat(values.integer("a", 1, 9, null)).isEmpty();
        assertThat(values.integer("b", 1, 9, null)).isEmpty();
        assertThat(values.integer("c", 1, 9, 4)).contains(4);
        assertThat(values.integer("d", 1, 9, null)).contains(7);
        assertThat(values.integer("missing", 1, 9, null)).isEmpty();
        assertThat(issues.list()).containsExactly(
                new FieldIssue("query.a", "Invalid input: expected number, received Infinity"),
                new FieldIssue("query.b", "Invalid input: expected number, received -Infinity"));
    }

    @Test
    void issuesThrowOneValidationFailedWithEveryProblem() {
        var issues = new Issues();
        issues.throwIfAny();
        issues.add("body.a", "x").add("body.b", "y");
        assertThat(issues.isEmpty()).isFalse();
        var e = catchThrowableOfType(ValidationException.class, issues::throwIfAny);
        assertThat(e.code().name()).isEqualTo("VALIDATION_FAILED");
        assertThat(e.getMessage()).isEqualTo("Request validation failed");
        assertThat(e.details()).isEqualTo(List.of(new FieldIssue("body.a", "x"), new FieldIssue("body.b", "y")));
    }

    @Test
    void namesJsonTypesLikeZod() {
        assertThat(JsonBody.typeOf(null)).isEqualTo("undefined");
        assertThat(JsonBody.typeOf(Json.parse("null"))).isEqualTo("null");
        assertThat(JsonBody.typeOf(Json.parse("[]"))).isEqualTo("array");
        assertThat(JsonBody.typeOf(Json.parse("{}"))).isEqualTo("object");
        assertThat(JsonBody.typeOf(Json.parse("\"s\""))).isEqualTo("string");
        assertThat(JsonBody.typeOf(Json.parse("true"))).isEqualTo("boolean");
        assertThat(JsonBody.typeOf(Json.parse("1"))).isEqualTo("number");
    }

    @Test
    void resolvesOnlyJsonBodies() throws Exception {
        var resolver = new JsonBodyResolver(Json.MAPPER);
        var json = new MockHttpServletRequest("POST", "/x");
        json.setContentType("application/json; charset=utf-8");
        json.setContent("{\"a\":1}".getBytes());
        assertThat(resolver.resolveArgument(null, null, new ServletWebRequest(json), null).node().get("a").asInt())
                .isEqualTo(1);
        var text = new MockHttpServletRequest("POST", "/x");
        text.setContentType("text/plain");
        text.setContent("{\"a\":1}".getBytes());
        assertThat(resolver.resolveArgument(null, null, new ServletWebRequest(text), null).node()).isNull();
        var empty = new MockHttpServletRequest("POST", "/x");
        empty.setContentType("application/json");
        assertThat(resolver.resolveArgument(null, null, new ServletWebRequest(empty), null).node()).isNull();
        assertThat(JsonBodyResolver.isJson("not a type")).isFalse();
        assertThat(JsonBodyResolver.isJson(null)).isFalse();
    }
}
