package com.algolearn.jobs;

import com.algolearn.config.AppProperties;
import com.algolearn.sync.SyncSettings;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

/**
 * In-process schedule (legacy scheduler.js): user sync on SYNC_CRON, problemset refresh every Sunday
 * at 03:00, llm_cache cleanup daily. Off with {@code algolearn.jobs.scheduler-enabled=false} (tests)
 * and for {@code --task} runs. A firing while the same job still runs is skipped (node-cron noOverlap).
 * SYNC_CRON is validated at startup (EnvValidator), so a bad expression never gets here.
 */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnWebApplication
@ConditionalOnProperty(name = "algolearn.jobs.scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class JobScheduler implements SchedulingConfigurer {

    private static final Logger LOG = LoggerFactory.getLogger(JobScheduler.class);

    private final List<Plan> plans;

    public JobScheduler(AppProperties properties, SyncAllUsersJob syncAll, SyncProblemsetJob problemset,
            LlmCacheCleanupJob cleanup) {
        this.plans = List.of(
                new Plan(SyncAllUsersJob.NAME, toSpringCron(properties.syncCron()), syncAll::run),
                new Plan(SyncProblemsetJob.NAME, SyncSettings.PROBLEMSET_SYNC_CRON, problemset::run),
                new Plan(LlmCacheCleanupJob.NAME, LlmCacheCleanupJob.CRON, cleanup::run));
    }

    /** node-cron's 5 fields (minute hour day month weekday) with Spring's leading seconds field. */
    static String toSpringCron(String fiveFields) {
        return "0 " + fiveFields.trim();
    }

    List<Plan> plans() {
        return plans;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        plans.forEach(plan -> registrar.addCronTask(noOverlap(plan), plan.cron()));
        LOG.info("Scheduler started: {}", plans.stream().map(p -> p.job() + " @ " + p.cron()).toList());
    }

    static Runnable noOverlap(Plan plan) {
        var running = new AtomicBoolean();
        return () -> {
            if (!running.compareAndSet(false, true)) {
                LOG.info("Job already running, skipped (job={})", plan.job());
                return;
            }
            try {
                plan.task().run();
            } finally {
                running.set(false);
            }
        };
    }

    /** One scheduled job: its name, Spring cron expression and what it runs. */
    record Plan(String job, String cron, Runnable task) {
    }
}
