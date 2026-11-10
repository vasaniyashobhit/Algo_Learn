package com.algolearn.llm.cache;

import com.algolearn.common.validation.JsText;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.HexFormat;
import java.util.Optional;
import java.util.regex.Pattern;

/** Coach cache keys (legacy cacheKey.js): {@code problem:<id>}, else {@code text:<sha256 of normalized text>}. */
public final class CacheKey {

    /** JavaScript's {@code \s}: ASCII space characters plus Unicode spaces, line separators and U+FEFF. */
    private static final Pattern JS_SPACES = Pattern.compile(
            "[\\t\\n\\u000B\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+");

    private CacheKey() {
    }

    /** Unicode NFKC, whitespace runs collapsed to one space, trimmed (case is kept). */
    public static String normalize(String text) {
        var nfkc = Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFKC);
        return JsText.trim(JS_SPACES.matcher(nfkc).replaceAll(" "));
    }

    /** Empty when there is neither a problem id nor any text. */
    public static Optional<String> of(String problemId, String text) {
        if (problemId != null && !problemId.isEmpty()) {
            return Optional.of("problem:" + problemId);
        }
        var normalized = normalize(text);
        return normalized.isEmpty() ? Optional.empty() : Optional.of("text:" + sha256Hex(normalized));
    }

    public static String sha256Hex(String text) {
        try {
            var digest = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
