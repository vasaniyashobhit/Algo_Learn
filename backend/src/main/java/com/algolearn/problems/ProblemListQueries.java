package com.algolearn.problems;

import com.algolearn.common.validation.JsText;
import com.algolearn.problems.dto.ProblemSummary;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * GET /problems (legacy buildListFilter / buildListSort). The WHERE clause is assembled from fixed
 * SQL fragments only; every value is a bind parameter. {@code q} is the legacy text search: it matches ANY of
 * the words (stemmed English, the legacy stop words), ranked by the legacy text score
 * ({@link TextScore}). Order: relevance (with q), newest contest, then index (binary order).
 */
@Repository
public class ProblemListQueries {

    private final NamedParameterJdbcTemplate jdbc;

    public ProblemListQueries(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ProblemSummary> page(ListQuery query, int offset, int limit) {
        var params = params(query).addValue("offset", offset).addValue("limit", limit);
        var order = query.q() == null ? "" : TextScore.SQL + " DESC, ";
        var sql = "SELECT " + ProblemRows.SUMMARY_COLUMNS + " FROM problems" + where(query)
                + " ORDER BY " + order + "contest_id DESC, idx COLLATE \"C\" ASC OFFSET :offset LIMIT :limit";
        return jdbc.query(sql, params, (rs, row) -> ProblemRows.summary(rs, null));
    }

    public long count(ListQuery query) {
        var total = jdbc.queryForObject("SELECT count(*) FROM problems" + where(query), params(query), Long.class);
        return total == null ? 0 : total;
    }

    static String where(ListQuery query) {
        var clauses = new ArrayList<String>();
        if (!query.tags().isEmpty()) {
            clauses.add(query.matchAll() ? "tags @> CAST(:tags AS text[])" : "tags && CAST(:tags AS text[])");
        }
        if (query.minRating() != null) {
            clauses.add("rating >= :minRating");
        }
        if (query.maxRating() != null) {
            clauses.add("rating <= :maxRating");
        }
        if (query.q() != null) {
            clauses.add(TextScore.MATCH);
        }
        return clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
    }

    private static MapSqlParameterSource params(ListQuery query) {
        return new MapSqlParameterSource()
                .addValue("tags", query.tags().toArray(String[]::new))
                .addValue("minRating", query.minRating())
                .addValue("maxRating", query.maxRating())
                .addValue("q", query.q() == null ? null : anyWord(query.q()));
    }

    /** "two arrays" → "two or arrays": websearch_to_tsquery then ORs the words (never a syntax error). */
    public static String anyWord(String q) {
        return Arrays.stream(JsText.trim(q).split("\\s+"))
                .map(word -> word.replace("\"", "").replaceFirst("^-+", ""))
                .filter(word -> !word.isEmpty() && !word.equalsIgnoreCase("or"))
                .collect(Collectors.joining(" or "));
    }
}
