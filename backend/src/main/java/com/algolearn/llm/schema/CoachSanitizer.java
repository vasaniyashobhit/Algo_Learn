package com.algolearn.llm.schema;

import com.algolearn.common.validation.JsNumber;
import com.algolearn.common.validation.JsText;
import com.algolearn.config.Tags;
import com.algolearn.llm.CoachAnswer;
import com.algolearn.llm.LlmConstants;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * Bounds a schema-valid answer (legacy sanitizeCoachResponse): official tags only, clamped rating, limited
 * arrays and strings. {@code code} is only trimmed and capped (legacy never checked the C++ itself).
 */
public final class CoachSanitizer {

    private CoachSanitizer() {
    }

    /** Raw fields after the schema check; {@code rating} is a Double, a String or null. */
    public record Raw(List<String> tags, Object rating, List<String> hints, String approach,
            List<String> solutionSteps, String complexity, String code, List<String> pitfalls) {
    }

    public static CoachAnswer sanitize(Raw data) {
        return new CoachAnswer(
                tags(data.tags()),
                rating(data.rating()),
                list(data.hints(), LlmConstants.MAX_HINTS),
                clean(data.approach(), LlmConstants.MAX_TEXT_LENGTH),
                list(data.solutionSteps(), LlmConstants.MAX_SOLUTION_STEPS),
                clean(data.complexity(), LlmConstants.MAX_ITEM_LENGTH),
                clean(data.code(), LlmConstants.MAX_CODE_LENGTH),
                list(data.pitfalls(), LlmConstants.MAX_PITFALLS));
    }

    /** Official topic tags only (trimmed, lower-cased, deduplicated, at most {@link LlmConstants#MAX_TAGS}). */
    public static List<String> tags(List<String> tags) {
        var kept = new LinkedHashSet<String>();
        tags.stream().map(tag -> JsText.lower(JsText.trim(tag))).filter(Tags::isTopicTag).forEach(kept::add);
        return kept.stream().limit(LlmConstants.MAX_TAGS).toList();
    }

    /** Clamped to 800–3500 and rounded to 100 (half up, like Math.round); anything not a number → null. */
    public static Integer rating(Object rating) {
        double value;
        if (rating instanceof Number number) {
            value = number.doubleValue();
        } else if (rating instanceof String text && !JsText.isBlank(text)) {
            value = JsNumber.parse(text);
        } else {
            return null;
        }
        if (!Double.isFinite(value)) {
            return null;
        }
        var clamped = Math.min(LlmConstants.RATING_MAX, Math.max(LlmConstants.RATING_MIN, value));
        return (int) Math.round(clamped / LlmConstants.RATING_STEP) * LlmConstants.RATING_STEP;
    }

    static String clean(String value, int max) {
        var trimmed = JsText.trim(value);
        return trimmed.length() > max ? trimmed.substring(0, max) : trimmed;
    }

    static List<String> list(List<String> items, int maxItems) {
        return items.stream().map(item -> clean(item, LlmConstants.MAX_ITEM_LENGTH)).filter(s -> !s.isEmpty())
                .limit(maxItems).toList();
    }
}
