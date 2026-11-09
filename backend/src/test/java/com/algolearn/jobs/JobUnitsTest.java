package com.algolearn.jobs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.algolearn.importer.SyncProblemsetTask;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.jdbc.core.JdbcTemplate;

/** Legacy jobs.test.js: jobErrorHandler, the problemset job; plus the cleanup failure and background starts. */
class JobUnitsTest {

    private final JobErrorHandler errors = mock(JobErrorHandler.class);

    @Test
    void errorHandlerLogsTheErrorWithItsContextAndDoesNotThrow() {
        var log = mock(Logger.class);
        var err = new IllegalStateException("boom");
        new JobErrorHandler(log).handle(err, "syncAllUsers", "u1");
        verify(log).error("Background job failed: {} (job={}, userId={})", "syncAllUsers", "syncAllUsers", "u1", err);
        new JobErrorHandler(log).handle(err, null, null);
        verify(log).error("Background job failed: {} (job={})", "unknown job", "unknown job", err);
        new JobErrorHandler().handle(err, "x", null);
    }

    @Test
    void problemsetJobRunsTheTaskAndReturnsItsSummary() {
        var task = mock(SyncProblemsetTask.class);
        var summary = new SyncProblemsetTask.SyncSummary(10, 0, Map.of(), List.of(), 1, 9, 2);
        when(task.run()).thenReturn(summary);
        assertThat(new SyncProblemsetJob(task, errors).run()).contains(summary);
        assertThat(SyncProblemsetJob.NAME).isEqualTo("syncProblemset");
    }

    @Test
    void problemsetJobSendsFailuresToTheErrorHandlerAndReturnsEmpty() {
        var task = mock(SyncProblemsetTask.class);
        var boom = new IllegalStateException("CF down");
        when(task.run()).thenThrow(boom);
        assertThat(new SyncProblemsetJob(task, errors).run()).isEmpty();
        verify(errors).handle(boom, "syncProblemset", null);
    }

    @Test
    void cleanupJobSendsFailuresToTheErrorHandler() {
        var jdbc = mock(JdbcTemplate.class);
        var boom = new QueryTimeoutException("db down");
        when(jdbc.update(anyString(), any(Object[].class))).thenThrow(boom);
        assertThat(new LlmCacheCleanupJob(jdbc, Clock.systemUTC(), errors).run()).isEmpty();
        verify(errors).handle(boom, "llmCacheCleanup", null);
    }

    @Test
    void backgroundJobsRunOnTheExecutorOnlyWhenEnabled() {
        var ran = new ArrayList<String>();
        new BackgroundJobs(true, Runnable::run).start("a", () -> ran.add("a"));
        new BackgroundJobs(false, Runnable::run).start("b", () -> ran.add("b"));
        assertThat(ran).containsExactly("a");
    }
}
