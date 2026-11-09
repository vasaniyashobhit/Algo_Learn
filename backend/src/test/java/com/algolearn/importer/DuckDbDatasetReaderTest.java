package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.support.ParquetFixture;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;

/** Ports legacy readParquet.test.js (real fixture file written by DuckDB). */
class DuckDbDatasetReaderTest {

    @TempDir
    Path dir;

    private final DuckDbDatasetReader reader = new DuckDbDatasetReader();

    @Test
    void readsEveryRowWithAllElevenDatasetColumns() {
        assertThat(DuckDbDatasetReader.DATASET_COLUMNS).hasSize(11).startsWith("id", "contest_id", "index");
        var rows = reader.read(ParquetFixture.write(dir).toString());
        assertThat(rows).hasSize(4);
        assertThat(rows.get(1)).satisfies(row -> {
            assertThat(row.id()).isEqualTo("1723/GP1");
            assertThat(row.contestId()).isEqualTo("1723");
            assertThat(row.rating()).isNull();
            assertThat(row.tags()).isEqualTo(List.of("*special", "*special"));
            assertThat(row.editorial()).isNull();
        });
    }

    @Test
    void returnsInt64ValuesAsLong() {
        var rows = reader.read(ParquetFixture.write(dir).toString());
        assertThat(rows).extracting(DatasetRow::rating).containsExactly(1000L, null, 3500L, 1500L);
        assertThat(rows.get(2).tags()).isEqualTo(List.of());
    }

    @Test
    void wrapsAMissingFileIn500NamingThePath() {
        assertThatThrownBy(() -> reader.read("does/not/exist.parquet"))
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.status()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
                    assertThat(e.code()).isEqualTo(ErrorCode.INTERNAL_ERROR);
                    assertThat(e.details()).isEqualTo(Map.of("path", "does/not/exist.parquet"));
                    assertThat(e.getCause()).isNotNull();
                });
    }
}
