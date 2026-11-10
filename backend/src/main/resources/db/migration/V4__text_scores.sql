-- Full-text search scored exactly like the legacy backend's text index (title weight 3, description weight 1), for
-- GET /problems?q= and the stuck flow's neighbors. As in that index, every (problem, term) score is computed once at
-- write time into problems.term_scores ({stem: score}); a query sums the scores of its terms. Tokens: Snowball
-- English stems with NO Postgres stop list, hyphenated words by their parts only, and the legacy English stop words
-- (the Postgres list without s, t, can, will, just, don, now, plus would, could, cannot; checked word by word)
-- removed by stem. Legacy formula: a term seen c times among a field's n tokens scores
-- weight * (2 - 2^(1 - c)) * (0.5 * c / n + 0.5), times 1.1 when the whole field is that term.
CREATE TEXT SEARCH DICTIONARY algolearn_english_stem (TEMPLATE = snowball, Language = english);
CREATE TEXT SEARCH CONFIGURATION algolearn_text (COPY = english);
ALTER TEXT SEARCH CONFIGURATION algolearn_text
    ALTER MAPPING FOR asciiword, word, hword_asciipart, hword_part WITH algolearn_english_stem;
ALTER TEXT SEARCH CONFIGURATION algolearn_text DROP MAPPING FOR asciihword, hword;

-- The legacy English stop words as stems (a constant, so generated values never depend on another table).
CREATE FUNCTION search_stop_stems() RETURNS text[] IMMUTABLE PARALLEL SAFE LANGUAGE sql AS $$
    SELECT ARRAY[
        'a', 'about', 'abov', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'ani', 'are', 'as', 'at', 'be',
        'becaus', 'been', 'befor', 'below', 'between', 'both', 'but', 'by', 'cannot', 'could', 'did', 'do', 'doe',
        'down', 'dure', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'he', 'her', 'here', 'herself',
        'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'itself', 'me', 'more', 'most', 'my',
        'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'onc', 'onli', 'or', 'other', 'our', 'ourselv', 'out',
        'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them',
        'themselv', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
        'veri', 'was', 'we', 'were', 'what', 'when', 'where', 'whi', 'which', 'while', 'who', 'whom', 'with', 'would',
        'you', 'your', 'yourself', 'yourselv'
    ]::text[]
$$;

-- The distinct non-stop-word stems of a search string (a search query's terms).
CREATE FUNCTION search_query_terms(q text) RETURNS text[] IMMUTABLE PARALLEL SAFE LANGUAGE sql AS $$
    SELECT coalesce(array_agg(u.lexeme), '{}')
    FROM unnest(to_tsvector('algolearn_text'::regconfig, coalesce(q, ''))) u
    WHERE u.lexeme <> ALL (search_stop_stems())
$$;

-- {stem: textScore share} of one problem: each field scored on its own, then summed per stem.
CREATE FUNCTION search_term_scores(title text, description text) RETURNS jsonb IMMUTABLE PARALLEL SAFE LANGUAGE sql AS $$
    WITH fields (weight, raw) AS (VALUES (3.0, coalesce(title, '')), (1.0, coalesce(description, ''))),
    tokens AS (
        SELECT f.weight, f.raw, u.lexeme, cardinality(u.positions) AS c,
               sum(cardinality(u.positions)) OVER (PARTITION BY f.weight) AS n
        FROM fields f, unnest(to_tsvector('algolearn_text'::regconfig, f.raw)) u
        WHERE u.lexeme <> ALL (search_stop_stems()))
    SELECT coalesce(jsonb_object_agg(lexeme, score), '{}'::jsonb) FROM (
        SELECT lexeme, sum(weight * (2 - power(2, 1 - c)) * (0.5 * c / n + 0.5)
                           * CASE WHEN lower(raw) = lexeme THEN 1.1 ELSE 1 END)::float8 AS score
        FROM tokens GROUP BY lexeme) scored
$$;

ALTER TABLE problems ADD COLUMN term_scores jsonb
    GENERATED ALWAYS AS (search_term_scores(title, description)) STORED;
CREATE INDEX ix_problems_term_scores ON problems USING gin (term_scores);
