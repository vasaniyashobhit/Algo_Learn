package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.importer.ProblemWriter.Mode;
import com.algolearn.importer.ProblemWriter.Totals;
import com.algolearn.support.DatabaseTest;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Ports legacy bulkUpsert.test.js against PostgreSQL. */
class ProblemWriterIT extends DatabaseTest {

    /** Every stored column of 1/A as comparable values (arrays as text). */
    private static final String ROW = "SELECT contest_id, idx, title, description, rating, tags::text, source, "
            + "created_at, updated_at FROM problems WHERE id = '1/A'";

    private final ProblemWriter writer;

    ProblemWriterIT(MockMvc mvc, JdbcTemplate jdbc, ProblemWriter writer) {
        super(mvc, jdbc);
        this.writer = writer;
    }

    static ProblemDoc problem(int contestId, String title, String source) {
        var text = new ProblemDoc.Text("Statement " + contestId, "", "", "", "");
        return ProblemDoc.of(contestId + "/A", contestId, "A", title, text, 1500, List.of("dp"), source);
    }

    static List<ProblemDoc> problems(int n) {
        return IntStream.rangeClosed(1, n).mapToObj(i -> problem(i, "P" + i, "hf")).toList();
    }

    private String title(String id) {
        return jdbc.queryForObject("SELECT title FROM problems WHERE id = ?", String.class, id);
    }

    @Test
    void usesBatchesOf500ByDefault() {
        assertThat(ProblemWriter.BATCH_SIZE).isEqualTo(500);
        var sizes = new ArrayList<Integer>();
        var totals = writer.upsert(problems(501), Mode.OVERWRITE, ProblemWriter.BATCH_SIZE, b -> sizes.add(b.size()));
        assertThat(totals.batches()).isEqualTo(2);
        assertThat(totals.upserted()).isEqualTo(501);
        assertThat(sizes).containsExactly(500, 1);
    }

    @Test
    void isIdempotentASecondRunInsertsNothingAndChangesNothing() {
        var docs = problems(7);
        assertThat(writer.upsert(docs, Mode.OVERWRITE, 3, b -> { })).isEqualTo(new Totals(3, 7, 0, 0));
        assertThat(writer.upsert(docs, Mode.OVERWRITE, 3, b -> { })).isEqualTo(new Totals(3, 0, 0, 7));
        assertThat(writer.count()).isEqualTo(7);
    }

    @Test
    void overwriteModeReplacesExistingContent() {
        var doc = problem(1, "Original", "hf");
        writer.upsert(List.of(doc), Mode.OVERWRITE, 500, b -> { });
        var totals = writer.upsert(List.of(problem(1, "Renamed", "hf")), Mode.OVERWRITE, 500, b -> { });
        assertThat(totals.modified()).isEqualTo(1);
        assertThat(title("1/A")).isEqualTo("Renamed");
    }

    @Test
    void insertOnlyModeNeverTouchesExistingRowsNotEvenUpdatedAt() {
        writer.upsert(List.of(problem(1, "Original", "hf")), Mode.OVERWRITE, 500, b -> { });
        var before = jdbc.queryForMap(ROW);
        var fresh = problem(2, "Fresh", "cf_api");
        var totals = writer.upsert(List.of(problem(1, "X", "cf_api"), fresh), Mode.INSERT_ONLY, 500, b -> { });
        assertThat(totals).isEqualTo(new Totals(1, 1, 0, 1));
        assertThat(jdbc.queryForMap(ROW)).isEqualTo(before);
        var inserted = jdbc.queryForMap("SELECT created_at, updated_at FROM problems WHERE id = '2/A'");
        assertThat(inserted.get("created_at")).isNotNull().isEqualTo(inserted.get("updated_at"));
    }

    @Test
    void writesTimestampsOnInsertAndKeepsThemOnOverwrite() {
        writer.upsert(List.of(problem(1, "Original", "hf")), Mode.OVERWRITE, 500, b -> { });
        var created = jdbc.queryForMap("SELECT created_at, updated_at FROM problems WHERE id = '1/A'");
        writer.upsert(List.of(problem(1, "Renamed", "hf")), Mode.OVERWRITE, 500, b -> { });
        assertThat(jdbc.queryForMap("SELECT created_at, updated_at FROM problems WHERE id = '1/A'"))
                .isEqualTo(created);
    }
}
