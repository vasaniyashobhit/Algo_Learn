package com.algolearn.stuck;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import com.algolearn.common.validation.JsonBody;
import com.algolearn.llm.LlmFakes;
import com.algolearn.stuck.input.StuckInput;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;

/** Legacy stuck.schema.test.js: the POST body (zod messages) and the history query. */
class StuckRequestsTest {

    private static final String OPTIONS = "Invalid option: expected one of \"text\"|\"url\"|\"pdf\"|\"image\"";

    private static StuckInput parse(String json) {
        return StuckRequests.parse(new JsonBody(LlmFakes.MAPPER.readTree(json)), null);
    }

    private static List<FieldIssue> issues(String json) {
        return castIssues(catchThrowableOfType(ValidationException.class, () -> parse(json)).details());
    }

    @SuppressWarnings("unchecked")
    private static List<FieldIssue> castIssues(Object details) {
        return (List<FieldIssue>) details;
    }

    @Test
    void acceptsEveryInputTypeAndTreatsBlankFieldsAsMissing() {
        assertThat(parse("{\"inputType\":\"text\",\"text\":\"abc\",\"url\":\"\"}"))
                .isEqualTo(new StuckInput("text", "abc", null, null));
        assertThat(parse("{\"inputType\":\"url\",\"url\":\"  https://x.io  \"}"))
                .isEqualTo(new StuckInput("url", null, "https://x.io", null));
        assertThat(parse("{\"inputType\":\"pdf\"}")).isEqualTo(new StuckInput("pdf", null, null, null));
        assertThat(parse("{\"inputType\":\"image\"}")).isEqualTo(new StuckInput("image", null, null, null));
    }

    @Test
    void rejectsUnknownTypesUnknownFieldsAndOversizedTextOrUrls() {
        assertThat(issues("{\"inputType\":\"video\"}")).containsExactly(new FieldIssue("body.inputType", OPTIONS));
        assertThat(issues("{}")).containsExactly(new FieldIssue("body.inputType", OPTIONS));
        assertThat(issues("{\"inputType\":\"text\",\"extra\":1}"))
                .containsExactly(new FieldIssue("body", "Unrecognized key: \"extra\""));
        assertThat(issues("{\"inputType\":\"text\",\"text\":\"" + "x".repeat(20_001) + "\"}")).containsExactly(
                new FieldIssue("body.text", "Too big: expected string to have <=20000 characters"));
        assertThat(issues("{\"inputType\":\"url\",\"url\":\"https://x.io/" + "a".repeat(2_048) + "\"}"))
                .containsExactly(new FieldIssue("body.url", "Too big: expected string to have <=2048 characters"));
        assertThat(issues("{\"inputType\":\"text\",\"text\":5}"))
                .containsExactly(new FieldIssue("body.text", "Invalid input: expected string, received number"));
        assertThat(issues("[]"))
                .containsExactly(new FieldIssue("body", "Invalid input: expected object, received array"));
        assertThat(castIssues(catchThrowableOfType(ValidationException.class,
                () -> StuckRequests.parse(new JsonBody(null), null)).details()))
                .containsExactly(new FieldIssue("body", "Invalid input: expected object, received undefined"));
    }

    @Test
    void pagesTheHistoryFrom1() {
        var query = new LinkedMultiValueMap<String, String>();
        assertThat(StuckRequests.page(query)).isEqualTo(1);
        query.add("page", "3");
        assertThat(StuckRequests.page(query)).isEqualTo(3);
        query.set("page", "");
        assertThat(StuckRequests.page(query)).isEqualTo(1);
        query.set("page", "0");
        assertThat(castIssues(catchThrowableOfType(ValidationException.class, () -> StuckRequests.page(query))
                .details())).containsExactly(new FieldIssue("query.page", "Too small: expected number to be >=1"));
    }
}
