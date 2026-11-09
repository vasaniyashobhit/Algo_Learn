package com.algolearn.jobs;

import com.algolearn.importer.SyncProblemsetTask;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Weekly problemset refresh (legacy syncProblemset.job.js): inserts new Codeforces problems and
 * updates rating/tags of cf_api rows. Never throws; a failure is logged and gives an empty result.
 */
@Component
public class SyncProblemsetJob {

    public static final String NAME = "syncProblemset";
    private static final Logger LOG = LoggerFactory.getLogger(SyncProblemsetJob.class);

    private final SyncProblemsetTask task;
    private final JobErrorHandler errors;

    public SyncProblemsetJob(SyncProblemsetTask task, JobErrorHandler errors) {
        this.task = task;
        this.errors = errors;
    }

    public Optional<SyncProblemsetTask.SyncSummary> run() {
        try {
            var summary = task.run();
            LOG.info("Job finished (job={}, summary={})", NAME, summary);
            return Optional.of(summary);
        } catch (RuntimeException e) {
            errors.handle(e, NAME, null);
            return Optional.empty();
        }
    }
}
