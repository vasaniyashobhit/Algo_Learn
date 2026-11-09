package com.algolearn.sync;

import com.algolearn.support.CfData;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Users;
import com.algolearn.users.User;
import com.algolearn.users.UserRepository;
import java.time.Instant;
import java.util.UUID;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Legacy tests/helpers/sync.js: small pages so pagination is cheap (5 per page, 3 pages), no cooldown
 * (the cooldown tests set their own), a linked user "Ada_L" and the fake client knowing ada_l.
 */
abstract class SyncTestBase extends DatabaseTest {

    static final SyncSettings TEST_SYNC = new SyncSettings(5 * 60_000L, 5, 3, 0);
    static final Instant NOW = Instant.parse("2026-10-29T10:00:00Z");

    protected final UserRepository users;
    protected final SyncLock lock;
    protected final SubmissionWriter writer;

    SyncTestBase(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, SyncLock lock, SubmissionWriter writer) {
        super(mvc, jdbc);
        this.users = users;
        this.lock = lock;
        this.writer = writer;
    }

    @BeforeEach
    void fixTime() {
        clock.set(NOW);
        cf.withUser(CfData.user("Ada_L"));
    }

    SyncService service(SyncSettings settings, Consumer<UUID> onSynced) {
        return new SyncService(cf, lock, writer, jdbc, onSynced, clock, settings);
    }

    SyncService service() {
        return service(TEST_SYNC, id -> { });
    }

    User linkedUser() {
        return users.save(Users.user("Ada_L"));
    }

    User save(User user) {
        return users.save(user);
    }

    User reload(UUID id) {
        return users.findById(id).orElseThrow();
    }

    long count() {
        var count = jdbc.queryForObject("SELECT count(*) FROM submissions", Long.class);
        return count == null ? 0 : count;
    }
}
