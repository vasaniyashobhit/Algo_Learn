package com.algolearn.config.env;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Predicate;

/** Reads variables from one source and collects every problem instead of stopping at the first. */
final class EnvReader {

    private final Function<String, String> source;
    private final List<String> issues = new ArrayList<>();

    EnvReader(Function<String, String> source) {
        this.source = source;
    }

    /** A variable that must be present and pass {@code rule}; returns "" after recording an issue. */
    String required(String key, Predicate<String> rule, String message) {
        var value = source.apply(key);
        if (value == null) {
            issues.add(key + ": missing");
            return "";
        }
        return check(key, value, rule, message);
    }

    /** A variable with a default when absent; a present value must pass {@code rule}. */
    String withDefault(String key, String fallback, Predicate<String> rule, String message) {
        var value = source.apply(key);
        return value == null ? fallback : check(key, value, rule, message);
    }

    /** An optional variable: absent or blank means "not set". */
    Optional<String> optional(String key) {
        return Optional.ofNullable(source.apply(key)).map(String::trim).filter(v -> !v.isEmpty());
    }

    List<String> issues() {
        return List.copyOf(issues);
    }

    private String check(String key, String value, Predicate<String> rule, String message) {
        if (!rule.test(value)) {
            issues.add(key + ": " + message);
        }
        return value;
    }
}
