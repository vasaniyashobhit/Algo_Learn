package com.algolearn.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.AppException;
import com.algolearn.support.Users;
import com.algolearn.users.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy sync.lock.test.js. */
class SyncLockIT extends SyncTestBase {

    static final long LOCK_MS = 5 * 60_000L;

    SyncLockIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, SyncLock lock, SubmissionWriter writer) {
        super(mvc, jdbc, users, lock, writer);
    }

    @Test
    void locksAFreeUserUntilNowPlusLockMs() {
        var user = save(Users.user());
        assertThat(lock.acquire(user.getId(), NOW, LOCK_MS).id()).isEqualTo(user.getId());
        assertThat(reload(user.getId()).getSyncLockedUntil()).isEqualTo(Instant.parse("2026-10-29T10:05:00Z"));
    }

    @Test
    void letsExactlyOneOfTwoConcurrentCallersWin() {
        var id = save(Users.user()).getId();
        var first = CompletableFuture.supplyAsync(() -> attempt(id));
        var second = CompletableFuture.supplyAsync(() -> attempt(id));
        assertThat(List.of(first.join(), second.join())).containsExactlyInAnyOrder("ok", "SYNC_IN_PROGRESS");
    }

    private String attempt(UUID id) {
        try {
            lock.acquire(id, NOW, LOCK_MS);
            return "ok";
        } catch (AppException e) {
            return e.code().name();
        }
    }

    @Test
    void treatsALockEndingExactlyNowAsExpiredAndRejectsAMissingUser() {
        var user = Users.user();
        user.setSyncLockedUntil(NOW);
        var id = save(user).getId();
        assertThat(lock.acquire(id, NOW, LOCK_MS)).isNotNull();
        assertThatThrownBy(() -> lock.acquire(UUID.randomUUID(), NOW, LOCK_MS)).isInstanceOfSatisfying(
                AppException.class, e -> assertThat(e.code().name()).isEqualTo("AUTH_INVALID_TOKEN"));
    }

    @Test
    void releaseClearsTheLock() {
        var user = Users.user();
        user.setSyncLockedUntil(NOW.plusSeconds(60));
        var id = save(user).getId();
        lock.release(id);
        assertThat(reload(id).getSyncLockedUntil()).isNull();
    }

    @Test
    void syncAnswers401ForADeletedAccount() {
        assertThatThrownBy(() -> service().syncUser(UUID.randomUUID())).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.status().value()).isEqualTo(401));
    }
}
