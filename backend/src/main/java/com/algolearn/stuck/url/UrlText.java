package com.algolearn.stuck.url;

import java.nio.charset.StandardCharsets;

/**
 * Makes pasted links parseable by {@link java.net.URI} the way browsers (WHATWG URL) accept them: characters a URI
 * may not contain (spaces, non-ASCII, {@code " < > \ ^ ` { | }}) are percent-encoded as UTF-8.
 */
final class UrlText {

    private static final String ILLEGAL = " \"<>\\^`{|}";

    private UrlText() {
    }

    static String encodeIllegal(String text) {
        var out = new StringBuilder(text.length());
        for (var b : text.getBytes(StandardCharsets.UTF_8)) {
            var c = b & 0xff;
            if (c < 0x21 || c >= 0x7f || ILLEGAL.indexOf(c) >= 0) {
                out.append('%').append(Character.toUpperCase(Character.forDigit(c >> 4, 16)))
                        .append(Character.toUpperCase(Character.forDigit(c & 0xf, 16)));
            } else {
                out.append((char) c);
            }
        }
        return out.toString();
    }
}
