package com.algolearn.stuck.input;

import com.algolearn.common.validation.JsText;
import java.util.Arrays;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** Legacy tidyText: collapses white space inside lines (incl. no-break spaces) and blank-line runs, then trims. */
public final class TextTidy {

    /** JavaScript {@code [^\S\n]}: every JS white-space character except the line feed. */
    private static final Pattern INLINE_SPACE = Pattern.compile(
            "[\\t\\x0B\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+");
    private static final Pattern BLANK_RUNS = Pattern.compile("\\n{3,}");

    private TextTidy() {
    }

    public static String tidy(String text) {
        var unified = (text == null ? "" : text).replaceAll("\\r\\n?", "\n");
        var lines = Arrays.stream(unified.split("\n", -1))
                .map(line -> JsText.trim(INLINE_SPACE.matcher(line).replaceAll(" ")))
                .collect(Collectors.joining("\n"));
        return JsText.trim(BLANK_RUNS.matcher(lines).replaceAll("\n\n"));
    }

    /** At most {@code max} characters (UTF-16 units, like JS slice). */
    public static String cap(String text, int max) {
        return text.length() > max ? text.substring(0, max) : text;
    }
}
