package com.algolearn.common.validation;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** String helpers with JavaScript semantics, so validation matches the legacy zod schemas exactly. */
public final class JsText {

    private JsText() {
    }

    /** Like String.prototype.trim(): removes Unicode white space and line terminators (incl. U+FEFF). */
    public static String trim(String value) {
        var start = 0;
        var end = value.length();
        while (start < end && isJsSpace(value.charAt(start))) {
            start++;
        }
        while (end > start && isJsSpace(value.charAt(end - 1))) {
            end--;
        }
        return value.substring(start, end);
    }

    public static boolean isBlank(String value) {
        return trim(value).isEmpty();
    }

    public static String lower(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    public static String upper(String value) {
        return value.toUpperCase(Locale.ROOT);
    }

    /** Like Buffer.byteLength(value): UTF-8 bytes. */
    public static int byteLength(String value) {
        return value.getBytes(StandardCharsets.UTF_8).length;
    }

    static boolean isJsSpace(char c) {
        return c == '\t' || c == '\n' || c == '\u000B' || c == '\f' || c == '\r' || c == '﻿'
                || Character.isSpaceChar(c);
    }
}
