package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.importer.CfApiUpdater.Row;
import java.time.Clock;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

/** Ports legacy updateCfApiRows.test.js. */
class CfApiUpdaterTest {

    static ProblemDoc fresh(String id, Integer rating, List<String> tags) {
        var parts = id.split("/");
        return ProblemDoc.of(id, Integer.valueOf(parts[0]), parts[1], "T", ProblemDoc.Text.EMPTY, rating, tags,
                "cf_api");
    }

    @Test
    void detectsADifferentRatingIncludingNullAndNumber() {
        assertThat(CfApiUpdater.hasChanged(new Row("1/A", 1500, List.of()), fresh("1/A", 1600, List.of()))).isTrue();
        assertThat(CfApiUpdater.hasChanged(new Row("1/A", null, List.of()), fresh("1/A", 1600, List.of()))).isTrue();
        assertThat(CfApiUpdater.hasChanged(new Row("1/A", null, List.of()), fresh("1/A", null, List.of()))).isFalse();
    }

    @Test
    void comparesTagsAsASet() {
        assertThat(CfApiUpdater.hasChanged(new Row("1/A", 1, List.of("dp", "math")),
                fresh("1/A", 1, List.of("math", "dp")))).isFalse();
        assertThat(CfApiUpdater.hasChanged(new Row("1/A", 1, List.of("dp")), fresh("1/A", 1, List.of("dp", "math"))))
                .isTrue();
        assertThat(CfApiUpdater.hasChanged(new Row("1/A", 1, null), fresh("1/A", 1, List.of()))).isFalse();
    }

    @Test
    void picksOnlyChangedRowsThatCodeforcesStillLists() {
        var rows = List.of(new Row("1/A", 800, List.of("math")), new Row("2/A", 900, List.of()),
                new Row("3/A", 1, List.of()));
        var docs = List.of(fresh("1/A", 1000, List.of("math", "dp")), fresh("2/A", 900, List.of()));
        assertThat(CfApiUpdater.changes(rows, docs)).containsExactly(docs.getFirst());
    }

    @Test
    @SuppressWarnings("unchecked")
    void wrapsDatabaseFailuresIn500() {
        var jdbc = mock(JdbcTemplate.class);
        var cause = new DataAccessResourceFailureException("db down");
        when(jdbc.query(anyString(), any(RowMapper.class))).thenThrow(cause);
        assertThatThrownBy(() -> new CfApiUpdater(jdbc, Clock.systemUTC()).apply(List.of()))
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.status()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
                    assertThat(e.code()).isEqualTo(ErrorCode.INTERNAL_ERROR);
                    assertThat(e.getCause()).isSameAs(cause);
                });
    }
}
