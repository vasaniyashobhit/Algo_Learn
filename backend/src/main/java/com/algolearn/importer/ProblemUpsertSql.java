package com.algolearn.importer;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * SQL for a multi-row problem upsert (placeholders only; values are always bound).
 * OVERWRITE replaces the content of existing rows but only when something differs, so a re-run
 * with the same data changes nothing; INSERT_ONLY never touches existing rows. Timestamps are
 * written on insert only (legacy bulkUpsert), so {@code updated_at} never moves on a re-import.
 */
final class ProblemUpsertSql {

    /** Written columns, in bind order. */
    static final List<String> COLUMNS = List.of("id", "contest_id", "idx", "title", "description", "input_format",
            "output_format", "note", "editorial", "rating", "tags", "tag_count", "has_editorial", "source",
            "created_at", "updated_at");

    private static final List<String> CONTENT = COLUMNS.subList(1, COLUMNS.indexOf("created_at"));
    private static final String ROW = COLUMNS.stream().map(c -> "tags".equals(c) ? "?::text[]" : "?")
            .collect(Collectors.joining(", ", "(", ")"));

    private ProblemUpsertSql() {
    }

    static String build(ProblemWriter.Mode mode, int rows) {
        var insert = "INSERT INTO problems AS p (" + String.join(", ", COLUMNS) + ") VALUES "
                + String.join(", ", Collections.nCopies(rows, ROW));
        return insert + switch (mode) {
            case OVERWRITE -> " ON CONFLICT (id) DO UPDATE SET " + CONTENT.stream()
                    .map(c -> c + " = EXCLUDED." + c).collect(Collectors.joining(", "))
                    + " WHERE (" + prefixed("p.") + ") IS DISTINCT FROM (" + prefixed("EXCLUDED.") + ")"
                    + " RETURNING (xmax = 0) AS inserted";
            case INSERT_ONLY -> " ON CONFLICT (id) DO NOTHING RETURNING true AS inserted";
        };
    }

    private static String prefixed(String prefix) {
        return CONTENT.stream().map(c -> prefix + c).collect(Collectors.joining(", "));
    }
}
