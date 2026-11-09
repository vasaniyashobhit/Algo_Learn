package com.algolearn.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import com.algolearn.common.validation.JsonBody;
import com.algolearn.support.Json;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy updateMeSchema (strict: name only). */
class UpdateMeRequestTest {

    private static Object details(String json) {
        var body = new JsonBody(json == null ? null : Json.parse(json));
        return catchThrowableOfType(ValidationException.class, () -> UpdateMeRequest.parse(body)).details();
    }

    @Test
    void trimsTheName() {
        assertThat(UpdateMeRequest.parse(new JsonBody(Json.parse("{\"name\":\"  Grace \"}"))).name())
                .isEqualTo("Grace");
    }

    @Test
    void reportsUnrecognizedKeysAfterTheNameRules() {
        assertThat(details("{\"name\":\"x\",\"email\":\"e\"}")).isEqualTo(List.of(
                new FieldIssue("body.name", "Name must be at least 2 characters"),
                new FieldIssue("body", "Unrecognized key: \"email\"")));
        assertThat(details("{\"name\":\"Valid\",\"a\":1,\"b\":2}"))
                .isEqualTo(List.of(new FieldIssue("body", "Unrecognized keys: \"a\", \"b\"")));
    }

    @Test
    void requiresAName() {
        assertThat(details("{}")).isEqualTo(List.of(new FieldIssue("body.name", "Name is required")));
        assertThat(details("{\"name\":5}")).isEqualTo(List.of(new FieldIssue("body.name", "Name is required")));
    }

    @Test
    void rejectsBodiesThatAreNotObjects() {
        assertThat(details(null)).isEqualTo(
                List.of(new FieldIssue("body", "Invalid input: expected object, received undefined")));
        assertThat(details("[1]")).isEqualTo(
                List.of(new FieldIssue("body", "Invalid input: expected object, received array")));
    }
}
