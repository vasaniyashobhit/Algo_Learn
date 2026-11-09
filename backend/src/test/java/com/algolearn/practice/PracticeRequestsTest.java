package com.algolearn.practice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import com.algolearn.common.validation.JsonBody;
import com.algolearn.practice.PracticeRequests.AddPractice;
import com.algolearn.practice.PracticeRequests.UpdatePractice;
import com.algolearn.support.Json;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.util.LinkedMultiValueMap;

/** Legacy practice.schema.test.js (plus the exact zod messages). */
class PracticeRequestsTest {

    private static JsonBody body(String json) {
        return new JsonBody(Json.parse(json));
    }

    private static List<String> issues(Executable call) {
        var issues = new java.util.ArrayList<String>();
        assertThatThrownBy(call::execute).isInstanceOfSatisfying(ValidationException.class, e -> {
            @SuppressWarnings("unchecked")
            var list = (List<FieldIssue>) e.details();
            list.forEach(i -> issues.add(i.field() + ": " + i.message()));
        });
        return issues;
    }

    private static LinkedMultiValueMap<String, String> query(String... values) {
        var map = new LinkedMultiValueMap<String, String>();
        for (var value : values) {
            map.add("status", value);
        }
        return map;
    }

    @Test
    void listQueryAcceptsAKnownStatusNothingOrABlank() {
        assertThat(PracticeRequests.parseStatus(query("todo"))).isEqualTo("todo");
        assertThat(PracticeRequests.parseStatus(query())).isNull();
        assertThat(PracticeRequests.parseStatus(query(""))).isNull();
    }

    @Test
    void listQueryRejectsAnUnknownStatus() {
        assertThat(issues(() -> PracticeRequests.parseStatus(query("done"))))
                .containsExactly("query.status: Invalid option: expected one of \"todo\"|\"solved\"|\"skipped\"");
        assertThat(issues(() -> PracticeRequests.parseStatus(query("todo", "solved")))).hasSize(1);
    }

    @Test
    void addUpperCasesTheIndexAndDefaultsAddedFromToManual() {
        assertThat(PracticeRequests.parseAdd(body("{\"problemId\":\" 4/b1 \"}")))
                .isEqualTo(new AddPractice("4/B1", "manual"));
        assertThat(PracticeRequests.parseAdd(body("{\"problemId\":\"1/A\",\"addedFrom\":\"stuck\"}")))
                .isEqualTo(new AddPractice("1/A", "stuck"));
    }

    @Test
    void addRejectsBadIdsUnknownOriginsAndExtraFields() {
        assertThat(issues(() -> PracticeRequests.parseAdd(body("{\"problemId\":\"1-A\"}"))))
                .containsExactly("body.problemId: " + PracticeFields.BAD_ID);
        assertThat(issues(() -> PracticeRequests.parseAdd(body("{\"problemId\":\"1/ABCD\"}")))).hasSize(1);
        assertThat(issues(() -> PracticeRequests.parseAdd(body("{}"))))
                .containsExactly("body.problemId: Invalid input: expected string, received undefined");
        assertThat(issues(() -> PracticeRequests.parseAdd(body("{\"problemId\":\"1/A\",\"addedFrom\":\"friend\"}"))))
                .containsExactly("body.addedFrom: Invalid option: expected one of \"recommendation\"|\"similar\"|"
                        + "\"stuck\"|\"manual\"");
        assertThat(issues(() -> PracticeRequests.parseAdd(body("{\"problemId\":\"1/A\",\"status\":\"solved\"}"))))
                .containsExactly("body: Unrecognized key: \"status\"");
        assertThat(issues(() -> PracticeRequests.parseAdd(new JsonBody(null))))
                .containsExactly("body: Invalid input: expected object, received undefined");
    }

    @Test
    void updateNeedsAKnownStatusAndNothingElse() {
        assertThat(PracticeRequests.parseUpdate("1", "a", body("{\"status\":\"skipped\"}")))
                .isEqualTo(new UpdatePractice("1/A", "skipped"));
        assertThat(issues(() -> PracticeRequests.parseUpdate("1", "A", body("{}")))).hasSize(1);
        assertThat(issues(() -> PracticeRequests.parseUpdate("1", "A", body("{\"status\":\"done\"}")))).hasSize(1);
        assertThat(issues(() -> PracticeRequests.parseUpdate("0", "a-b",
                body("{\"status\":\"todo\",\"addedFrom\":\"manual\",\"x\":1}")))).containsExactly(
                "params.contestId: contestId must be a positive integer",
                "params.index: index must be 1-3 letters or digits (e.g. A, B1, F2)",
                "body: Unrecognized keys: \"addedFrom\", \"x\"");
    }
}
