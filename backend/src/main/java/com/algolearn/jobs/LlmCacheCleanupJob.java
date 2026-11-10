package com.algolearn.jobs;

import com.algolearn.common.db.SqlTime;
import java.time.Clock;
import java.time.Duration;
import java.util.OptionalInt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Daily llm_cache cleanup: deletes answers older than 30 days (replaces the legacy TTL index
 * {@code expireAfterSeconds: LLM_CACHE_TTL_SECONDS}). Never throws.
 */
@Component
public class LlmCacheCleanupJob {

    public static final String NAME = "llmCacheCleanup";
    /** Daily at 04:00 server time. */
    public static final String CRON = "0 0 4 * * *";
    public static final Duration TTL = Duration.ofDays(30);
    private static final Logger LOG = LoggerFactory.getLogger(LlmCacheCleanupJob.class);

    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final JobErrorHandler errors;

    public LlmCacheCleanupJob(JdbcTemplate jdbc, Clock clock, JobErrorHandler errors) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.errors = errors;
    }

    /** How many rows were deleted (empty when the delete failed). */
    public OptionalInt run() {
        try {
            var cutoff = clock.instant().minus(TTL);
            var deleted = jdbc.update("DELETE FROM llm_cache WHERE created_at < ?", SqlTime.of(cutoff));
            LOG.info("Job finished (job={}, deleted={})", NAME, deleted);
            return OptionalInt.of(deleted);
        } catch (RuntimeException e) {
            errors.handle(e, NAME, null);
            return OptionalInt.empty();
        }
    }
}
