package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Ports legacy prepareImport.test.js. */
class PrepareImportTest {

    static DatasetRow row(String id, String description, Object editorial, Object rating, List<String> tags) {
        var parts = id.split("/");
        return new DatasetRow(id, parts[0], parts[1], "P " + id, description, null, null, null, editorial, rating,
                tags);
    }

    static DatasetRow row(String id) {
        return row(id, "Text", null, 1200L, List.of("dp"));
    }

    @Test
    void countsReadSkippedRejectedRatingTagsEditorialAndSpecial() {
        var rows = List.of(
                row("1/A", "Text", "Idea", 1200L, List.of("dp")),
                row("1/B", "Text", null, null, List.of()),
                row("1723/GP1", "Text", null, 1200L, List.of("*special")),
                row("921/01"),
                row("2/A", "  ", null, 1200L, List.of("dp")),
                row("3/A", "Text", null, 1200L, List.of("not-a-tag")));
        var prepared = PrepareImport.prepare(rows);
        assertThat(prepared.docs()).extracting(ProblemDoc::id).containsExactly("1/A", "1/B", "1723/GP1", "921/01");
        assertThat(prepared.summary()).isEqualTo(new PrepareImport.Summary(6, 1, 1, Map.of("unknownTag", 1),
                List.of("3/A"), 4, 3, 3, 1, 1));
    }

    @Test
    void reportsZeroRejectionsForCleanInput() {
        var summary = PrepareImport.prepare(List.of(row("1/A"))).summary();
        assertThat(summary.rejected()).isZero();
        assertThat(summary.rejectedByReason()).isEmpty();
    }

    @Test
    void handlesAnEmptyDataset() {
        var summary = PrepareImport.prepare(List.of()).summary();
        assertThat(summary.read()).isZero();
        assertThat(summary.toUpsert()).isZero();
    }
}
