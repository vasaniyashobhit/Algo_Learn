-- AlgoLearn schema, part 2: per-user data and the LLM cache. uk_practice_user_problem maps to
-- PRACTICE_ITEM_EXISTS in DataErrorMapper; other unique violations map to DUPLICATE_RESOURCE.
CREATE TABLE topic_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    topic_key text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('single', 'pair')),
    attempted integer NOT NULL DEFAULT 0 CHECK (attempted >= 0),
    solved integer NOT NULL DEFAULT 0 CHECK (solved >= 0),
    failed integer NOT NULL DEFAULT 0 CHECK (failed >= 0),
    avg_solved_rating double precision CHECK (avg_solved_rating >= 0),
    max_solved_rating double precision CHECK (max_solved_rating >= 0),
    comfort_rating double precision CHECK (comfort_rating >= 0),
    strength double precision NOT NULL DEFAULT 0 CHECK (strength BETWEEN 0 AND 1),
    last_activity_at timestamptz,
    last_results jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_topic_stats_user_topic UNIQUE (user_id, topic_key)
);

CREATE TABLE stuck_queries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    input_type text NOT NULL CHECK (input_type IN ('text', 'url', 'pdf', 'image')),
    raw_input text NOT NULL DEFAULT '' CHECK (char_length(raw_input) <= 20000),
    matched_problem_id text,
    detected_tags text[] NOT NULL DEFAULT '{}',
    tags_source text CHECK (tags_source IN ('db', 'ai', 'neighbors')),
    estimated_rating integer,
    gap jsonb NOT NULL DEFAULT '[]', result jsonb, solution jsonb,
    source text NOT NULL CHECK (source IN ('ai', 'cache', 'fallback')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_stuck_queries_user_created ON stuck_queries (user_id, created_at DESC);

-- key: "problem:<id>" or "text:<sha256>". A daily job deletes rows older than 30 days (createdAt index).
CREATE TABLE llm_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    response jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_llm_cache_key UNIQUE (key)
);
CREATE INDEX ix_llm_cache_created ON llm_cache (created_at);

CREATE TABLE practice_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    problem_id text NOT NULL,
    status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'solved', 'skipped')),
    added_from text NOT NULL DEFAULT 'manual' CHECK (added_from IN ('recommendation', 'similar', 'stuck', 'manual')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_practice_user_problem UNIQUE (user_id, problem_id)
);
CREATE INDEX ix_practice_items_user_created ON practice_items (user_id, created_at DESC);
