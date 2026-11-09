package com.algolearn.support;

import com.algolearn.common.db.SqlTime;
import com.algolearn.users.User;
import com.algolearn.users.UserRepository;
import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.jdbc.core.JdbcTemplate;

/** Legacy createSyncedUser / insertSubmissions / insertTopicStats / addToPractice for any package. */
public final class UserData {

    public static final Instant STATS_NOW = Instant.parse("2026-10-29T12:00:00Z");
    private static final long DAY_MS = 86_400_000L;
    private static final AtomicLong SEQ = new AtomicLong(1_000_000);

    private UserData() {
    }

    /** A user with a linked, already-synced handle "Ada_L". */
    public static User syncedUser(UserRepository users, Integer cfRating) {
        var user = Users.user("Ada_L");
        user.setCfRating(cfRating);
        user.setLastSyncedAt(STATS_NOW);
        return users.save(user);
    }

    /** One submission {@code daysAgo} days before STATS_NOW (a fresh Codeforces id). */
    public static void submit(JdbcTemplate jdbc, UUID userId, String problemId, List<String> tags, Integer rating,
            String verdict, double daysAgo) {
        submit(jdbc, userId, SEQ.incrementAndGet(), problemId, tags, rating, verdict,
                STATS_NOW.minusMillis((long) (daysAgo * DAY_MS)));
    }

    public static void submit(JdbcTemplate jdbc, UUID userId, String problemId, List<String> tags, Integer rating,
            String verdict) {
        submit(jdbc, userId, problemId, tags, rating, verdict, 0);
    }

    public static void submit(JdbcTemplate jdbc, UUID userId, long cfId, String problemId, List<String> tags,
            Integer rating, String verdict, Instant at) {
        var parts = problemId.split("/");
        jdbc.update(connection -> {
            var ps = connection.prepareStatement("INSERT INTO submissions (cf_submission_id, user_id, problem_id, "
                    + "contest_id, idx, problem_rating, problem_tags, verdict, submitted_at) VALUES "
                    + "(?, ?, ?, ?, ?, ?, ?, ?, ?)");
            ps.setLong(1, cfId);
            ps.setObject(2, userId);
            ps.setString(3, problemId);
            ps.setInt(4, Integer.parseInt(parts[0]));
            ps.setString(5, parts[1]);
            ps.setObject(6, rating, Types.INTEGER);
            ps.setArray(7, connection.createArrayOf("text", tags.toArray()));
            ps.setString(8, verdict);
            ps.setObject(9, SqlTime.of(at));
            return ps;
        });
    }

    /** A single-topic stat: solved = round(attempted · strength). */
    public static void stat(JdbcTemplate jdbc, UUID userId, String topic, int attempted, double strength,
            Integer comfortRating) {
        var solved = (int) Math.round(attempted * strength);
        jdbc.update("INSERT INTO topic_stats (user_id, topic_key, kind, attempted, solved, failed, strength, "
                + "comfort_rating) VALUES (?, ?, 'single', ?, ?, ?, ?, ?)", userId, topic, attempted, solved,
                attempted - solved, strength, comfortRating);
    }

    /** A practice item (status todo, addedFrom as given) created at {@code at}. */
    public static void practice(JdbcTemplate jdbc, UUID userId, String problemId, String addedFrom, Instant at) {
        jdbc.update("INSERT INTO practice_items (user_id, problem_id, added_from, created_at, updated_at) VALUES "
                + "(?, ?, ?, ?, ?)", userId, problemId, addedFrom, SqlTime.of(at), SqlTime.of(at));
    }

    public static void practice(JdbcTemplate jdbc, UUID userId, String problemId) {
        practice(jdbc, userId, problemId, "manual", Instant.now());
    }
}
