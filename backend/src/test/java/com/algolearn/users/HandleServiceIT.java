package com.algolearn.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.support.CfData;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Users;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy handle.service.test.js. */
class HandleServiceIT extends DatabaseTest {

    private final HandleService service;
    private final UserRepository users;

    HandleServiceIT(MockMvc mvc, JdbcTemplate jdbc, HandleService service, UserRepository users) {
        super(mvc, jdbc);
        this.service = service;
        this.users = users;
    }

    @BeforeEach
    void knowHandles() {
        cf.withUser(CfData.user("tourist")).withUser(CfData.user("Petr", null, 2000));
    }

    private long rows(String table, UUID userId) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE user_id = ?", Long.class, userId);
    }

    /** A synced "tourist" with one submission and one topic stat, plus another user's submission. */
    private User seedSyncedUser(Instant lockedUntil) {
        var user = Users.user("tourist");
        user.setLastSubmissionId(99L);
        user.setLastSyncedAt(Instant.now());
        user.setCfRating(3000);
        user.setSyncLockedUntil(lockedUntil);
        var saved = users.save(user);
        var other = users.save(Users.user());
        jdbc.update("INSERT INTO submissions (cf_submission_id, user_id, problem_id, contest_id, idx, verdict, "
                + "submitted_at) VALUES (1, ?, '1/B', 1, 'B', 'OK', now()), (2, ?, '2/B', 2, 'B', 'OK', now())",
                saved.getId(), other.getId());
        jdbc.update("INSERT INTO topic_stats (user_id, topic_key, kind) VALUES (?, 'dp', 'single')", saved.getId());
        return saved;
    }

    @Test
    void keepsSyncedDataWhenTheSameHandleIsLinkedAgain() {
        var user = seedSyncedUser(null);
        service.linkHandle(user.getId(), "TOURIST");
        assertThat(rows("submissions", user.getId())).isEqualTo(1);
        assertThat(users.findById(user.getId()).orElseThrow().getLastSubmissionId()).isEqualTo(99);
    }

    @Test
    void resetsTheSyncStateAndDeletesOldDataWhenTheHandleChanges() {
        var user = seedSyncedUser(null);
        var result = service.linkHandle(user.getId(), "petr");
        assertThat(result.cfHandle()).isEqualTo("Petr");
        assertThat(result.cfRating()).isNull();
        assertThat(result.lastSyncedAt()).isNull();
        assertThat(rows("submissions", user.getId()) + rows("topic_stats", user.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM submissions", Long.class)).isEqualTo(1);
        assertThat(users.findById(user.getId()).orElseThrow().getLastSubmissionId()).isNull();
    }

    @Test
    void unlinksHandleRatingsSyncStateSubmissionsAndTopicStats() {
        var user = seedSyncedUser(null);
        var result = service.unlinkHandle(user.getId());
        assertThat(result.cfHandle()).isNull();
        assertThat(result.cfRating()).isNull();
        assertThat(result.cfMaxRating()).isNull();
        assertThat(result.lastSyncedAt()).isNull();
        assertThat(users.findById(user.getId()).orElseThrow().getLastSubmissionId()).isNull();
        assertThat(rows("submissions", user.getId()) + rows("topic_stats", user.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM submissions", Long.class)).isEqualTo(1);
    }

    @Test
    void refusesToLinkOrUnlinkWhileASyncIsRunning() {
        var user = seedSyncedUser(Instant.now().plusSeconds(3600));
        assertThatThrownBy(() -> service.linkHandle(user.getId(), "petr")).hasMessageContaining("already running");
        assertThatThrownBy(() -> service.unlinkHandle(user.getId())).hasMessageContaining("already running");
        assertThat(rows("submissions", user.getId())).isEqualTo(1);
    }

    @Test
    void answersAuthInvalidTokenForADeletedAccount() {
        assertThatThrownBy(() -> service.linkHandle(UUID.randomUUID(), "tourist")).hasMessage(
                "This account no longer exists");
        assertThatThrownBy(() -> service.unlinkHandle(UUID.randomUUID())).hasMessage("This account no longer exists");
    }
}
