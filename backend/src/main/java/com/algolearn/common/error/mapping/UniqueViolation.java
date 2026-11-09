package com.algolearn.common.error.mapping;

import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * A PostgreSQL unique violation (SQLSTATE 23505) found in a cause chain: the constraint name and
 * the column names from "Key (a, b)=(...) already exists". Values are never kept.
 */
record UniqueViolation(String constraint, List<String> fields) {

    static final String UNIQUE_VIOLATION = "23505";
    private static final Pattern CONSTRAINT = Pattern.compile("constraint \"([^\"]+)\"");
    private static final Pattern KEY = Pattern.compile("Key \\(([^)]+)\\)=");

    static Optional<UniqueViolation> find(Throwable error) {
        for (var current = error; current != null; current = current.getCause()) {
            if (current instanceof SQLException sql && UNIQUE_VIOLATION.equals(sql.getSQLState())) {
                return Optional.of(parse(String.valueOf(sql.getMessage())));
            }
        }
        return Optional.empty();
    }

    static UniqueViolation parse(String message) {
        var constraint = CONSTRAINT.matcher(message);
        var key = KEY.matcher(message);
        var fields = key.find()
                ? Arrays.stream(key.group(1).split(",")).map(String::trim).toList()
                : List.<String>of();
        return new UniqueViolation(constraint.find() ? constraint.group(1) : "", fields);
    }
}
