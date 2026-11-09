package com.algolearn.sync;

import com.algolearn.codeforces.CodeforcesClient;
import com.algolearn.stats.StatsService;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/** The one sync service: shared Codeforces client, default settings, stats recompute after every sync. */
@Configuration(proxyBeanMethods = false)
public class SyncConfig {

    @Bean
    SyncService syncService(CodeforcesClient client, SyncLock lock, SubmissionWriter writer, JdbcTemplate jdbc,
            StatsService stats, Clock clock) {
        return new SyncService(client, lock, writer, jdbc, stats::recomputeForUser, clock, SyncSettings.DEFAULT);
    }
}
