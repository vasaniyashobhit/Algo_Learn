package com.algolearn.common.validation;

import java.util.List;
import java.util.Optional;
import org.springframework.util.MultiValueMap;

/**
 * Query-string rules with the legacy zod semantics: an empty value ({@code ?x=}) counts as not
 * given, a repeated scalar parameter is an array (invalid), numbers are coerced like Number().
 */
public final class QueryValues {

    private final MultiValueMap<String, String> query;
    private final Issues issues;

    public QueryValues(MultiValueMap<String, String> query, Issues issues) {
        this.query = query;
        this.issues = issues;
    }

    public List<String> all(String name) {
        var values = query.get(name);
        return values == null ? List.of() : values;
    }

    /** An integer in [min, max], {@code fallback} when absent (null fallback = optional). */
    public Optional<Integer> integer(String name, int min, int max, Integer fallback) {
        var values = all(name);
        if (values.isEmpty() || values.size() == 1 && values.getFirst().isEmpty()) {
            return Optional.ofNullable(fallback);
        }
        var field = "query." + name;
        var number = values.size() == 1 ? JsNumber.parse(values.getFirst()) : Double.NaN;
        if (!Double.isFinite(number)) {
            var received = Double.isNaN(number) ? "NaN" : number > 0 ? "Infinity" : "-Infinity";
            issues.add(field, "Invalid input: expected number, received " + received);
            return Optional.empty();
        }
        var before = issues.size();
        if (!JsNumber.isInteger(number)) {
            issues.add(field, "Invalid input: expected int, received number");
        }
        if (number < min) {
            issues.add(field, "Too small: expected number to be >=" + min);
        }
        if (number > max) {
            issues.add(field, "Too big: expected number to be <=" + max);
        }
        return issues.size() == before ? Optional.of((int) number) : Optional.empty();
    }

    /** A single string value; blank counts as absent; repeated → "expected string, received array". */
    public Optional<String> string(String name) {
        var values = all(name);
        if (values.isEmpty() || values.size() == 1 && values.getFirst().isEmpty()) {
            return Optional.empty();
        }
        if (values.size() > 1) {
            issues.add("query." + name, "Invalid input: expected string, received array");
            return Optional.empty();
        }
        return Optional.of(values.getFirst());
    }
}
