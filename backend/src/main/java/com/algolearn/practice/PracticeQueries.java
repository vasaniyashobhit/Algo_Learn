package com.algolearn.practice;

import com.algolearn.common.db.SqlTime;
import com.algolearn.problems.ProblemRows;
import com.algolearn.problems.dto.ProblemSummary;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Native SQL for practice_items; every write returns the full row. Times come from the injected clock. */
@Repository
public class PracticeQueries {

    private static final String COLUMNS = "id, problem_id, status, added_from, created_at, updated_at";
    private static final String KEY = "user_id = :userId AND problem_id = :problemId";

    private final NamedParameterJdbcTemplate jdbc;

    public PracticeQueries(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Newest first; {@code status} null = every item. */
    public List<PracticeRow> list(UUID userId, String status) {
        var params = new MapSqlParameterSource("userId", userId).addValue("status", status);
        return jdbc.query("SELECT " + COLUMNS + " FROM practice_items WHERE user_id = :userId AND "
                + "(CAST(:status AS text) IS NULL OR status = :status) ORDER BY created_at DESC, id DESC", params,
                (rs, i) -> row(rs));
    }

    public List<String> problemIds(UUID userId) {
        return jdbc.queryForList("SELECT problem_id FROM practice_items WHERE user_id = :userId",
                new MapSqlParameterSource("userId", userId), String.class);
    }

    /** A DuplicateKeyException (uk_practice_user_problem) when the user already has the problem. */
    public PracticeRow insert(UUID userId, String problemId, String addedFrom, Instant now) {
        return one("INSERT INTO practice_items (user_id, problem_id, added_from, created_at, updated_at) VALUES "
                + "(:userId, :problemId, :addedFrom, :now, :now) RETURNING " + COLUMNS,
                key(userId, problemId).addValue("addedFrom", addedFrom).addValue("now", SqlTime.of(now))).orElseThrow();
    }

    public Optional<PracticeRow> updateStatus(UUID userId, String problemId, String status, Instant now) {
        return one("UPDATE practice_items SET status = :status, updated_at = :now WHERE " + KEY + " RETURNING "
                + COLUMNS, key(userId, problemId).addValue("status", status).addValue("now", SqlTime.of(now)));
    }

    public Optional<PracticeRow> delete(UUID userId, String problemId) {
        return one("DELETE FROM practice_items WHERE " + KEY + " RETURNING " + COLUMNS, key(userId, problemId));
    }

    /** Status solved; a new item is created with addedFrom "recommendation" (an existing one keeps its origin). */
    public PracticeRow markSolved(UUID userId, String problemId, Instant now) {
        return one("INSERT INTO practice_items (user_id, problem_id, status, added_from, created_at, updated_at) "
                + "VALUES (:userId, :problemId, 'solved', 'recommendation', :now, :now) ON CONFLICT ON CONSTRAINT "
                + "uk_practice_user_problem DO UPDATE SET status = 'solved', updated_at = :now RETURNING " + COLUMNS,
                key(userId, problemId).addValue("now", SqlTime.of(now))).orElseThrow();
    }

    /** Problem summaries by id (missing problems are simply absent). */
    public Map<String, ProblemSummary> summaries(Collection<String> ids) {
        var byId = new LinkedHashMap<String, ProblemSummary>();
        if (ids.isEmpty()) {
            return byId;
        }
        jdbc.query("SELECT " + ProblemRows.SUMMARY_COLUMNS + " FROM problems WHERE id = ANY(CAST(:ids AS text[]))",
                new MapSqlParameterSource("ids", ids.toArray(String[]::new)), rs -> {
                    var summary = ProblemRows.summary(rs, null);
                    byId.put(summary.id(), summary);
                });
        return byId;
    }

    public Optional<ProblemSummary> summary(String id) {
        return Optional.ofNullable(summaries(List.of(id)).get(id));
    }

    private Optional<PracticeRow> one(String sql, MapSqlParameterSource params) {
        return jdbc.query(sql, params, (rs, i) -> row(rs)).stream().findFirst();
    }

    private static MapSqlParameterSource key(UUID userId, String problemId) {
        return new MapSqlParameterSource("userId", userId).addValue("problemId", problemId);
    }

    private static PracticeRow row(ResultSet rs) throws SQLException {
        return new PracticeRow(rs.getObject("id", UUID.class), rs.getString("problem_id"), rs.getString("status"),
                rs.getString("added_from"), SqlTime.instant(rs.getTimestamp("created_at")),
                SqlTime.instant(rs.getTimestamp("updated_at")));
    }
}
