package com.algolearn.sync;

import com.algolearn.common.db.SqlTime;
import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import java.sql.Types;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Stores synced submissions (legacy insertIgnoringDuplicates: unordered insertMany). */
@Repository
public class SubmissionWriter {

    static final int BATCH_SIZE = 500;
    private static final String INSERT = """
            INSERT INTO submissions (cf_submission_id, user_id, problem_id, contest_id, idx, problem_rating,
                problem_tags, verdict, submitted_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (cf_submission_id) DO NOTHING
            """;

    private final JdbcTemplate jdbc;

    public SubmissionWriter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Submissions already stored (same cfSubmissionId) are skipped and the rest are still inserted.
     * Returns how many were new. Any other failure is a 500 INTERNAL_ERROR with the cause.
     */
    public int insertIgnoringDuplicates(UUID userId, List<NewSubmission> rows, Instant now) {
        if (rows.isEmpty()) {
            return 0;
        }
        try {
            var counts = jdbc.batchUpdate(INSERT, rows, BATCH_SIZE, (ps, row) -> {
                ps.setLong(1, row.cfSubmissionId());
                ps.setObject(2, userId);
                ps.setString(3, row.problemId());
                ps.setInt(4, row.contestId());
                ps.setString(5, row.index());
                ps.setObject(6, row.problemRating(), Types.INTEGER);
                ps.setArray(7, ps.getConnection().createArrayOf("text", row.problemTags().toArray()));
                ps.setString(8, row.verdict());
                ps.setObject(9, SqlTime.of(row.submittedAt()));
                ps.setObject(10, SqlTime.of(now));
                ps.setObject(11, SqlTime.of(now));
            });
            return Arrays.stream(counts).flatMapToInt(Arrays::stream).map(c -> Math.max(c, 0)).sum();
        } catch (DataAccessException e) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR,
                    "Could not save submissions", null, e);
        }
    }

    public long countForUser(UUID userId) {
        var count = jdbc.queryForObject("SELECT count(*) FROM submissions WHERE user_id = ?", Long.class, userId);
        return count == null ? 0 : count;
    }
}
