package com.algolearn.support;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Writes a small parquet file shaped like the real dataset (contest_id as text, rating INT64,
 * tags a list) with DuckDB, like legacy tests/helpers/parquetFixture.js.
 */
public final class ParquetFixture {

    /** 1/A, 1723/GP1 (duplicate *special tag, no rating), 921/01, and 5/B with a blank description. */
    private static final String ROWS = """
            SELECT * FROM (VALUES
              ('1/A', '1', 'A', 'Theatre Square', 'Tiles.', 'x', 'x', 'x', 'Ceil.', 1000::BIGINT, ['math']),
              ('1723/GP1', '1723', 'GP1', 'Special', 'Odd id.', 'x', 'x', 'x', NULL, NULL, ['*special', '*special']),
              ('921/01', '921', '01', 'Numbered', 'Digits.', 'x', 'x', 'x', NULL, 3500, []),
              ('5/B', '5', 'B', 'Empty', '   ', 'x', 'x', 'x', NULL, 1500, ['dp'])
            ) AS t(id, contest_id, "index", title, description, input_format, output_format, note, editorial,
                   rating, tags)
            """;

    private ParquetFixture() {
    }

    /** Writes {@code fixture.parquet} into {@code dir} and returns its path. */
    public static Path write(Path dir) {
        var file = dir.resolve("fixture.parquet");
        try (var connection = DriverManager.getConnection("jdbc:duckdb:");
                var statement = connection.createStatement()) {
            // COPY ... TO takes no bind parameters; the path is a test temp dir, quotes are escaped.
            statement.execute("COPY (" + ROWS + ") TO '" + file.toString().replace("'", "''") + "' (FORMAT parquet)");
        } catch (SQLException e) {
            throw new IllegalStateException("Could not write the parquet fixture", e);
        }
        if (!Files.exists(file)) {
            throw new UncheckedIOException(new IOException("Fixture not written: " + file));
        }
        return file;
    }
}
