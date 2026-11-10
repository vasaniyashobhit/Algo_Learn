package com.algolearn.stuck;

import static com.algolearn.stuck.StuckFixtures.PNG;
import static com.algolearn.stuck.StuckFixtures.makePdf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.FieldIssue;
import com.algolearn.stuck.input.StuckInput;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockPart;

/** Legacy upload.test.js (multer): one file in memory next to the text fields, types and limits. */
class StuckUploadTest {

    private static MockHttpServletRequest form(MockPart... parts) {
        var request = new MockHttpServletRequest("POST", "/api/v1/stuck");
        request.setContentType("multipart/form-data; boundary=x");
        for (var part : parts) {
            request.addPart(part);
        }
        return request;
    }

    private static MockPart field(String name, String value) {
        return new MockPart(name, value.getBytes(StandardCharsets.UTF_8));
    }

    private static MockPart file(String name, String type, byte[] bytes) {
        var part = new MockPart(name, "upload", bytes);
        part.getHeaders().setContentType(org.springframework.http.MediaType.parseMediaType(type));
        return part;
    }

    private static AppException failure(MockHttpServletRequest request) {
        return catchThrowableOfType(AppException.class, () -> StuckRequests.read(request, null));
    }

    @Test
    void keepsAnAllowedFileInMemoryNextToTheTextFields() throws Exception {
        var input = StuckRequests.read(form(field("inputType", "pdf"), file("file", "application/pdf", makePdf())),
                null);
        assertThat(input.inputType()).isEqualTo("pdf");
        assertThat(input.file().mimeType()).isEqualTo("application/pdf");
        assertThat(input.file().bytes()).isEqualTo(makePdf());
    }

    @ParameterizedTest
    @ValueSource(strings = {"image/png", "image/jpeg", "image/webp", "text/plain"})
    void acceptsEveryAllowedType(String type) throws Exception {
        assertThat(StuckRequests.read(form(field("inputType", "image"), file("file", type, PNG)), null).file()
                .mimeType()).isEqualTo(type);
    }

    @Test
    void rejectsOtherTypesAndUnexpectedFileFieldsWith415() {
        var gif = failure(form(file("file", "image/gif", PNG)));
        assertThat(gif.status().value()).isEqualTo(415);
        assertThat(gif.details()).isEqualTo(List.of(new FieldIssue("file", "Unsupported type image/gif")));
        var other = failure(form(file("picture", "image/png", PNG)));
        assertThat(other.code()).isEqualTo(ErrorCode.FILE_TYPE_UNSUPPORTED);
        assertThat(other.details()).isEqualTo(List.of(new FieldIssue("picture", "Unexpected file field")));
    }

    @Test
    void rejectsASecondFileTooManyFieldsAndLongFieldsWith400() {
        var two = failure(form(file("file", "image/png", PNG), file("file", "image/png", PNG)));
        assertThat(two.status().value()).isEqualTo(400);
        assertThat(two.details()).isEqualTo(List.of(new FieldIssue("file", "Too many files")));
        var parts = new MockPart[11];
        for (var i = 0; i < parts.length; i++) {
            parts[i] = field("f" + i, "v");
        }
        assertThat(failure(form(parts)).details()).isEqualTo(List.of(new FieldIssue("file", "Too many fields")));
        assertThat(failure(form(field("text", "x".repeat(100_001)))).details())
                .isEqualTo(List.of(new FieldIssue("text", "Field value too long")));
    }

    @Test
    void readsRepeatedFieldsAsArraysAndPassesJsonRequestsThrough() throws Exception {
        var repeated = failure(form(field("inputType", "text"), field("text", "a"), field("text", "b")));
        assertThat(repeated.details()).isEqualTo(List.of(new FieldIssue("body.text",
                "Invalid input: expected string, received array")));
        var json = new MockHttpServletRequest("POST", "/api/v1/stuck");
        json.setContentType("application/json");
        var body = new com.algolearn.common.validation.JsonBody(com.algolearn.llm.LlmFakes.MAPPER
                .readTree("{\"inputType\":\"text\"}"));
        assertThat(StuckRequests.read(json, body)).isEqualTo(new StuckInput("text", null, null, null));
    }
}
