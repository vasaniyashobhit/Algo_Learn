package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.ParquetFixture;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Ports legacy importDataset.test.js (real parquet fixture, real PostgreSQL). */
class ImportDatasetTaskIT extends DatabaseTest {

    @TempDir
    Path dir;

    private final ImportDatasetTask task;
    private final ProblemWriter writer;
    private final ProblemRepository problems;
    private String fixture;

    ImportDatasetTaskIT(MockMvc mvc, JdbcTemplate jdbc, ImportDatasetTask task, ProblemWriter writer,
            ProblemRepository problems) {
        super(mvc, jdbc);
        this.task = task;
        this.writer = writer;
        this.problems = problems;
    }

    @BeforeEach
    void writeFixture() {
        fixture = ParquetFixture.write(dir).toString();
    }

    @Test
    void pointsAtTheBackendDatasetFile() {
        assertThat(task.name()).isEqualTo("import-dataset");
        assertThat(ImportDatasetTask.DEFAULT_DATASET_PATH).isEqualTo("data/cf_problems.parquet");
        assertThat(Files.exists(Path.of(ImportDatasetTask.DEFAULT_DATASET_PATH))).isTrue();
    }

    @Test
    void importsAParquetFileAndReturnsTheSummaryWithUnusualIdsAccepted() {
        var summary = task.run(fixture, ProblemWriter.BATCH_SIZE);
        assertThat(summary).isEqualTo(new ImportDatasetTask.ImportSummary(4, 1, 0, Map.of(), List.of(), 3, 2, 2, 1, 1,
                3, 0, 0, 1, 3));
        assertThat(problems.findAll()).extracting(p -> p.getId())
                .containsExactlyInAnyOrder("1/A", "1723/GP1", "921/01");
        var special = problems.findById("1723/GP1").orElseThrow();
        assertThat(special.getTags()).containsExactly("*special");
        assertThat(special.getTagCount()).isEqualTo(1);
        assertThat(special.getRating()).isNull();
        assertThat(special.getCreatedAt()).isNotNull();
    }

    @Test
    void isSafeToReRun() {
        task.run(fixture, ProblemWriter.BATCH_SIZE);
        var second = task.run(fixture, ProblemWriter.BATCH_SIZE);
        assertThat(List.of(second.upserted(), second.updated(), second.unchanged())).containsExactly(0, 0, 3);
        assertThat(second.totalInCollection()).isEqualTo(3);
    }

    @Test
    void replacesACfApiStubWithTheHfText() {
        insertProblem("1/A", "cf_api", "Stub", null);
        var summary = task.run(fixture, ProblemWriter.BATCH_SIZE);
        assertThat(List.of(summary.upserted(), summary.updated())).containsExactly(2, 1);
        var row = problems.findById("1/A").orElseThrow();
        assertThat(row.getSource()).isEqualTo("hf");
        assertThat(row.getDescription()).isEqualTo("Tiles.");
        assertThat(row.isHasEditorial()).isTrue();
    }

    @Test
    void usesAnInjectedReaderAndBatchSize() {
        var paths = new ArrayList<String>();
        DatasetReader reader = path -> {
            paths.add(path);
            return List.of(new DatasetRow("7/A", "7", "A", "T", "D", null, null, null, null, null, List.of()));
        };
        var summary = new ImportDatasetTask(reader, writer, "p.parquet").run();
        assertThat(paths).containsExactly("p.parquet");
        assertThat(List.of(summary.upserted(), summary.batches())).containsExactly(1, 1);
    }
}
