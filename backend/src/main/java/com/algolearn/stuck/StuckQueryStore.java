package com.algolearn.stuck;

import com.algolearn.common.db.SqlTime;
import com.algolearn.stuck.result.StuckResult;
import com.algolearn.stuck.result.StuckSolution;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

/**
 * {@code stuck_queries} rows (JDBC): insert with {@code created_at} from the injected Clock (milliseconds, like a JS
 * Date), and per-user reads and deletes. {@code result}, {@code gap} and {@code solution} are jsonb.
 */
@Repository
public class StuckQueryStore {

    static final String ROW = "id, input_type, created_at, source, matched_problem_id, detected_tags, tags_source, "
            + "estimated_rating, gap::text AS gap, result::text AS result, solution::text AS solution";

    private final NamedParameterJdbcTemplate jdbc;
    private final JsonMapper mapper;
    private final Clock clock;

    public StuckQueryStore(NamedParameterJdbcTemplate jdbc, JsonMapper mapper, Clock clock) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.clock = clock;
    }

    public StoredQuery save(NewQuery q) {
        var params = new MapSqlParameterSource("user", q.userId()).addValue("type", q.inputType())
                .addValue("raw", StuckQuery.truncateRawInput(q.rawInput() == null ? "" : q.rawInput()))
                .addValue("matched", q.matchedProblemId()).addValue("tags", q.detectedTags().toArray(String[]::new))
                .addValue("tagsSource", q.tagsSource()).addValue("rating", q.estimatedRating())
                .addValue("gap", mapper.writeValueAsString(q.gap()))
                .addValue("result", mapper.writeValueAsString(q.result()))
                .addValue("solution", q.solution() == null ? null : mapper.writeValueAsString(q.solution()))
                .addValue("source", q.source())
                .addValue("now", SqlTime.of(clock.instant().truncatedTo(ChronoUnit.MILLIS)));
        return jdbc.queryForObject("""
                INSERT INTO stuck_queries (user_id, input_type, raw_input, matched_problem_id, detected_tags,
                  tags_source, estimated_rating, gap, result, solution, source, created_at)
                VALUES (:user, :type, :raw, :matched, :tags, :tagsSource, :rating, :gap::jsonb, :result::jsonb,
                  :solution::jsonb, :source, :now)
                RETURNING""" + " " + ROW, params, this::row);
    }

    public Optional<StoredQuery> find(UUID userId, UUID id) {
        return jdbc.query("SELECT " + ROW + " FROM stuck_queries WHERE id = :id AND user_id = :user",
                new MapSqlParameterSource("id", id).addValue("user", userId), this::row).stream().findFirst();
    }

    /** One page of the user's queries, newest first. */
    public List<StoredQuery> page(UUID userId, int offset, int limit) {
        return jdbc.query("SELECT " + ROW + " FROM stuck_queries WHERE user_id = :user "
                + "ORDER BY created_at DESC, id DESC OFFSET :offset LIMIT :limit", new MapSqlParameterSource("user",
                userId).addValue("offset", offset).addValue("limit", limit), this::row);
    }

    public long count(UUID userId) {
        var total = jdbc.queryForObject("SELECT count(*) FROM stuck_queries WHERE user_id = :user",
                new MapSqlParameterSource("user", userId), Long.class);
        return total == null ? 0 : total;
    }

    public int delete(UUID userId, UUID id) {
        return jdbc.update("DELETE FROM stuck_queries WHERE id = :id AND user_id = :user",
                new MapSqlParameterSource("id", id).addValue("user", userId));
    }

    public Optional<String> editorial(String problemId) {
        return jdbc.queryForList("SELECT editorial FROM problems WHERE id = :id",
                new MapSqlParameterSource("id", problemId), String.class).stream().findFirst();
    }

    private StoredQuery row(ResultSet rs, int i) throws SQLException {
        var tags = rs.getArray("detected_tags");
        return new StoredQuery(rs.getObject("id", UUID.class), rs.getString("input_type"),
                SqlTime.instant(rs.getTimestamp("created_at")), rs.getString("source"),
                rs.getString("matched_problem_id"), tags == null ? List.of() : List.of((String[]) tags.getArray()),
                rs.getString("tags_source"), rs.getObject("estimated_rating", Integer.class),
                List.of(read(rs.getString("gap"), GapItem[].class)), read(rs.getString("result"), StuckResult.class),
                read(rs.getString("solution"), StuckSolution.class));
    }

    private <T> T read(String json, Class<T> type) {
        return json == null ? null : mapper.readValue(json, type);
    }
}
