package com.algolearn.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.AppException;
import com.algolearn.support.CfData;
import com.algolearn.support.Users;
import com.algolearn.users.UserRepository;
import java.time.Duration;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy sync.service.errors.test.js. */
class SyncServiceErrorsIT extends SyncTestBase {

    SyncServiceErrorsIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, SyncLock lock, SubmissionWriter writer) {
        super(mvc, jdbc, users, lock, writer);
    }

    private void expectError(Runnable call, int status, String code) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(AppException.class, e -> {
            assertThat(e.status().value()).isEqualTo(status);
            assertThat(e.code().name()).isEqualTo(code);
        });
    }

    @Test
    void answers409WhileTheLockIsHeldAndLeavesItAlone() {
        cf.withSubmissions(CfData.history(3));
        var user = linkedUser();
        var lockedUntil = NOW.plusSeconds(60);
        user.setSyncLockedUntil(lockedUntil);
        save(user);
        expectError(() -> service().syncUser(user.getId()), 409, "SYNC_IN_PROGRESS");
        assertThat(reload(user.getId()).getSyncLockedUntil()).isEqualTo(lockedUntil);
    }

    @Test
    void takesOverAnExpiredLock() {
        cf.withSubmissions(CfData.history(3));
        var user = linkedUser();
        user.setSyncLockedUntil(NOW.minusSeconds(1));
        save(user);
        assertThat(service().syncUser(user.getId()).newSubmissions()).isEqualTo(3);
    }

    @Test
    void setsTheLockToNowPlus5MinutesDuringTheSync() {
        cf.withSubmissions(CfData.history(3));
        var user = linkedUser();
        var seen = new ArrayList<Object>();
        service(TEST_SYNC, id -> seen.add(reload(id).getSyncLockedUntil())).syncUser(user.getId());
        assertThat(seen).containsExactly(NOW.plus(Duration.ofMinutes(5)));
    }

    @Test
    void answers400WithoutAHandleAndReleasesTheLock() {
        var user = save(Users.user());
        expectError(() -> service().syncUser(user.getId()), 400, "CF_HANDLE_NOT_LINKED");
        assertThat(reload(user.getId()).getSyncLockedUntil()).isNull();
    }

    @Test
    void answers503WhenCodeforcesIsDownAndReleasesTheLock() {
        cf.failStatus = CfData::down;
        var user = linkedUser();
        expectError(() -> service().syncUser(user.getId()), 503, "CF_UNAVAILABLE");
        var stored = reload(user.getId());
        assertThat(stored.getSyncLockedUntil()).isNull();
        assertThat(stored.getLastSyncedAt()).isNull();
    }

    @Test
    void mapsAnUnexpectedClientFailureTo503AndKeepsTheCursorForARetry() {
        cf.withSubmissions(CfData.history(3));
        cf.failInfo = () -> new IllegalStateException("socket hang up");
        var user = linkedUser();
        expectError(() -> service().syncUser(user.getId()), 503, "CF_UNAVAILABLE");
        var stored = reload(user.getId());
        assertThat(stored.getSyncLockedUntil()).isNull();
        assertThat(stored.getLastSubmissionId()).isNull();
        assertThat(count()).isEqualTo(3);
    }

    @Test
    void releasesTheLockWhenTheOnSyncedHookFails() {
        cf.withSubmissions(CfData.history(3));
        var user = linkedUser();
        var failing = service(TEST_SYNC, id -> {
            throw new IllegalStateException("stats failed");
        });
        assertThatThrownBy(() -> failing.syncUser(user.getId())).hasMessage("stats failed");
        assertThat(reload(user.getId()).getSyncLockedUntil()).isNull();
    }
}
