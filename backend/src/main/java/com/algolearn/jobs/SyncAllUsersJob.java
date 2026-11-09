package com.algolearn.jobs;

import com.algolearn.sync.SyncService;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Syncs every user with a linked handle, one at a time (legacy syncAllUsers.job.js). The per-user
 * cooldown does not apply. A failing user goes to the error handler and the loop continues.
 * {@link #run()} never throws, and a run that starts while another is in progress is skipped
 * (the scheduler and the HTTP trigger can overlap).
 */
@Component
public class SyncAllUsersJob {

    public static final String NAME = "syncAllUsers";
    private static final Logger LOG = LoggerFactory.getLogger(SyncAllUsersJob.class);

    private final SyncService sync;
    private final LinkedUsers linkedUsers;
    private final JobErrorHandler errors;
    private final AtomicBoolean running = new AtomicBoolean();

    public SyncAllUsersJob(SyncService sync, LinkedUsers linkedUsers, JobErrorHandler errors) {
        this.sync = sync;
        this.linkedUsers = linkedUsers;
        this.errors = errors;
    }

    public Summary run() {
        if (!running.compareAndSet(false, true)) {
            LOG.info("Job already running, skipped (job={})", NAME);
            return Summary.SKIPPED;
        }
        var summary = new int[4];
        try {
            var users = linkedUsers.ids();
            summary[0] = users.size();
            for (var id : users) {
                try {
                    summary[3] += sync.syncUser(id, true).newSubmissions();
                    summary[1] += 1;
                } catch (RuntimeException e) {
                    summary[2] += 1;
                    errors.handle(e, NAME, id.toString());
                }
            }
            LOG.info("Job finished (job={}, users={}, synced={}, failed={}, newSubmissions={})", NAME,
                    summary[0], summary[1], summary[2], summary[3]);
        } catch (RuntimeException e) {
            errors.handle(e, NAME, null);
        } finally {
            running.set(false);
        }
        return new Summary(false, summary[0], summary[1], summary[2], summary[3]);
    }

    /** What one run did; {@code skipped} when another run was in progress. */
    public record Summary(boolean skipped, int users, int synced, int failed, int newSubmissions) {

        static final Summary SKIPPED = new Summary(true, 0, 0, 0, 0);
    }
}
