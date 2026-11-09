package com.algolearn.jobs;

import java.util.concurrent.Executor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Starts a job in the background (on the application task executor) and returns at once, for the hosted-cron
 * trigger. Off with {@code algolearn.jobs.background-enabled=false} (tests): the start is only logged.
 */
@Component
public class BackgroundJobs {

    private static final Logger LOG = LoggerFactory.getLogger(BackgroundJobs.class);

    private final boolean enabled;
    private final Executor executor;

    /** {@code executor} is Spring Boot's application task executor (virtual threads are enabled). */
    public BackgroundJobs(@Value("${algolearn.jobs.background-enabled:true}") boolean enabled,
            @Qualifier("applicationTaskExecutor") Executor executor) {
        this.enabled = enabled;
        this.executor = executor;
    }

    /** {@code job} must not throw (every job handles its own errors). */
    public void start(String name, Runnable job) {
        if (!enabled) {
            LOG.info("Background jobs are disabled, not starting {}", name);
            return;
        }
        executor.execute(job);
    }
}
