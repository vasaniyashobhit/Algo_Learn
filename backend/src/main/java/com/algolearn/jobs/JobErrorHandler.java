package com.algolearn.jobs;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Background jobs have no request, so their errors come here (legacy jobErrorHandler): logged with
 * context, never re-thrown, and the job continues with the next user. The process must never crash.
 */
@Component
public class JobErrorHandler {

    private final Logger log;

    public JobErrorHandler() {
        this(LoggerFactory.getLogger(JobErrorHandler.class));
    }

    JobErrorHandler(Logger log) {
        this.log = log;
    }

    /** {@code job} may be null ("unknown job"); {@code userId} is only set for per-user failures. */
    public void handle(Throwable error, String job, String userId) {
        var name = job == null ? "unknown job" : job;
        if (userId == null) {
            log.error("Background job failed: {} (job={})", name, name, error);
        } else {
            log.error("Background job failed: {} (job={}, userId={})", name, name, userId, error);
        }
    }
}
