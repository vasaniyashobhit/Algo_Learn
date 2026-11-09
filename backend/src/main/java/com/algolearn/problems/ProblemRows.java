package com.algolearn.problems;

import com.algolearn.problems.dto.ProblemSummary;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;

/** Maps a problems row (summary columns only) to a {@link ProblemSummary}. */
public final class ProblemRows {

    /** The summary columns; statement and editorial text are never selected for lists. */
    public static final String SUMMARY_COLUMNS = "id, contest_id, idx, title, rating, tags, has_editorial, source";

    private ProblemRows() {
    }

    public static ProblemSummary summary(ResultSet rs, ProblemSummary.Similarity similarity) throws SQLException {
        var rating = rs.getObject("rating", Integer.class);
        return new ProblemSummary(rs.getString("id"), rs.getInt("contest_id"), rs.getString("idx"),
                rs.getString("title"), rating, tags(rs), rs.getBoolean("has_editorial"),
                rs.getString("source"), similarity);
    }

    private static List<String> tags(ResultSet rs) throws SQLException {
        var array = rs.getArray("tags");
        return array == null ? List.of() : Arrays.asList((String[]) array.getArray());
    }
}
