package com.algolearn.recommendations;

import com.algolearn.problems.ProblemRows;
import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.recommendations.calc.SolvedCopies.ProblemRef;
import com.algolearn.recommendations.calc.TargetRange;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Native SQL for recommendations: titles of solved problems and the candidates of one topic. */
@Repository
public class RecommendationQueries {

    private final NamedParameterJdbcTemplate jdbc;

    public RecommendationQueries(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** {@code { id, title, contestId }} of each solved id; a problem missing from problems keeps only its id. */
    public List<ProblemRef> solvedRefs(List<String> solvedIds) {
        if (solvedIds.isEmpty()) {
            return List.of();
        }
        var found = new HashMap<String, ProblemRef>();
        jdbc.query("SELECT id, title, contest_id FROM problems WHERE id = ANY(CAST(:ids AS text[]))",
                new MapSqlParameterSource("ids", solvedIds.toArray(String[]::new)), rs -> {
                    found.put(rs.getString("id"),
                            new ProblemRef(rs.getString("id"), rs.getString("title"), rs.getInt("contest_id")));
                });
        return solvedIds.stream().map(id -> found.getOrDefault(id, new ProblemRef(id, null, null))).toList();
    }

    /** Problems tagged {@code topic}, rated inside the range, not in {@code excluded}. */
    public List<ProblemSummary> inRange(String topic, TargetRange range, Collection<String> excluded) {
        var params = new MapSqlParameterSource("topic", topic).addValue("min", range.min())
                .addValue("max", range.max()).addValue("excluded", excluded.toArray(String[]::new));
        return jdbc.query("SELECT " + ProblemRows.SUMMARY_COLUMNS + " FROM problems WHERE tags @> "
                + "ARRAY[CAST(:topic AS text)] AND rating BETWEEN :min AND :max "
                + "AND NOT (id = ANY(CAST(:excluded AS text[])))", params, (rs, i) -> ProblemRows.summary(rs, null));
    }
}
