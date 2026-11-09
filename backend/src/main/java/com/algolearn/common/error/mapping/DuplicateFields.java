package com.algolearn.common.error.mapping;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * API field names for a unique violation, exactly as the legacy Mongo E11000 keyPattern named them
 * ({@code userId}, {@code problemId}, {@code cfHandle}, {@code _id} for a primary key), never the
 * SQL column names. Known constraints are listed; other columns are converted to camelCase.
 */
final class DuplicateFields {

    private static final Map<String, List<String>> BY_CONSTRAINT = Map.of(
            "uk_users_email", List.of("email"),
            "uk_users_cf_handle", List.of("cfHandle"),
            "uk_submissions_cf_submission_id", List.of("cfSubmissionId"),
            "uk_topic_stats_user_topic", List.of("userId", "topicKey"),
            "uk_llm_cache_key", List.of("key"),
            "uk_practice_user_problem", List.of("userId", "problemId"));
    private static final Pattern SNAKE = Pattern.compile("_([a-z0-9])");

    private DuplicateFields() {
    }

    static List<String> of(UniqueViolation violation) {
        var known = BY_CONSTRAINT.get(violation.constraint());
        if (known != null) {
            return known;
        }
        if (violation.constraint().endsWith("_pkey")) {
            return List.of("_id");
        }
        return violation.fields().stream().map(DuplicateFields::camel).toList();
    }

    static String camel(String column) {
        if ("id".equals(column)) {
            return "_id";
        }
        return SNAKE.matcher(column).replaceAll(match -> match.group(1).toUpperCase(java.util.Locale.ROOT));
    }
}
