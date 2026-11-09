package com.algolearn.jobs;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.support.CfData;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Users;
import com.algolearn.users.UserRepository;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** The real jobs on the test database: sync-all users with a handle, llm_cache cleanup, scheduler off. */
class JobsIT extends DatabaseTest {

    private final SyncAllUsersJob syncAll;
    private final LlmCacheCleanupJob cleanup;
    private final UserRepository users;
    private final ApplicationContext context;

    JobsIT(MockMvc mvc, JdbcTemplate jdbc, SyncAllUsersJob syncAll, LlmCacheCleanupJob cleanup, UserRepository users,
            ApplicationContext context) {
        super(mvc, jdbc);
        this.syncAll = syncAll;
        this.cleanup = cleanup;
        this.users = users;
        this.context = context;
    }

    @Test
    void syncsOnlyUsersWithAHandleAndCountsTheFailures() {
        cf.withUser(CfData.user("alpha")).withUser(CfData.user("beta")).withSubmissions(CfData.history(2));
        users.save(Users.user("alpha"));
        users.save(Users.user("beta"));
        users.save(Users.user());
        users.save(Users.user("gamma")); // unknown on Codeforces → CF_HANDLE_NOT_FOUND, logged and skipped
        var summary = syncAll.run();
        assertThat(summary).isEqualTo(new SyncAllUsersJob.Summary(false, 3, 2, 1, 2));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE last_synced_at IS NOT NULL", Long.class))
                .isEqualTo(2);
    }

    @Test
    void deletesLlmCacheRowsOlderThan30Days() {
        clock.set(Instant.parse("2026-10-29T00:00:00Z"));
        var insert = "INSERT INTO llm_cache (key, provider, model, response, created_at) VALUES (?, 'p', 'm', '{}', ?)";
        jdbc.update(insert, "old", java.sql.Timestamp.from(clock.instant().minus(Duration.ofDays(31))));
        jdbc.update(insert, "edge", java.sql.Timestamp.from(clock.instant().minus(Duration.ofDays(30))));
        jdbc.update(insert, "new", java.sql.Timestamp.from(clock.instant().minus(Duration.ofDays(1))));
        assertThat(cleanup.run()).hasValue(1);
        assertThat(jdbc.queryForList("SELECT key FROM llm_cache ORDER BY key", String.class))
                .containsExactly("edge", "new");
    }

    @Test
    void theSchedulerIsOffInTests() {
        assertThat(context.getBeanNamesForType(JobScheduler.class)).isEmpty();
    }
}
