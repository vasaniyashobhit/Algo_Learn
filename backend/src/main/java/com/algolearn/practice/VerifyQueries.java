package com.algolearn.practice;

import com.algolearn.practice.VerifyOutcome.Judged;
import com.algolearn.recommendations.calc.SolvedCopies.ProblemRef;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Native SQL for "I solved it": problems in nearby contests, and the user's stored submissions on some ids. */
@Repository
public class VerifyQueries {

    private final NamedParameterJdbcTemplate jdbc;

    public VerifyQueries(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ProblemRef> inContests(Collection<Integer> contestIds) {
        return jdbc.query("SELECT id, title, contest_id FROM problems WHERE contest_id = ANY(CAST(:ids AS int[]))",
                new MapSqlParameterSource("ids", contestIds.toArray(Integer[]::new)),
                (rs, i) -> new ProblemRef(rs.getString("id"), rs.getString("title"), rs.getInt("contest_id")));
    }

    public List<Judged> submissions(UUID userId, Collection<String> problemIds) {
        var params = new MapSqlParameterSource("userId", userId)
                .addValue("ids", problemIds.toArray(String[]::new));
        return jdbc.query("SELECT cf_submission_id, verdict FROM submissions WHERE user_id = :userId "
                + "AND problem_id = ANY(CAST(:ids AS text[]))", params,
                (rs, i) -> new Judged(rs.getLong("cf_submission_id"), rs.getString("verdict")));
    }
}
