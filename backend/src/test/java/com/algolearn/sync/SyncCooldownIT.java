package com.algolearn.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.RateLimitException;
import com.algolearn.support.CfData;
import com.algolearn.users.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy sync.service.cooldown.test.js. */
class SyncCooldownIT extends SyncTestBase {

    static final long LOCK_MS = 5 * 60_000L;

    SyncCooldownIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, SyncLock lock, SubmissionWriter writer) {
        super(mvc, jdbc, users, lock, writer);
    }

    private SyncService cooling() {
        return service(new SyncSettings(LOCK_MS, 5, 3, 20_000), id -> { });
    }

    private UUID syncedAgo(Duration ago, Instant lockedUntil) {
        var user = linkedUser();
        user.setLastSyncedAt(NOW.minus(ago));
        user.setSyncLockedUntil(lockedUntil);
        return save(user).getId();
    }

    @Test
    void refusesWithin20SecondsWithRateLimitedAndReleasesTheLock() {
        cf.withSubmissions(CfData.history(2));
        var id = syncedAgo(Duration.ofMillis(5_500), null);
        assertThatThrownBy(() -> cooling().syncUser(id)).isInstanceOfSatisfying(RateLimitException.class, e -> {
            assertThat(e.status().value()).isEqualTo(429);
            assertThat(e.code().name()).isEqualTo("RATE_LIMITED");
            assertThat(e.details()).isEqualTo(Map.of("retryAfterSeconds", 15L));
        });
        assertThat(cf.statusCalls).isEmpty();
        assertThat(reload(id).getSyncLockedUntil()).isNull();
    }

    @Test
    void syncsAgainOnce20SecondsHavePassed() {
        cf.withSubmissions(CfData.history(2));
        assertThat(cooling().syncUser(syncedAgo(Duration.ofSeconds(20), null)).newSubmissions()).isEqualTo(2);
    }

    @Test
    void ignoresTheCooldownWhenAsked() {
        cf.withSubmissions(CfData.history(1));
        assertThat(cooling().syncUser(syncedAgo(Duration.ofSeconds(1), null), true).newSubmissions()).isEqualTo(1);
    }

    @Test
    void reportsSyncInProgressBeforeTheCooldownWhileTheLockIsHeld() {
        var id = syncedAgo(Duration.ofSeconds(1), NOW.plusSeconds(60));
        assertThatThrownBy(() -> cooling().syncUser(id)).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.code().name()).isEqualTo("SYNC_IN_PROGRESS"));
    }
}
