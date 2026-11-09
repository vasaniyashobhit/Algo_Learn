package com.algolearn.problems.similar;

import com.algolearn.problems.ProblemConstants;
import com.algolearn.problems.ProblemRows;
import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.problems.similar.FallbackPlan.Attempt;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * One native query per attempt (legacy similarPipeline.js): optional tag overlap and rating window
 * filters, exclusions, then score = 0.75 · jaccard (topic tags, *special ignored) + 0.25 · rating
 * closeness in float8 (the same IEEE operations as the Mongo pipeline). Order: score desc,
 * closeness desc, rating distance asc (unrated last), id (binary order, like Mongo).
 */
@Repository
public class SimilarityQueries {

    static final String SQL = """
            WITH c AS (
              SELECT p.id, p.contest_id, p.idx, p.title, p.rating, p.tags, p.has_editorial, p.source,
                (SELECT count(DISTINCT t) FROM unnest(p.tags) t WHERE t = ANY(CAST(:tags AS text[]))) AS inter,
                (SELECT count(*) FROM (SELECT unnest(p.tags) UNION SELECT unnest(CAST(:tags AS text[]))) u(t)
                  WHERE t <> '*special') AS uni,
                CASE WHEN :hasTarget AND p.rating IS NOT NULL THEN abs(p.rating - :target) END AS distance
              FROM problems p
              WHERE NOT (p.id = ANY(CAST(:excludeIds AS text[])))
                AND NOT (p.title = ANY(CAST(:excludeTitles AS text[])))
                AND (NOT :useTags OR p.tags && CAST(:tags AS text[]))
                AND (NOT :filterRating OR p.rating BETWEEN :low AND :high)
            ), s AS (
              SELECT c.*,
                CASE WHEN uni = 0 THEN 0::float8 ELSE inter::float8 / uni::float8 END AS jaccard,
                CASE WHEN distance IS NULL THEN 0::float8
                  ELSE greatest(0::float8, 1::float8 - distance::float8 / CAST(:window AS float8)) END AS closeness
              FROM c
            )
            SELECT s.*, CAST(:jaccardWeight AS float8) * jaccard + CAST(:ratingWeight AS float8) * closeness AS score
            FROM s
            ORDER BY score DESC, closeness DESC, coalesce(distance, 9007199254740991) ASC, id COLLATE "C" ASC
            LIMIT :k
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public SimilarityQueries(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** {@code tags} are topic tags only; at most {@code k} summaries with their similarity. */
    public List<ProblemSummary> find(Attempt attempt, List<String> tags, int k, List<String> excludeIds,
            List<String> excludeTitles) {
        var target = attempt.target();
        var params = new MapSqlParameterSource()
                .addValue("tags", tags.toArray(String[]::new))
                .addValue("useTags", attempt.useTags())
                .addValue("filterRating", attempt.filterRating() && target != null)
                .addValue("hasTarget", target != null)
                .addValue("target", target == null ? 0 : target)
                .addValue("low", target == null ? 0 : target - attempt.window())
                .addValue("high", target == null ? 0 : target + attempt.window())
                .addValue("window", (double) attempt.window())
                .addValue("excludeIds", excludeIds.toArray(String[]::new))
                .addValue("excludeTitles", excludeTitles.toArray(String[]::new))
                .addValue("jaccardWeight", ProblemConstants.JACCARD_WEIGHT)
                .addValue("ratingWeight", ProblemConstants.RATING_WEIGHT)
                .addValue("k", k);
        return jdbc.query(SQL, params, (rs, row) -> ProblemRows.summary(rs, new ProblemSummary.Similarity(
                rs.getDouble("score"), rs.getDouble("jaccard"), rs.getDouble("closeness"))));
    }
}
