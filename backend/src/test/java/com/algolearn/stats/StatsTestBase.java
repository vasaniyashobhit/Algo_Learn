package com.algolearn.stats;

import com.algolearn.common.db.SqlTime;
import com.algolearn.stats.calc.TopicStatDoc;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Users;
import com.algolearn.users.User;
import com.algolearn.users.UserRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy tests/helpers/stats.js: a fixed STATS_NOW, synced users, submission specs, stats by key. */
abstract class StatsTestBase extends DatabaseTest {

    static final Instant STATS_NOW = Instant.parse("2026-10-29T12:00:00Z");
    private static final AtomicLong SEQ = new AtomicLong();

    protected final StatsService service;
    protected final UserRepository users;
    protected final StatsQueries queries;

    StatsTestBase(MockMvc mvc, JdbcTemplate jdbc, StatsService service, UserRepository users, StatsQueries queries) {
        super(mvc, jdbc);
        this.service = service;
        this.users = users;
        this.queries = queries;
    }

    @BeforeEach
    void fixTime() {
        clock.set(STATS_NOW);
    }

    /** A user with a linked, already-synced handle "Ada_L" (rating 1200 unless changed). */
    User syncedUser(String handle, Integer rating, Instant lastSyncedAt) {
        var user = Users.user(handle);
        user.setCfRating(rating);
        user.setLastSyncedAt(lastSyncedAt);
        return users.save(user);
    }

    User syncedUser() {
        return syncedUser("Ada_L", 1200, STATS_NOW);
    }

    /** One submission of {@code userId}: problem "c/i", tags, rating, verdict, days before STATS_NOW. */
    void submit(UUID userId, String problemId, List<String> tags, Integer rating, String verdict, double daysAgo) {
        var parts = problemId.split("/");
        jdbc.update(connection -> {
            var ps = connection.prepareStatement("INSERT INTO submissions (cf_submission_id, user_id, problem_id, "
                    + "contest_id, idx, problem_rating, problem_tags, verdict, submitted_at) VALUES (?, ?, ?, ?, ?, ?, "
                    + "?, ?, ?)");
            ps.setLong(1, SEQ.incrementAndGet());
            ps.setObject(2, userId);
            ps.setString(3, problemId);
            ps.setInt(4, Integer.parseInt(parts[0]));
            ps.setString(5, parts[1]);
            ps.setObject(6, rating, java.sql.Types.INTEGER);
            ps.setArray(7, connection.createArrayOf("text", tags.toArray()));
            ps.setString(8, verdict);
            ps.setObject(9, SqlTime.of(STATS_NOW.minusMillis((long) (daysAgo * StatsConstants.DAY_MS))));
            return ps;
        });
    }

    void submit(UUID userId, String problemId, List<String> tags, Integer rating, String verdict) {
        submit(userId, problemId, tags, rating, verdict, 0);
    }

    /** A stored topic stat row with the given strength and attempts. */
    void stat(UUID userId, String key, double strength, int attempted, String kind) {
        jdbc.update("INSERT INTO topic_stats (user_id, topic_key, kind, strength, attempted, failed) VALUES (?, ?, ?, "
                + "?, ?, ?)", userId, key, kind, strength, attempted, attempted);
    }

    Map<String, TopicStatDoc> statsOf(UUID userId) {
        var byKey = new LinkedHashMap<String, TopicStatDoc>();
        queries.all(userId).forEach(doc -> byKey.put(doc.topicKey(), doc));
        return byKey;
    }
}
