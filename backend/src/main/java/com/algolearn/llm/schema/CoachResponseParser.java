package com.algolearn.llm.schema;

import com.algolearn.common.validation.JsText;
import com.algolearn.llm.CoachAnswer;
import com.algolearn.llm.chain.LlmException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Model text → sanitized coach answer (legacy coachResponse.schema): a ```json fence around the object is
 * tolerated, unknown keys are dropped. Text that is not JSON throws reason {@code invalid_json}; JSON that misses
 * the schema (or is empty after sanitizing) throws reason {@code invalid_schema}.
 */
public final class CoachResponseParser {

    public static final String INVALID_JSON = "invalid_json";
    public static final String INVALID_SCHEMA = "invalid_schema";
    private static final Pattern FENCE = Pattern.compile("^```(?:json)?\\s*([\\s\\S]*?)\\s*```$",
            Pattern.CASE_INSENSITIVE);
    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();

    private CoachResponseParser() {
    }

    public static CoachAnswer parse(String raw) {
        return validate(parseJson(raw));
    }

    static JsonNode parseJson(String raw) {
        var trimmed = JsText.trim(raw == null ? "" : raw);
        var fenced = FENCE.matcher(trimmed);
        var json = fenced.matches() ? fenced.group(1) : trimmed;
        try {
            var node = json.isEmpty() ? null : MAPPER.readTree(json);
            if (node == null || node.isMissingNode()) {
                throw new IllegalArgumentException("empty");
            }
            return node;
        } catch (JacksonException | IllegalArgumentException e) {
            throw new LlmException("The model did not answer with valid JSON", null, INVALID_JSON, e);
        }
    }

    /** Validates an already-parsed value and sanitizes it (also used on cache reads). */
    public static CoachAnswer validate(JsonNode value) {
        var answer = value != null && value.isObject() ? schema(value) : null;
        if (answer == null || answer.hints().isEmpty() || answer.approach().isEmpty()) {
            throw new LlmException("The model answer does not match the coach schema", null, INVALID_SCHEMA, null);
        }
        return answer;
    }

    private static CoachAnswer schema(JsonNode node) {
        var rating = node.get("estimatedRating");
        var ratingOk = rating == null || rating.isNull() || rating.isNumber() || rating.isString();
        var hints = strings(node.get("hints"), false);
        Object ratingValue = rating != null && rating.isNumber() ? (Object) rating.doubleValue()
                : rating != null && rating.isString() ? rating.stringValue() : null;
        var raw = new CoachSanitizer.Raw(strings(node.get("tags"), true), ratingValue, hints,
                text(node.get("approach")),
                strings(node.get("solutionSteps"), true), text(node.get("complexity")), text(node.get("code")),
                strings(node.get("pitfalls"), true));
        var valid = ratingOk && raw.tags() != null && hints != null && !hints.isEmpty() && raw.approach() != null
                && !raw.approach().isEmpty() && raw.solutionSteps() != null && raw.complexity() != null
                && raw.code() != null && raw.pitfalls() != null;
        return valid ? CoachSanitizer.sanitize(raw) : null;
    }

    /** An array of strings; absent → [] when optional; anything else → null (schema miss). */
    private static List<String> strings(JsonNode node, boolean optional) {
        if (node == null) {
            return optional ? List.of() : null;
        }
        if (!node.isArray()) {
            return null;
        }
        var out = new ArrayList<String>();
        for (var item : node.values()) {
            if (!item.isString()) {
                return null;
            }
            out.add(item.stringValue());
        }
        return out;
    }

    /** A string; absent → ''; anything else → null (schema miss). */
    private static String text(JsonNode node) {
        if (node == null) {
            return "";
        }
        return node.isString() ? node.stringValue() : null;
    }
}
