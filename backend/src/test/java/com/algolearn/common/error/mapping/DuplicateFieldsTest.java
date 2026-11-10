package com.algolearn.common.error.mapping;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/** Duplicate-key details name the legacy API fields (as legacy named them), never SQL columns. */
class DuplicateFieldsTest {

    private static List<String> fields(String constraint, String... columns) {
        return DuplicateFields.of(new UniqueViolation(constraint, List.of(columns)));
    }

    @Test
    void knownConstraintsUseTheLegacyFieldNames() {
        assertThat(fields("uk_users_email", "email")).containsExactly("email");
        assertThat(fields("uk_users_cf_handle", "lower(cf_handle::text")).containsExactly("cfHandle");
        assertThat(fields("uk_submissions_cf_submission_id", "cf_submission_id")).containsExactly("cfSubmissionId");
        assertThat(fields("uk_topic_stats_user_topic", "user_id", "topic_key")).containsExactly("userId", "topicKey");
        assertThat(fields("uk_llm_cache_key", "key")).containsExactly("key");
        assertThat(fields("uk_practice_user_problem", "user_id", "problem_id")).containsExactly("userId", "problemId");
    }

    @Test
    void primaryKeysAreUnderscoreId() {
        assertThat(fields("problems_pkey", "id")).containsExactly("_id");
    }

    @Test
    void otherColumnsBecomeCamelCase() {
        assertThat(fields("uk_new", "user_id", "cf_handle", "id", "email")).containsExactly("userId", "cfHandle",
                "_id", "email");
        assertThat(fields("", new String[0])).isEmpty();
    }
}
