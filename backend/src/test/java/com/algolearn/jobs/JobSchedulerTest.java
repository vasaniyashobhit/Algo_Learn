package com.algolearn.jobs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.algolearn.support.TestProperties;
import com.algolearn.sync.SyncSettings;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

/** Legacy scheduler.test.js: user sync on SYNC_CRON, problemset weekly, plus the daily llm_cache cleanup. */
class JobSchedulerTest {

    private final SyncAllUsersJob syncAll = mock(SyncAllUsersJob.class);
    private final SyncProblemsetJob problemset = mock(SyncProblemsetJob.class);
    private final LlmCacheCleanupJob cleanup = mock(LlmCacheCleanupJob.class);
    private final JobScheduler scheduler = new JobScheduler(TestProperties.app(false), syncAll, problemset, cleanup);

    @Test
    void schedulesTheUserSyncOnSyncCronTheProblemsetWeeklyAndTheCleanupDaily() {
        var registrar = new ScheduledTaskRegistrar();
        scheduler.configureTasks(registrar);
        assertThat(registrar.getCronTaskList().stream().map(CronTask::getExpression))
                .containsExactly("0 0 */6 * * *", "0 0 3 * * SUN", "0 0 4 * * *");
        assertThat(scheduler.plans().stream().map(JobScheduler.Plan::job))
                .containsExactly("syncAllUsers", "syncProblemset", "llmCacheCleanup");
        assertThat(SyncSettings.PROBLEMSET_SYNC_CRON).isEqualTo("0 0 3 * * SUN");
    }

    @Test
    void runsTheMatchingJobWhenATaskFires() {
        var registrar = new ScheduledTaskRegistrar();
        scheduler.configureTasks(registrar);
        registrar.getCronTaskList().forEach(task -> task.getRunnable().run());
        verify(syncAll).run();
        verify(problemset).run();
        verify(cleanup).run();
        registrar.getCronTaskList().getFirst().getRunnable().run();
        verify(syncAll, times(2)).run();
    }

    @Test
    void convertsNodeCronToSpringCron() {
        assertThat(JobScheduler.toSpringCron(" */30 * * * * ")).isEqualTo("0 */30 * * * *");
    }

    @Test
    void skipsAFiringWhileTheSameJobStillRuns() throws Exception {
        var runs = new AtomicInteger();
        var inside = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var guarded = JobScheduler.noOverlap(new JobScheduler.Plan("slow", "* * * * * *", () -> {
            runs.incrementAndGet();
            inside.countDown();
            try {
                release.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }));
        var first = Thread.ofVirtual().start(guarded);
        inside.await();
        guarded.run();
        release.countDown();
        first.join();
        assertThat(runs).hasValue(1);
        guarded.run();
        assertThat(runs).hasValue(2);
    }
}
