package com.algolearn.common.db;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.random.RandomGenerator;
import java.util.regex.Pattern;

/**
 * 24-hex ids in the MongoDB ObjectId layout (4-byte seconds, then 8 random bytes), for stuck queries: the frontend
 * routes and the E2E tests expect {@code /stuck/<24 hex>} (legacy ObjectIds). Lower-case on output.
 */
public final class ObjectIds {

    public static final Pattern TEXT = Pattern.compile("^[0-9a-fA-F]{24}$");
    private static final RandomGenerator RANDOM = new SecureRandom();
    private static final int RANDOM_BYTES = 8;

    private ObjectIds() {
    }

    public static String next(Clock clock) {
        return next(clock, RANDOM);
    }

    public static String next(Clock clock, RandomGenerator random) {
        var bytes = new byte[RANDOM_BYTES];
        random.nextBytes(bytes);
        return "%08x".formatted(clock.millis() / 1000) + HexFormat.of().formatHex(bytes);
    }

    /** The id in lower case when it is 24 hex characters (any case, like Mongo's ObjectId parsing), else empty. */
    public static Optional<String> parse(String text) {
        return Optional.ofNullable(text).filter(id -> TEXT.matcher(id).matches())
                .map(id -> id.toLowerCase(Locale.ROOT));
    }
}
