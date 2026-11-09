package com.algolearn.importer;

import com.algolearn.codeforces.CodeforcesClient;
import com.algolearn.codeforces.dto.CfProblem;
import com.algolearn.tasks.Task;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * {@code --task=sync-problemset} (legacy syncNewProblems): adds problems from problemset.problems
 * that are not stored yet (source cf_api, no text), then refreshes rating and tags of existing
 * cf_api rows that Codeforces changed. hf rows and every text field are never changed.
 */
@Component
public class SyncProblemsetTask implements Task {

    private static final Logger LOG = LoggerFactory.getLogger(SyncProblemsetTask.class);

    private final CodeforcesClient client;
    private final ProblemWriter writer;
    private final CfApiUpdater updater;

    public SyncProblemsetTask(CodeforcesClient client, ProblemWriter writer, CfApiUpdater updater) {
        this.client = client;
        this.writer = writer;
        this.updater = updater;
    }

    @Override
    public String name() {
        return "sync-problemset";
    }

    @Override
    public SyncSummary run() {
        return run(ProblemWriter.BATCH_SIZE);
    }

    public SyncSummary run(int batchSize) {
        LOG.info("Fetching problemset.problems from Codeforces");
        var problemset = client.problemsetProblems();
        List<CfProblem> list = problemset == null || problemset.problems() == null ? List.of() : problemset.problems();
        var partition = ProblemValidator.partition(list.stream().map(FromCfProblem::map).toList());
        var unique = new LinkedHashMap<String, ProblemDoc>();
        partition.valid().forEach(doc -> unique.put(doc.id(), doc));
        var docs = List.copyOf(unique.values());
        var totals = writer.upsert(docs, ProblemWriter.Mode.INSERT_ONLY, batchSize, batch -> { });
        var updated = updater.apply(docs);
        return new SyncSummary(list.size(), partition.rejectedIds().size(), partition.rejected(),
                List.copyOf(partition.sampleIds()), totals.upserted(), totals.matched(), updated);
    }

    /** Same fields and order as the legacy sync:problemset summary. */
    public record SyncSummary(int fetched, int rejected, Map<String, Integer> rejectedByReason,
            List<String> rejectedIds, int inserted, int alreadyPresent, int updated) {
    }
}
