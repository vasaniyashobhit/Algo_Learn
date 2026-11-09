package com.algolearn.common.error.mapping;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.common.error.ErrorCode;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.mock.web.MockHttpServletRequest;

class DataErrorMapperTest {

    private final DataErrorMapper mapper = new DataErrorMapper();
    private final MockHttpServletRequest request = new MockHttpServletRequest();

    private static DataIntegrityViolationException unique(String constraint, String key) {
        var sql = new SQLException("ERROR: duplicate key value violates unique constraint \"%s\"\n"
                .formatted(constraint) + "  Detail: Key (%s)=(secret@x.test) already exists.".formatted(key),
                UniqueViolation.UNIQUE_VIOLATION);
        return new DataIntegrityViolationException("could not execute statement", new RuntimeException(sql));
    }

    @Test
    void mapsKnownConstraintsToTheirCodes() {
        var cases = Map.of("uk_users_email", ErrorCode.AUTH_EMAIL_TAKEN,
                "uk_users_cf_handle", ErrorCode.CF_HANDLE_TAKEN,
                "uk_practice_user_problem", ErrorCode.PRACTICE_ITEM_EXISTS);
        cases.forEach((constraint, code) -> {
            var mapped = mapper.map(unique(constraint, "email"), request).orElseThrow();
            assertThat(mapped.status().value()).isEqualTo(409);
            assertThat(mapped.code()).isEqualTo(code);
        });
    }

    @Test
    void otherUniqueViolationsExposeFieldNamesOnlyNeverValues() {
        var mapped = mapper.map(unique("uk_other", "user_id, topic_key"), request).orElseThrow();
        assertThat(mapped.code()).isEqualTo(ErrorCode.DUPLICATE_RESOURCE);
        assertThat(mapped.getMessage()).isEqualTo("This resource already exists");
        assertThat(mapped.details()).isEqualTo(Map.of("fields", List.of("user_id", "topic_key")));
        assertThat(mapped.details().toString()).doesNotContain("secret");
    }

    @Test
    void nonUniqueIntegrityErrorsAreNotMapped() {
        var sql = new SQLException("null value", "23502");
        assertThat(mapper.map(new DataIntegrityViolationException("x", sql), request)).isEmpty();
    }

    @Test
    void lostConnectionsBecomeDbUnavailable503() {
        var mapped = mapper.map(new CannotGetJdbcConnectionException("refused"), request).orElseThrow();
        assertThat(mapped.status().value()).isEqualTo(503);
        assertThat(mapped.code()).isEqualTo(ErrorCode.DB_UNAVAILABLE);
    }

    @Test
    void parsesMessagesWithoutConstraintOrKey() {
        assertThat(UniqueViolation.parse("duplicate")).isEqualTo(new UniqueViolation("", List.of()));
        assertThat(mapper.map(new IllegalStateException(), request)).isEmpty();
    }
}
