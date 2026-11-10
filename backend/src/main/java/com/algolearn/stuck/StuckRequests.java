package com.algolearn.stuck;

import com.algolearn.common.validation.Issues;
import com.algolearn.common.validation.JsText;
import com.algolearn.common.validation.JsonBody;
import com.algolearn.common.validation.QueryValues;
import com.algolearn.common.validation.StrictKeys;
import com.algolearn.stuck.input.StuckInput;
import com.algolearn.stuck.input.UploadedFile;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.util.MultiValueMap;
import tools.jackson.databind.JsonNode;

/**
 * Legacy stuck.schema: the POST /stuck body (multipart fields or JSON) as a strict object
 * {@code { inputType, text?, url? }} with the zod messages, and the history query ({@code page} 1–10,000).
 * Which of text/url/file is required depends on {@code inputType} and is checked by the input resolver.
 */
public final class StuckRequests {

    private static final Set<String> KEYS = Set.of("inputType", "text", "url");

    private StuckRequests() {
    }

    /** A multipart request (fields + file) or a JSON body. */
    public static StuckInput read(HttpServletRequest request, JsonBody json) throws IOException, ServletException {
        var type = request.getContentType();
        if (type == null || !JsText.lower(type).startsWith("multipart/")) {
            return parse(json, null);
        }
        var form = StuckUpload.read(request);
        return parse(form.asJson(), form.file());
    }

    public static StuckInput parse(JsonBody body, UploadedFile file) {
        var issues = new Issues();
        var object = body.object(issues);
        var inputType = object.map(o -> o.get("inputType")).filter(v -> v.isString()
                && StuckConstants.INPUT_TYPES.contains(v.stringValue())).map(JsonNode::stringValue).orElse(null);
        if (object.isPresent() && inputType == null) {
            issues.add("body.inputType", "Invalid option: expected one of " + StuckConstants.INPUT_TYPES.stream()
                    .map(o -> "\"" + o + "\"").collect(Collectors.joining("|")));
        }
        var text = object.map(o -> string(o.get("text"), "body.text", false, StuckConstants.MAX_TEXT_LENGTH,
                issues)).orElse(null);
        var url = object.map(o -> string(o.get("url"), "body.url", true, StuckConstants.MAX_URL_LENGTH, issues))
                .orElse(null);
        object.ifPresent(o -> StrictKeys.check(o, KEYS, "body", issues));
        issues.throwIfAny();
        return new StuckInput(inputType, text, url, file);
    }

    public static int page(MultiValueMap<String, String> query) {
        var issues = new Issues();
        var page = new QueryValues(query, issues).integer("page", 1, 10_000, 1);
        issues.throwIfAny();
        return page.orElse(1);
    }

    /** blank ('') = absent; then a string of at most {@code max} chars (trimmed first when {@code trim}). */
    private static String string(JsonNode value, String field, boolean trim, int max, Issues issues) {
        if (value == null || value.isString() && value.stringValue().isEmpty()) {
            return null;
        }
        if (!value.isString()) {
            issues.add(field, "Invalid input: expected string, received " + JsonBody.typeOf(value));
            return null;
        }
        var text = trim ? JsText.trim(value.stringValue()) : value.stringValue();
        if (text.length() > max) {
            issues.add(field, "Too big: expected string to have <=" + max + " characters");
            return null;
        }
        return text;
    }
}
