-- AlgoLearn schema, part 1: problems, users, submissions (legacy MongoDB collections). Unique constraint
-- names map to error codes in DataErrorMapper (uk_users_email, uk_users_cf_handle; others DUPLICATE_RESOURCE).
CREATE TABLE problems (
    id            text PRIMARY KEY CHECK (id ~ '^\d+/[A-Z0-9]{1,3}$'),
    contest_id    integer NOT NULL CHECK (contest_id >= 1),
    idx           text NOT NULL,
    title         text NOT NULL,
    description   text NOT NULL DEFAULT '',
    input_format  text NOT NULL DEFAULT '',
    output_format text NOT NULL DEFAULT '',
    note          text NOT NULL DEFAULT '',
    editorial     text NOT NULL DEFAULT '',
    rating        integer CHECK (rating BETWEEN 0 AND 4000),
    tags          text[] NOT NULL DEFAULT '{}' CHECK (tags <@ ARRAY['math', 'greedy', 'implementation', 'dp',
        'data structures', 'constructive algorithms', 'brute force', 'binary search', 'sortings', 'graphs',
        'dfs and similar', 'trees', 'number theory', 'strings', 'combinatorics', 'bitmasks', 'two pointers',
        '*special', 'geometry', 'dsu', 'divide and conquer', 'shortest paths', 'games', 'probabilities',
        'interactive', 'hashing', 'flows', 'matrices', 'fft', 'graph matchings', 'string suffix structures',
        'ternary search', 'meet-in-the-middle', '2-sat', 'expression parsing', 'chinese remainder theorem',
        'schedules']::text[]),
    tag_count     integer NOT NULL DEFAULT 0 CHECK (tag_count >= 0),
    has_editorial boolean NOT NULL DEFAULT false,
    source        text NOT NULL DEFAULT 'hf' CHECK (source IN ('hf', 'cf_api')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    -- Full-text search: title weight A, description weight B (legacy text index weights 3 / 1).
    search        tsvector GENERATED ALWAYS AS (setweight(to_tsvector('english', title), 'A')
                      || setweight(to_tsvector('english', description), 'B')) STORED
);
CREATE INDEX ix_problems_tags ON problems USING gin (tags);
CREATE INDEX ix_problems_search ON problems USING gin (search);
CREATE INDEX ix_problems_rating ON problems (rating);

CREATE TABLE users (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email              text NOT NULL CHECK (char_length(email) <= 254),
    password_hash      text NOT NULL,
    name               text NOT NULL DEFAULT '' CHECK (char_length(name) <= 80),
    cf_handle          text CHECK (cf_handle ~ '^[A-Za-z0-9_.-]{3,24}$'),
    cf_rating          integer,
    cf_max_rating      integer,
    last_synced_at     timestamptz,
    last_submission_id bigint,
    sync_locked_until  timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_users_email UNIQUE (email)
);
-- Codeforces handles are case-insensitive; NULL (not linked) never collides.
CREATE UNIQUE INDEX uk_users_cf_handle ON users (lower(cf_handle));

CREATE TABLE submissions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cf_submission_id bigint NOT NULL CHECK (cf_submission_id >= 1),
    user_id          uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    problem_id       text NOT NULL,
    contest_id       integer NOT NULL CHECK (contest_id >= 1),
    idx              text NOT NULL,
    problem_rating   integer,
    problem_tags     text[] NOT NULL DEFAULT '{}',
    verdict          text NOT NULL CHECK (verdict IN ('FAILED', 'OK', 'PARTIAL', 'COMPILATION_ERROR',
        'RUNTIME_ERROR', 'WRONG_ANSWER', 'PRESENTATION_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED',
        'IDLENESS_LIMIT_EXCEEDED', 'SECURITY_VIOLATED', 'CRASHED', 'INPUT_PREPARATION_CRASHED', 'CHALLENGED',
        'SKIPPED', 'TESTING', 'REJECTED')),
    submitted_at     timestamptz NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_submissions_cf_submission_id UNIQUE (cf_submission_id)
);
CREATE INDEX ix_submissions_user_submitted ON submissions (user_id, submitted_at DESC);
