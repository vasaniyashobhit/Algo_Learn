package com.algolearn.stats;

import com.algolearn.common.db.SqlTime;
import com.algolearn.stats.calc.TopicStatDoc;
import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Replaces a user's topic_stats rows (legacy bulkWrite: delete the keys that are gone, then
 * upsert-replace every current key). Callers run both steps in one transaction.
 */
@Repository
public class TopicStatWriter {

    private static final String UPSERT = """
            INSERT INTO topic_stats (user_id, topic_key, kind, attempted, solved, failed, avg_solved_rating,
                max_solved_rating, comfort_rating, strength, last_activity_at, last_results, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)
            ON CONFLICT (user_id, topic_key) DO UPDATE SET kind = EXCLUDED.kind, attempted = EXCLUDED.attempted,
                solved = EXCLUDED.solved, failed = EXCLUDED.failed, avg_solved_rating = EXCLUDED.avg_solved_rating,
                max_solved_rating = EXCLUDED.max_solved_rating, comfort_rating = EXCLUDED.comfort_rating,
                strength = EXCLUDED.strength, last_activity_at = EXCLUDED.last_activity_at,
                last_results = EXCLUDED.last_results, updated_at = EXCLUDED.updated_at
            """;

    private final JdbcTemplate jdbc;
    private final LastResultsJson json;

    public TopicStatWriter(JdbcTemplate jdbc, LastResultsJson json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** Deletes this user's rows whose key is not in {@code keep}; returns how many were removed. */
    public int deleteStale(UUID userId, List<String> keep) {
        return jdbc.update(connection -> {
            var ps = connection.prepareStatement(
                    "DELETE FROM topic_stats WHERE user_id = ? AND NOT (topic_key = ANY (?))");
            ps.setObject(1, userId);
            ps.setArray(2, connection.createArrayOf("text", keep.toArray()));
            return ps;
        });
    }

    public void upsert(UUID userId, List<TopicStatDoc> docs, Instant now) {
        jdbc.batchUpdate(UPSERT, docs, docs.size(), (ps, doc) -> {
            ps.setObject(1, userId);
            ps.setString(2, doc.topicKey());
            ps.setString(3, doc.kind());
            ps.setInt(4, doc.attempted());
            ps.setInt(5, doc.solved());
            ps.setInt(6, doc.failed());
            ps.setObject(7, doc.avgSolvedRating(), Types.DOUBLE);
            ps.setObject(8, doc.maxSolvedRating(), Types.DOUBLE);
            ps.setObject(9, doc.comfortRating(), Types.DOUBLE);
            ps.setDouble(10, doc.strength());
            ps.setObject(11, SqlTime.of(doc.lastActivityAt()));
            ps.setString(12, json.write(doc.lastResults()));
            ps.setObject(13, SqlTime.of(now));
        });
    }
}
