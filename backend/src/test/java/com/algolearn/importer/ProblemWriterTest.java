package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import java.time.Clock;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.core.RowMapper;

/** The failure case of legacy bulkUpsert.test.js, plus the generated SQL. */
class ProblemWriterTest {

    @Test
    @SuppressWarnings("unchecked")
    void wrapsDatabaseFailuresInAnAppExceptionNamingTheBatch() {
        var jdbc = mock(JdbcTemplate.class);
        var cause = new DataAccessResourceFailureException("connection lost");
        when(jdbc.query(any(PreparedStatementCreator.class), any(RowMapper.class))).thenThrow(cause);
        var writer = new ProblemWriter(jdbc, Clock.systemUTC());
        var docs = ProblemWriterIT.problems(2);
        assertThatThrownBy(() -> writer.upsert(docs, ProblemWriter.Mode.OVERWRITE, 500, b -> { }))
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.code()).isEqualTo(ErrorCode.INTERNAL_ERROR);
                    assertThat(e.details()).isEqualTo(Map.of("batchIndex", 0, "batchSize", 2));
                    assertThat(e.getCause()).isSameAs(cause);
                });
    }

    @Test
    void buildsOnePlaceholderRowPerDocumentAndBindsEveryValue() {
        var sql = ProblemUpsertSql.build(ProblemWriter.Mode.OVERWRITE, 2);
        assertThat(sql).startsWith("INSERT INTO problems AS p (id, contest_id, idx,")
                .contains("?::text[]", "ON CONFLICT (id) DO UPDATE SET contest_id = EXCLUDED.contest_id",
                        "IS DISTINCT FROM", "RETURNING (xmax = 0)")
                .doesNotContain("created_at = EXCLUDED");
        assertThat(sql.chars().filter(c -> c == '?').count()).isEqualTo(2L * ProblemUpsertSql.COLUMNS.size());
        assertThat(ProblemUpsertSql.build(ProblemWriter.Mode.INSERT_ONLY, 1))
                .endsWith("DO NOTHING RETURNING true AS inserted");
    }
}
