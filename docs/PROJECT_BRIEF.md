# Project Brief: Competitive Programming Coach (Codeforces-based)

> **For the AI reading this:** This document is the complete context for a college/personal project. The decisions marked **[DECIDED]** are final. Please don't re-suggest alternatives unless I ask. Help me build on this design.

---

## 1. The problem

Students who practice competitive programming (Codeforces, placement tests) face these problems:

1. **They don't know their weak topics.** They solve problems at random and can't see that, for example, they are weak at "dp + bitmasks".
2. **When stuck, they only get the answer.** They look up a solution but don't learn *which concept* they were missing, and they don't get similar problems to practice that concept.
3. **They don't know what to do next.** There is no personalized path: which topic to learn next, and which problems to solve at the right difficulty.
4. **Progress is not tracked by topic.** Codeforces shows a rating, not strength per topic.

## 2. Objective

Build a web app that acts as a **personal CP coach**:

1. **Find similar Codeforces-style problems** for any given problem.
2. **Store each user's strength and weakness** per topic and per pair of topics (the "user data").
3. **Help when the user is stuck** (practice / upsolving mode): the user gives a problem as text, file, URL or image → the system gives a solution, the problem's tags, similar problems, and the **concept gap** between the user's data and what the problem needs.
4. **Track progress automatically** from the user's Codeforces profile (other platforms are optional) and update the user data.
5. **Recommend** the next topic to learn and the next set of problems to solve.

**Positioning:** this is for **practice and upsolving**. It is not for use during live rated contests or placement tests, since using AI there breaks contest rules.

## 3. Key decisions and accepted limitations [DECIDED]

| Decision | Detail |
|---|---|
| Dataset | Use the Hugging Face dataset `open-r1/codeforces`. **Don't** generate a dataset with an LLM. |
| Similarity method | Similarity is based on **problem tags** (+ rating closeness). Text embeddings are an optional later upgrade. |
| Accepted limitation 1 | Two problems with the same tags can need very different solutions. This is accepted for now. |
| AI provider | Gemini **free** API. |
| Accepted limitation 2 | Gemini's answers may be inaccurate. This is accepted. |
| Hard requirement | The product must **never show a blank result**, even if the Gemini API fails or is rate-limited. This is solved with a fallback chain (Section 7). |
| Other platforms | LeetCode/CodeChef/GFG have no official APIs. Their tracking is an **optional extra**, not core. |

## 4. Dataset (already downloaded and verified)

- **Source:** `open-r1/codeforces` (license CC-BY-4.0), default config, train + test splits.
- **How it was downloaded:** DuckDB read only the needed columns straight from `hf://datasets/open-r1/codeforces/data/*.parquet`, skipping the huge test-case columns.
- **Local file:** `data/cf_problems.parquet`, **14 MB**, written by DuckDB.
- **Columns:** `id` (e.g. `1/A`), `contest_id`, `index`, `title`, `description`, `input_format`, `output_format`, `note`, `editorial`, `rating` (INT64), `tags` (list of strings).

**Verified stats:**

| Item | Value |
|---|---|
| Total problems | 10,024 (unique IDs, `id` = `contest_id/index` for all rows) |
| Rating range | 800–3500, all multiples of 100 |
| No rating | 257 |
| No tags | 154 |
| Empty description | 43 |
| No editorial | 3,928 (39%) |
| Distinct tags | 37 (the official Codeforces tag set) |
| Usable (rating + tags + description) | 9,608 |
| Usable + editorial | 5,916 |
| True duplicates (same statement, Div1/Div2 copies) | 8 groups, 10 rows (ignorable) |

**Cleaning rules when loading into the database:**
- Skip problems with an empty description.
- Problems without a rating: keep for search, exclude from difficulty-based recommendations.
- Problems without tags: use the fallback search (rating/text based).
- The tag `*special` (534 problems) marks unusual contests, not an algorithm topic. **Exclude it from user topic scores.**
- Statements use `$$$...$$$` for LaTeX (Codeforces style). Render or clean it in the UI.

**Recent problems not in the snapshot:** the Codeforces API `problemset.problems` returns tags + rating for all problems (no statements). Use it to add newer problems for tag/rating matching.

## 5. Tech stack

| Layer | Choice |
|---|---|
| Backend | Python + FastAPI |
| Database | PostgreSQL + pgvector |
| Embeddings (optional, later) | sentence-transformers `all-MiniLM-L6-v2` (384-dim, free, runs locally) |
| AI | Gemini API via `google-genai` SDK; optional backup: Groq or OpenRouter free tier |
| Scheduled jobs | APScheduler (inside FastAPI) |
| Input parsing | `pypdf` (PDF), `requests` + `BeautifulSoup` (URLs), Gemini vision (images) |
| Frontend | Streamlit (fast) or React (polished) |
| Auth | JWT in FastAPI (or Supabase Auth) |
| Data loading | pandas + pyarrow / DuckDB |

## 6. Features: how each one works

### F1. User account + handle linking
Sign up, enter Codeforces handle, verify it with the CF API `user.info`.

### F2. Problem dataset load (one-time)
Load `cf_problems.parquet` into the `problems` table, with tags as a `TEXT[]` array. Optionally add newer problems from `problemset.problems`.

### F3. Similar problem search
- **Main method:** tag **Jaccard similarity** = |shared tags| ÷ |all distinct tags of both|, computed in SQL with Postgres array operators.
- **Ranking:** combine tag similarity with rating closeness, e.g. `score = jaccard − α · |rating_a − rating_b| / 1000`. Filter to ±200–300 rating when the target rating is known.
- **Alternative with pgvector:** a 37-dim 0/1 tag vector per problem, using cosine distance.
- **Optional upgrade:** add a statement-embedding vector (pgvector) and blend: `score = w1·tag_sim + w2·text_sim + w3·rating_closeness`.
- **Reliability:** runs fully on our own database, so it **always returns results**. Untagged problems fall back to rating/text search. Quality is "related by topic", not guaranteed same-solution (accepted).

### F4. Problem input (when the user is stuck)
- **Text:** used directly.
- **Codeforces URL:** parse the contest ID + index → look it up in our database (no AI needed, tags + editorial already known).
- **Other URL:** scrape with BeautifulSoup (best effort, may be blocked).
- **PDF:** `pypdf`.
- **Image/screenshot:** Gemini reads the image.

### F5. Tag detection for problems outside our database
Order: (1) the problem is in our database → stored tags; (2) Gemini predicts tags, **restricted to the 37 official tags** (validate its output against the list); (3) fallback: text search for the nearest problems in our database and take their most common tags. Optionally combine (2) and (3) to correct Gemini mistakes.

### F6. Solution help (never blank): see Section 7.

### F7. Concept gap analysis
Compare the problem's tags (and tag pairs) with the user's strength scores. Report the weak ones, e.g. *"This problem needs DP + bitmasks. Your bitmask strength is low (0.3)."* Then recommend easier problems on those weak tags first.

### F8. User data (topic strengths)
Stored per user, **per tag and per tag pair** (37 tags → 666 pairs; no triples, they would be too sparse). The table `user_topic_stats` has attempts, solved, failed, average rating of solved problems, max rating solved, last activity time, strength score.

**Strength score idea** (tune later):
- Each solved problem gives credit weighted by difficulty relative to the user's rating: `w = sigmoid((problem_rating − user_rating) / 300)`, so harder solves count more.
- Each attempted-but-unsolved problem lowers the score.
- Recent activity counts more (time decay, e.g. half-life of ~90 days).
- Use smoothing (e.g. a prior of a few virtual attempts) so a topic with 1 solve doesn't show 100%.
- Also store a per-topic "comfort rating" = an estimate of the highest rating the user reliably solves in that topic.

### F9. Progress tracking
APScheduler runs every few hours: CF API `user.status` (all submissions, each with the problem's tags + rating) → save new submissions → recalculate `user_topic_stats`. Respect CF API limits (about 1 request per 2 seconds), and use `from`/`count` to fetch only new submissions.

### F10. Recommendations
- **Next topic:** the weakest topic where the user has *some* activity (not untouched, not mastered), and prefer topics common at the user's rating level.
- **Next problem set:** problems with that tag, rated **100–300 above** the user's comfort rating for that topic, excluding problems already solved, ranked by similarity to problems they recently failed.
- **After a "stuck" query:** recommend problems similar to the stuck problem, starting easier on the gap topics.

### F11. Dashboard
Topic strength chart (radar/bar), weak areas, recent progress, recommended problems, history of "stuck" queries.

## 7. Gemini fallback chain (meets the "never blank" requirement)

No API can guarantee 100% uptime, but the **product** can guarantee a non-empty answer:

1. **Cache:** if the same problem was asked before, return the saved answer (table `llm_cache`, key = problem ID or hash of the statement).
2. **Gemini call with retries:** exponential backoff, 2–3 tries, on HTTP 429 / 5xx / timeout.
3. **Switch Gemini model:** e.g. Flash → Flash-Lite (each model has its own free quota).
4. **Optional backup provider:** Groq or OpenRouter free tier.
5. **Final fallback, no API needed:** from our own database: the problem's tags (stored or inferred from nearest problems), the **editorial** if the problem is in the dataset, similar problems with their editorials, and the concept gap.
   UI message: *"AI solution temporarily unavailable. Here are the likely topics, your weak areas, similar problems and editorials."*

**UX choice:** show hints and the concept gap first, the full solution on request (better for learning).

Gemini free tier limits are low (about 5–10 requests/minute without billing, and Google changes them often), so caching matters. This is fine for a demo and a small user base.

## 8. Database schema (draft)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE problems (
  id            TEXT PRIMARY KEY,          -- e.g. '1/A'
  contest_id    TEXT NOT NULL,
  idx           TEXT NOT NULL,             -- 'index' is reserved
  title         TEXT NOT NULL,
  description   TEXT,
  input_format  TEXT,
  output_format TEXT,
  note          TEXT,
  editorial     TEXT,
  rating        INT,                       -- NULL allowed
  tags          TEXT[] NOT NULL DEFAULT '{}',
  tag_vec       vector(37),                -- optional
  text_emb      vector(384),               -- optional, later
  source        TEXT DEFAULT 'hf'          -- 'hf' or 'cf_api'
);
CREATE INDEX ON problems USING GIN (tags);
CREATE INDEX ON problems (rating);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  cf_handle     TEXT UNIQUE,
  cf_rating     INT,
  last_synced   TIMESTAMPTZ
);

CREATE TABLE user_submissions (
  id            BIGINT PRIMARY KEY,        -- CF submission id
  user_id       INT REFERENCES users(id),
  problem_id    TEXT,                      -- 'contestId/index'
  verdict       TEXT,                      -- 'OK', 'WRONG_ANSWER', ...
  submitted_at  TIMESTAMPTZ,
  platform      TEXT DEFAULT 'codeforces'
);

CREATE TABLE user_topic_stats (            -- the "user data"
  user_id          INT REFERENCES users(id),
  topic_key        TEXT,                   -- 'dp' or 'bitmasks+dp' (pairs sorted alphabetically)
  attempted        INT DEFAULT 0,
  solved           INT DEFAULT 0,
  avg_solved_rating REAL,
  max_solved_rating INT,
  comfort_rating   INT,
  strength         REAL,                   -- 0..1
  last_activity    TIMESTAMPTZ,
  PRIMARY KEY (user_id, topic_key)
);

CREATE TABLE stuck_queries (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id),
  input_type    TEXT,                      -- text/url/pdf/image
  raw_input     TEXT,
  matched_problem_id TEXT,                 -- if found in DB
  detected_tags TEXT[],
  gap_topics    TEXT[],
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE llm_cache (
  key           TEXT PRIMARY KEY,          -- problem id or sha256(statement)
  provider      TEXT,
  model         TEXT,
  response      JSONB,                     -- tags, hints, solution
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

## 9. Main API endpoints (draft)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/signup`, `/auth/login` | Accounts |
| POST | `/users/me/handle` | Link + verify CF handle |
| POST | `/users/me/sync` | Manual progress sync |
| GET | `/users/me/stats` | Topic strengths (user data) |
| GET | `/problems/{id}/similar?k=10` | Similar problems |
| POST | `/stuck` | Text/URL/file/image → tags, solution/hints, gap, similar problems |
| GET | `/recommendations` | Next topic + next problem set |

## 10. Feasibility summary

| Feature | Possible? |
|---|---|
| Similar problems by tags | Yes, 100% (own data) |
| User data table | Yes, 100% |
| Stuck-problem help that is never blank | Yes, 100% with the fallback chain |
| Codeforces progress tracking | Yes, 100% (official public API) |
| Recommendations | Yes, 100% (own data and logic) |
| Other platforms' tracking | Not guaranteed (no official APIs), optional extra |
| Gemini answer accuracy | Not guaranteed (accepted) |

## 11. Build order

1. **Done:** dataset downloaded and verified (`data/cf_problems.parquet`).
2. PostgreSQL setup + load `problems` (with the cleaning rules).
3. Similar-problem search (SQL Jaccard + rating) + endpoint.
4. Users + CF handle linking + submission sync (`user.status`).
5. `user_topic_stats` calculation (strength score).
6. Recommendations.
7. `/stuck` flow: input parsing → tag detection → Gemini with fallback chain → gap analysis.
8. Frontend dashboard.
9. Optional: text embeddings, other platforms.

## 12. Useful references

- Dataset: https://huggingface.co/datasets/open-r1/codeforces
- Codeforces API docs: https://codeforces.com/apiHelp (`user.info`, `user.status`, `problemset.problems`)
- Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
