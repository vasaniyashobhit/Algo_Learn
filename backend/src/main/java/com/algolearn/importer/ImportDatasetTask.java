package com.algolearn.importer;

import com.algolearn.tasks.Task;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * {@code --task=import-dataset}: loads the HF parquet snapshot into {@code problems}. Safe to
 * re-run: upserts by id and only rewrites rows whose content differs (hf text replaces an
 * earlier cf_api stub of the same problem).
 */
@Component
public class ImportDatasetTask implements Task {

    public static final String DEFAULT_DATASET_PATH = "data/cf_problems.parquet";
    private static final Logger LOG = LoggerFactory.getLogger(ImportDatasetTask.class);

    private final DatasetReader reader;
    private final ProblemWriter writer;
    private final String path;

    public ImportDatasetTask(DatasetReader reader, ProblemWriter writer,
            @Value("${algolearn.import.dataset-path:" + DEFAULT_DATASET_PATH + "}") String path) {
        this.reader = reader;
        this.writer = writer;
        this.path = path;
    }

    @Override
    public String name() {
        return "import-dataset";
    }

    @Override
    public ImportSummary run() {
        return run(path, ProblemWriter.BATCH_SIZE);
    }

    public ImportSummary run(String datasetPath, int batchSize) {
        var rows = reader.read(datasetPath);
        var prepared = PrepareImport.prepare(rows);
        LOG.info("Dataset read, upserting rows={} toUpsert={}", rows.size(), prepared.docs().size());
        var totals = writer.upsert(lastPerId(prepared.docs()), ProblemWriter.Mode.OVERWRITE, batchSize,
                batch -> LOG.debug("Batch written batchIndex={} totals={}", batch.batchIndex(), batch.totals()));
        return ImportSummary.of(prepared.summary(), totals, writer.count());
    }

    /** One write per id (the last row wins, like the sequential legacy updates); the dataset has no duplicates. */
    private static List<ProblemDoc> lastPerId(List<ProblemDoc> docs) {
        var byId = new LinkedHashMap<String, ProblemDoc>();
        docs.forEach(doc -> byId.put(doc.id(), doc));
        return List.copyOf(byId.values());
    }

    /** Same fields and order as the legacy import:dataset summary. */
    public record ImportSummary(int read, int skippedEmptyDescription, int rejected,
            Map<String, Integer> rejectedByReason, List<String> rejectedIds, int toUpsert, int withRating,
            int withTags, int withEditorial, int withSpecialTag, int upserted, int updated, int unchanged,
            int batches, long totalInCollection) {

        static ImportSummary of(PrepareImport.Summary s, ProblemWriter.Totals totals, long total) {
            return new ImportSummary(s.read(), s.skippedEmptyDescription(), s.rejected(), s.rejectedByReason(),
                    s.rejectedIds(), s.toUpsert(), s.withRating(), s.withTags(), s.withEditorial(),
                    s.withSpecialTag(), totals.upserted(), totals.modified(), totals.matched() - totals.modified(),
                    totals.batches(), total);
        }
    }
}
