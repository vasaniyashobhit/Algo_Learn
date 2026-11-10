package com.algolearn.problems;

/**
 * The legacy text search's match and relevance score (title weight 3, description weight 1), as SQL on a
 * {@code problems} row and the bound search string {@code :q}. As in the legacy index, each problem's per-term
 * scores are computed once at write time (V4: the generated {@code term_scores} column, the legacy tokenizer rules
 * and formula); a query's terms are the distinct non-stop-word stems of {@code :q} and its score is the sum of their
 * per-term scores. A problem matches when it has ANY of the terms (GIN index on {@code term_scores}).
 */
public final class TextScore {

    /** The query's terms (SQL text[]). */
    private static final String TERMS = "search_query_terms(:q)";

    /** WHERE fragment: the row has any of the query's terms ({@code ??|} is JDBC's escape for jsonb {@code ?|}). */
    public static final String MATCH = "term_scores ??| " + TERMS;

    /** The row's text score (0 without a matching term). */
    public static final String SQL = "(SELECT coalesce(sum((problems.term_scores ->> t)::float8), 0) FROM unnest("
            + TERMS + ") AS t)";

    private TextScore() {
    }
}
