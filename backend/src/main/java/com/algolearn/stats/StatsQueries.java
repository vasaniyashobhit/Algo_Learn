package com.algolearn.stats;

import com.algolearn.common.db.SqlTime;
import com.algolearn.stats.calc.SubmissionRow;
import com.algolearn.stats.calc.TopicStatDoc;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Native SQL for the stats: the user's submissions and topic_stats rows (writes in {@link TopicStatWriter}). */
@Repository
public class StatsQueries {

    /** Mongo sorted by binary key order; {@code COLLATE "C"} gives the same order. */
    private static final Map<String, String> ORDER = Map.of(
            "strength", "strength DESC, attempted DESC, topic_key COLLATE \"C\"",
            "attempted", "attempted DESC, strength DESC, topic_key COLLATE \"C\"");
    private static final String STAT_COLUMNS = "topic_key, kind, attempted, solved, failed, avg_solved_rating, "
            + "max_solved_rating, comfort_rating, strength, last_activity_at, last_results::text AS last_results";

    private final JdbcTemplate jdbc;
    private final LastResultsJson json;

    public StatsQueries(JdbcTemplate jdbc, LastResultsJson json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** Oldest first, so equal timestamps keep a stable order. */
    public List<SubmissionRow> submissions(UUID userId) {
        return jdbc.query("SELECT problem_id, problem_rating, problem_tags, verdict, submitted_at FROM submissions "
                + "WHERE user_id = ? ORDER BY submitted_at, cf_submission_id", (rs, i) -> new SubmissionRow(
                rs.getString("problem_id"), rs.getObject("problem_rating", Integer.class), strings(rs.getArray(3)),
                rs.getString("verdict"), SqlTime.instant(rs.getTimestamp("submitted_at"))), userId);
    }

    public List<TopicStatDoc> all(UUID userId) {
        return jdbc.query("SELECT " + STAT_COLUMNS + " FROM topic_stats WHERE user_id = ? ORDER BY topic_key "
                + "COLLATE \"C\"", (rs, i) -> doc(rs), userId);
    }

    /** One kind, sorted like the legacy SORTS map ({@code sort} is one of the two validated names). */
    public List<TopicStatDoc> page(UUID userId, String kind, String sort, int limit) {
        var order = ORDER.get(sort);
        return jdbc.query("SELECT " + STAT_COLUMNS + " FROM topic_stats WHERE user_id = ? AND kind = ? ORDER BY "
                + order + " LIMIT ?", (rs, i) -> doc(rs), userId, kind, limit);
    }

    public long count(UUID userId, String kind) {
        var count = jdbc.queryForObject("SELECT count(*) FROM topic_stats WHERE user_id = ? AND kind = ?",
                Long.class, userId, kind);
        return count == null ? 0 : count;
    }

    private TopicStatDoc doc(ResultSet rs) throws SQLException {
        return new TopicStatDoc(rs.getString("topic_key"), rs.getString("kind"), rs.getInt("attempted"),
                rs.getInt("solved"), rs.getInt("failed"), rating(rs, "avg_solved_rating"),
                rating(rs, "max_solved_rating"), rating(rs, "comfort_rating"), rs.getDouble("strength"),
                SqlTime.instant(rs.getTimestamp("last_activity_at")), json.read(rs.getString("last_results")));
    }

    private static Integer rating(ResultSet rs, String column) throws SQLException {
        var value = rs.getObject(column, Double.class);
        return value == null ? null : (int) Math.round(value);
    }

    static List<String> strings(Array array) throws SQLException {
        return array == null ? List.of() : Arrays.asList((String[]) array.getArray());
    }
}
