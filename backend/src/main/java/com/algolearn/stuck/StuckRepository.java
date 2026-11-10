package com.algolearn.stuck;

import com.algolearn.common.validation.JsText;
import com.algolearn.problems.ProblemListQueries;
import com.algolearn.stuck.gap.GapAnalysis.TopicStatRow;
import com.algolearn.stuck.match.StuckProblem;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Database reads of solve() (legacy stuck.repository): problems by id or by text search, the user's topic stats,
 * rating and solved ids. Bind parameters only.
 */
@Repository
public class StuckRepository {

    static final String COLUMNS = "id, title, description, input_format, output_format, note, editorial, rating, tags";

    private final NamedParameterJdbcTemplate jdbc;

    public StuckRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<StuckProblem> findProblem(String id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM problems WHERE id = :id", new MapSqlParameterSource("id", id),
                StuckRepository::problem).stream().findFirst();
    }

    /** The {@code limit} best full-text matches (any word, title weighted 3:1), like the Mongo $text search. */
    public List<StuckProblem> searchProblems(String query, int limit) {
        var words = query == null ? "" : ProblemListQueries.anyWord(query);
        if (JsText.isBlank(words)) {
            return List.of();
        }
        return jdbc.query("SELECT " + COLUMNS + " FROM problems WHERE search @@ websearch_to_tsquery('english', :q) "
                + "ORDER BY " + ProblemListQueries.RANK + " DESC, id COLLATE \"C\" LIMIT :limit",
                new MapSqlParameterSource("q", words).addValue("limit", limit), StuckRepository::problem);
    }

    public List<TopicStatRow> topicStats(UUID userId, List<String> keys) {
        return jdbc.query("SELECT topic_key, kind, strength, attempted FROM topic_stats WHERE user_id = :user "
                + "AND topic_key = ANY(:keys)", new MapSqlParameterSource("user", userId)
                .addValue("keys", keys.toArray(String[]::new)), (rs, i) -> new TopicStatRow(rs.getString("topic_key"),
                rs.getString("kind"), rs.getDouble("strength"), rs.getInt("attempted")));
    }

    /** The user's Codeforces rating (null when unknown) and the ids of the problems they solved. */
    public UserContext userContext(UUID userId) {
        var params = new MapSqlParameterSource("user", userId);
        var rating = jdbc.query("SELECT cf_rating FROM users WHERE id = :user", params,
                (rs, i) -> rs.getObject("cf_rating", Integer.class)).stream().filter(r -> r != null).findFirst();
        var solved = jdbc.queryForList("SELECT DISTINCT problem_id FROM submissions WHERE user_id = :user "
                + "AND verdict = 'OK' ORDER BY problem_id", params, String.class);
        return new UserContext(rating.orElse(null), solved);
    }

    static StuckProblem problem(ResultSet rs, int row) throws SQLException {
        var tags = rs.getArray("tags");
        return new StuckProblem(rs.getString("id"), rs.getString("title"), rs.getString("description"),
                rs.getString("input_format"), rs.getString("output_format"), rs.getString("note"),
                rs.getString("editorial"), rs.getObject("rating", Integer.class),
                tags == null ? List.of() : Arrays.asList((String[]) tags.getArray()));
    }

    /** The user's rating and solved problem ids. */
    public record UserContext(Integer userRating, List<String> solvedIds) {

        public UserContext {
            solvedIds = List.copyOf(solvedIds);
        }
    }
}
