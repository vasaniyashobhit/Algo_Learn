package com.algolearn.security;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Parses JWT_EXPIRES_IN like the {@code ms} package used by jsonwebtoken: "7d", "1h", "2 days",
 * "90m"; a bare number is milliseconds. The lifetime is whole seconds (rounded down).
 */
public final class JwtLifetime {

    private static final Pattern FORMAT = Pattern.compile("^(-?(?:\\d+)?\\.?\\d+) *([a-z]+)?$",
            Pattern.CASE_INSENSITIVE);
    private static final double SECOND = 1000;
    private static final double MINUTE = SECOND * 60;
    private static final double HOUR = MINUTE * 60;
    private static final double DAY = HOUR * 24;
    private static final Map<String, Double> UNITS = units();

    private JwtLifetime() {
    }

    public static Duration parse(String value) {
        var match = value == null ? null : FORMAT.matcher(value);
        if (match == null || value.length() > 100 || !match.matches()) {
            throw invalid(value);
        }
        var unit = match.group(2) == null ? "ms" : match.group(2).toLowerCase(Locale.ROOT);
        var factor = UNITS.get(unit);
        if (factor == null) {
            throw invalid(value);
        }
        var millis = Double.parseDouble(match.group(1)) * factor;
        return Duration.ofSeconds((long) Math.floor(millis / SECOND));
    }

    private static IllegalArgumentException invalid(String value) {
        return new IllegalArgumentException(
                "JWT_EXPIRES_IN must be a timespan like \"7d\" or \"12h\" (got \"" + value + "\")");
    }

    private static Map<String, Double> units() {
        var week = DAY * 7;
        var year = DAY * 365.25;
        return Map.ofEntries(
                Map.entry("years", year), Map.entry("year", year), Map.entry("yrs", year), Map.entry("yr", year),
                Map.entry("y", year), Map.entry("weeks", week), Map.entry("week", week), Map.entry("w", week),
                Map.entry("days", DAY), Map.entry("day", DAY), Map.entry("d", DAY),
                Map.entry("hours", HOUR), Map.entry("hour", HOUR), Map.entry("hrs", HOUR), Map.entry("hr", HOUR),
                Map.entry("h", HOUR), Map.entry("minutes", MINUTE), Map.entry("minute", MINUTE),
                Map.entry("mins", MINUTE), Map.entry("min", MINUTE), Map.entry("m", MINUTE),
                Map.entry("seconds", SECOND), Map.entry("second", SECOND), Map.entry("secs", SECOND),
                Map.entry("sec", SECOND), Map.entry("s", SECOND), Map.entry("milliseconds", 1.0),
                Map.entry("millisecond", 1.0), Map.entry("msecs", 1.0), Map.entry("msec", 1.0),
                Map.entry("ms", 1.0));
    }
}
