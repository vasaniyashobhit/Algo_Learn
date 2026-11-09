# CP Coach — Progress Log

Read this first, update it last, every session.

# Spring migration

The backend moves from Express + MongoDB (`legacy/backend-node/`, read-only) to Spring Boot +
PostgreSQL (`backend/`). Everything below "MERN log" is the history of the finished MERN version.

## Setup (2026-11-09)

- Old repository (MERN, frozen, never push again): https://github.com/vasaniyashobhit/AlgoLearn.git
- New repository (origin): https://github.com/vasaniyashobhit/Algo_Learn.git
- Old backend moved to `legacy/backend-node/` (no node_modules/coverage, no CLAUDE.md; its `.env`
  stays there git-ignored as a key reference). `cf_problems.parquet` moved to `backend/data/`.
- Tools found: OpenJDK 21.0.10 (Microsoft build, JAVA_HOME set), Docker 28.4.0, Node 23.11.1,
  Git 2.51.0.

## Done

### Spring Session 1 (2026-11-09) — Skeleton, error foundation, tooling, Docker

- Root: workspaces `frontend`, `e2e`. Scripts `dev` (`scripts/dev.mjs`: compose Postgres, then
  mvnw + Vite with prefixed logs), `test` (mvnw verify + frontend), `lint` (Checkstyle + ESLint),
  `db:up`, `db:down`. `scripts/mvnw.mjs` picks `mvnw.cmd`/`./mvnw`. ESLint ignores `legacy/`, `backend/`.
- `docker-compose.yml`: `postgres` (pgvector/pgvector:pg16, volume `postgres-data`, healthcheck, db
  `algolearn`, host port `${POSTGRES_PORT:-5432}`).
- `backend/`: Spring Boot 4.1.2, Java 21, Maven wrapper (Maven 3.10.0). `build/pom.xml` is the build
  parent (versions, Checkstyle 14.4 with FileLength 100 on main+test, JaCoCo 0.8.16 lines 80 / branches
  75, all bound to `verify`); `pom.xml` holds the dependencies.
- Ported: env validation (fail fast listing all issues, before any bean), tags (37/36/630, `pairKey`),
  problem id patterns, `ErrorCode` (27), `AppException` + 9 subclasses, `ExceptionMapper` with route,
  body, parameter and data mappers, `ErrorResponseWriter` (single writer for advice, filters and
  security), `GlobalExceptionHandler`, `RequestIdFilter`, request logging, helmet-equivalent headers,
  CORS limited to CLIENT_URL, 1 MB JSON body guard, global rate limit (Bucket4j, 300/15 min/IP, draft-7
  headers), JSON 404 for unknown routes/methods, `Retry` (injectable sleep/random), `TimedHttpClient`
  (RestClient timeouts → 503 timeout / 502 network).
- Security baseline: stateless, JSON 401/403 through the shared writer, no default user.
- Endpoints: `GET /api/v1/health`, `/health/ready`, `/meta/tags` (same JSON as legacy).
- Tests: 121 backend (unit + MockMvc/Testcontainers integration; one shared container), coverage
  98% lines / 94% branches. `ErrorCodeTest` checks the enum against docs/API.md and the frontend copy.
- Smoke test: db `up`, 36 topic tags, ready 200, unknown route → JSON 404.

### Spring Session 2 (2026-11-09) — Schema, entities, dataset import, Codeforces client

- Flyway: `V1__init.sql` (problems, users, submissions) and `V2__user_data.sql` (topic_stats,
  stuck_queries, llm_cache, practice_items). Checks for every legacy enum/pattern/range, named unique
  constraints (`uk_users_email`, `uk_users_cf_handle` = unique index on `lower(cf_handle)`,
  `uk_practice_user_problem`, `uk_submissions_cf_submission_id`, `uk_topic_stats_user_topic`,
  `uk_llm_cache_key`), generated `problems.search` tsvector (title A, description B), GIN on tags and
  search, btree on rating, `(user_id, submitted_at desc)`, `(user_id, created_at desc)`.
- JPA entities + repositories for all 7 tables (Lombok on entities only; `text[]` via
  `@JdbcTypeCode(ARRAY)`, jsonb via `@JdbcTypeCode(JSON)` with records `LastResult`, `GapItem`).
- `common/http/RateLimitQueue` (FIFO via fair lock, start-to-start spacing, injectable clock/sleep).
- `codeforces/`: `CodeforcesClient` + `RestCodeforcesClient` (RestClient via `TimedHttpClient`, 20 s
  timeout, one shared 2.1 s queue bean, 2 retries on timeout/network/5xx/429/"Call limit exceeded",
  every attempt queued), `CfRequest` (URL + parsing, FAILED checked before HTTP status), `CfErrors`,
  `CfCalls` (legacy callCf), DTO records.
- `importer/`: `CleanProblem`, `ProblemValidator`, `PrepareImport`, `FromCfProblem`,
  `DuckDbDatasetReader` (`read_parquet(?)`), `ProblemWriter` (multi-row upsert, 500/batch),
  `CfApiUpdater`, tasks `ImportDatasetTask`, `SyncProblemsetTask`. `tasks/`: `Task`, `TaskRunner`,
  `TaskLauncher` (`--task=<name>` → no web server, print summary, exit 0/1).
- Root scripts `import:dataset`, `sync:problemset` (they run `spring-boot:run` with `--task`; DB and
  port come from `backend/.env`).
- Tests: 233 backend (all legacy cases for cleanProblem, derivedFields, fromCfProblem, validateProblemDoc,
  prepareImport, readParquet, bulkUpsert, importDataset, syncNewProblems(+update), updateCfApiRows,
  rateLimitQueue, cfErrors, cfRequest, callCf, CF client success/errors on WireMock, runScript, model
  constraint/index tests on Testcontainers). Coverage 98% instructions / 94% branches. Lint green.
- **Local Docker Postgres (port 5433), `npm run import:dataset`:**

  ```
  read 10024 · skippedEmptyDescription 43 · rejected 0 (rejectedByReason {}) · rejectedIds []
  toUpsert 9981 · upserted 9981 · updated 0 · unchanged 0 · batches 20
  withRating 9745 · withTags 9827 · withEditorial 6080 · withSpecialTag 485 · totalInCollection 9981
  ```

  Identical to the legacy Atlas import. A re-run (scratch DB) gave upserted 0 / updated 0 / unchanged 9981.
- **`npm run sync:problemset` right after:**

  ```
  fetched 11511 · rejected 0 (rejectedByReason {}) · rejectedIds [] · inserted 1751 · alreadyPresent 9760 · updated 0
  ```

  The table now holds 9981 `hf` + 1751 `cf_api` rows.
- Library versions for Boot 4.1.2: DuckDB JDBC **1.5.6.0** (2.0.x was days old), Lombok 1.18.48 (Boot-managed,
  set as annotation processor), WireMock standalone 3.13.2 and Testcontainers 2.0.5 (Boot-managed) work
  unchanged. Boot 4 needs **`spring-boot-starter-restclient`** for the `RestClient.Builder` bean.

### Spring Session 3 (2026-11-10) — Auth, users, problems, similar search

- Frontend test stability (test config only, no app or test-case changes): `frontend/vitest.config.js` caps
  Vitest at `maxWorkers: 2` (`minWorkers: 1`); that fixed the `findBy*` timeouts. Two of the first three runs
  then failed on a second flake: all 553 tests passed but Vitest reported an unhandled "window is not defined"
  from sonner's 200 ms post-dismiss timer firing after `HistoryPage.test.jsx`'s jsdom was torn down. The shared
  `src/test/setup.js` now waits 250 ms in `afterAll` in files that showed a toast. After that, root `npm test`
  passed three times in a row (exit 0 each: 453 backend + 553 frontend).
- `security/`: deny-by-default `SecurityConfig` with an explicit public list (health, health/ready,
  meta/tags, POST auth/signup + auth/login, GET problems, problems/{c}/{i}, problems/{c}/{i}/similar,
  POST internal/sync-all). The legacy guarded prefixes (`/users`, `/recommendations`, `/practice`, `/stuck`
  — `router.use(requireAuth)`) need a token for every path below them; any other path no controller handles
  (`KnownRoutes` asks the MVC handler mapping) is let through, so it still answers 404 ROUTE_NOT_FOUND.
  `JwtService` (jjwt 0.13, HS256 only, `sub` = UUID + `email`, JWT_EXPIRES_IN via `JwtLifetime` = `ms` rules,
  injected `Clock`), `JwtJson` (jjwt on the app's Jackson 3 mapper; jjwt-jackson is Jackson 2),
  `BearerToken` (legacy readBearerToken), `JwtAuthFilter` (a bad token is stored on the request; public
  routes ignore it, protected routes answer exactly that error), `JsonAuthEntryPoint`.
- `auth/`: `AuthFields`/`AuthRequests` reproduce the zod rules and messages in the same order (zod 4 email
  regex, JS trim/lowercase, 72-byte limit), `PasswordHasher` (bcrypt `$2b$`, cost 12, tests 4 via
  `algolearn.auth.hash-rounds`, first 72 bytes count like node bcrypt), `AuthService` (lazy dummy hash so an
  unknown email still runs one compare), `AuthController`. `ratelimit/AuthRateLimitFilter`: one shared
  per-IP counter for POST signup + login (20 / 15 min), not GET /auth/me.
- `users/`: `PublicUser` (legacy key order, ISO dates with ms), `UsersService` (account gone →
  AUTH_INVALID_TOKEN "This account no longer exists"), `UpdateMeRequest` (strict: `Unrecognized key: "email"`),
  `UsersController` (GET/PATCH /users/me). GET /auth/me reuses the same service.
- `common/validation/`: `JsText` (JS trim), `JsNumber` (JS `Number()`), `Issues`, `QueryValues` (blank =
  absent, repeated scalar = array, zod messages), `JsonBody` + resolver (raw body, only for application/json).
- `problems/`: `ListQuery` (tags comma/repeat, max 10, `query.tags.<i>` "Unknown tag", stringbool, ints,
  q 1–100, minRating ≤ maxRating), `ProblemParams` (contestId/index, upper-cased; k, ratingWindow; params issues
  first), `ProblemListQueries` (fixed SQL fragments + bind params, tsvector search, `idx COLLATE "C"`),
  `ProblemService`, `ProblemController`, DTOs `ProblemSummary`/`ProblemDetail`.
- `problems/similar/`: `SimilarityMath` (pure helpers), `FallbackPlan` + `Strategy`, `SimilarityQueries` (ONE
  native query per attempt: `tags &&` filter, rating window, exclusions, float8 0.75·Jaccard(*special ignored) +
  0.25·closeness, ORDER BY score, closeness, distance (unrated last), `id COLLATE "C"`, LIMIT k), `SimilarSearch`
  (full cascade with fill-up, meta.strategy / strategies / ratingWindow / targetRating / count), `SimilarMeta`.
- Error details: duplicate keys name the legacy API fields (`DuplicateFields`), see Parity notes.
- Smoke test on the local dataset (11,732 problems): GET /problems/1/A/similar 24 ms warm (k=30 with fallback
  attempts 150 ms), `q=theatre square` ranks 1/A, 1359/B first (510 matches), unknown route 404, /users/me 401.
- Tests: 453 backend (every legacy auth, users, problems, similarity, fallback, fill-up, cf_api, route and
  middleware case; SecurityIT for deny-by-default / 404 / guarded prefixes), coverage 98.8% lines / 95.1% branches.

### Spring Session 4 (2026-11-10) — Handle linking, submission sync, jobs, topic strength

- Rule change: root `CLAUDE.md` rule 1 now exempts build and lock files (`pom.xml`, `package.json`,
  `package-lock.json`, `docker-compose.yml`) from the 100-line rule (the exemption text was added to CLAUDE.md
  this session). The pom Blocker is closed; the poms stay unsplit.
- `users/`: `HandleRequest` (strict body, JS trim, `^[A-Za-z0-9_.-]{3,24}$`, legacy messages), `HandleQueries`
  (taken check on `lower(cf_handle)`, link/unlink as one conditional UPDATE on an unlocked user, delete synced
  data), `HandleService` (accountGone → taken → CF user.info → Codeforces casing + ratings; a different handle
  resets lastSyncedAt/lastSubmissionId and deletes submissions + topic stats; DuplicateKey → CF_HANDLE_TAKEN;
  0 rows → SYNC_IN_PROGRESS or accountGone), `HandleController` (PUT/DELETE /users/me/handle).
- `sync/`: `SyncSettings` (lock 5 min, page 500, 20 pages, cooldown 20 s; problemset cron), `SyncLock` (one atomic
  `UPDATE … WHERE sync_locked_until IS NULL OR <= now RETURNING …`, released in `finally`), `CfSubmissions`
  (isPending/isStorable/toRow/pendingRefs/nextCursor/uniqueById), `SubmissionPager` (legacy fetchNewSubmissions),
  `Cooldown`, `SubmissionWriter` (JDBC batches of 500, `ON CONFLICT (cf_submission_id) DO NOTHING`, other
  failures → 500 INTERNAL_ERROR "Could not save submissions"), `SyncService` (+ `SyncConfig`: the stats recompute
  is the onSynced hook), `SyncController`. RATE_LIMITED carries `details.retryAfterSeconds` (ceil); jobs skip it.
- `stats/`: `StatsConstants` (STATS / STATS_VIEW / reasons in one class), pure helpers in `stats/calc/`
  (`StrengthMath` = sigmoid/decay/difficultyWeight/contribution/strength, `ComfortRating`, `GroupByProblem`,
  `TopicKeys`, `TopicTotals`, `BuildTopicStats`, `RatingBands`, `Activity`, `BuildSummary`), `StatsQueries`,
  `TopicStatWriter` (stale-key delete + upsert; `recomputeForUser` runs both in one `@Transactional`),
  `StatsQuery` (zod enum/int messages), `StatsService`, `StatsController`, DTOs `TopicStatView`, `Summary`,
  `StatsMeta`, `SummaryMeta` (`reason` only when set).
- `jobs/`: `JobErrorHandler`, `SyncAllUsersJob` (sequential, ignores the cooldown, failing user logged and
  skipped, overlapping run skipped), `SyncProblemsetJob` (wraps `SyncProblemsetTask`), `LlmCacheCleanupJob`
  (daily 04:00, deletes rows older than 30 days), `JobScheduler` (`SchedulingConfigurer`: SYNC_CRON, Sunday 03:00,
  daily cleanup; per-job no-overlap guard), `BackgroundJobs`, `LinkedUsers` / `JdbcLinkedUsers`.
- `internal/`: `CronSecretFilter` (every `/api/v1/internal/**` path; SHA-256 + `MessageDigest.isEqual`; header
  only) and `InternalController` (POST /internal/sync-all → 202 `{ started: true, job: "syncAllUsers" }` at once).
- Config switches: `algolearn.jobs.scheduler-enabled`, `algolearn.jobs.background-enabled` and
  `algolearn.codeforces.min-interval-ms` (default 2100), all off / 0 in `application-test.yml`. An invalid
  SYNC_CRON already fails startup (EnvValidator; ported legacy env.cron test in `SyncCronTest`).
- Test support: `MutableClock` and `FakeCodeforcesClient` are `@Primary` beans in the IT context (`TestDoubles`),
  reset by `DatabaseTest` before each test; time moves only through `clock.set/advance` (no sleeps).
  `CfData` (legacy cfSubmission/cfHistory/cfUser/cfDown), `Handles` (link/unlink/sync over HTTP).
- Smoke test (local Postgres 5433, real Codeforces): link " TOURIST " → `tourist` 3408/4009; first sync 5519 new
  submissions in 27 s (12 pages at 2.1 s spacing), an immediate second sync → 429 `retryAfterSeconds: 20`;
  stats/summary filled (36 topics, 409 pairs); sync-all 202 with the secret, 403 without. Scheduler log:
  `syncAllUsers @ 0 0 */6 * * *, syncProblemset @ 0 0 3 * * SUN, llmCacheCleanup @ 0 0 4 * * *`.
- Tests: 649 backend (every legacy handle, sync, lock, cooldown, insert, stats helper, recompute, summary,
  lastResults, routes, jobs, scheduler, cron-secret and internal case) + 553 frontend. Coverage 99.1% lines /
  94.5% branches. Root `npm run lint` and `npm test` green.

## Decisions

- Env validation runs in an `ApplicationContextInitializer` (after every property source including
  `.env`, before beans) instead of `@ConfigurationProperties` binding; `AppProperties` is the
  validated record (its `toString` hides secrets). `isProduction` = `prod` profile active.
- CORS, security headers, request id, body guard and the global rate limit are servlet filters
  ordered before Spring Security (Security's own CORS/headers are disabled), so preflights and
  errors get the same headers as legacy. `FilterErrorGuard` sends filter errors to the writer.
- Security permits every path for now (health/meta explicitly); later sessions add protected routes.
  This keeps unknown routes at 404 ROUTE_NOT_FOUND instead of 401.
- Unknown method on a known path → 404 ROUTE_NOT_FOUND (legacy had no 405).
- Tests: `*Test` and `*IT` both run in Surefire; constructor injection via
  `spring.test.constructor.autowire.mode=all`; tests never read `backend/.env`.
- Session 2 replaced the no-op `V1__init.sql` with the real schema (it was never deployed; the one local
  history row was deleted so V1 re-ran). The schema is split into V1 + V2 only to respect the 100-line rule.
- No `(tags, rating)` composite index: GIN (tags) + btree (rating) cover it; a mixed index would need btree_gin.
- No foreign keys from `submissions/practice_items/stuck_queries.problem_id` to `problems` (legacy refs were
  not enforced and submissions may name problems not imported yet). `user_id` columns do reference `users`.
- Problem writes use JdbcTemplate with multi-row `INSERT ... ON CONFLICT` (placeholders only):
  OVERWRITE updates only `WHERE (...) IS DISTINCT FROM EXCLUDED`, `RETURNING (xmax = 0)` gives inserted vs
  modified, so counts match Mongo's upserted/modified/matched. INSERT_ONLY is `ON CONFLICT DO NOTHING`.
- Tasks run in the normal app context with `WebApplicationType.NONE`; `SecurityConfig` is
  `@ConditionalOnWebApplication`. The summary uses logger `algolearn.task.summary` (always INFO) instead of
  `console.log` (System.out is banned).
- Integration tests that write data extend `support/DatabaseTest` (truncates all tables before each test,
  same cached context as `IntegrationTest`). The parquet fixture is written by DuckDB itself.
- `frontend/src/errors/codes.test.js` now reads the Java `ErrorCode` enum instead of the deleted
  `backend/src/errors/codes.js` (test-only change; no app code changed).

- Session 3: request validation is hand-written (`AuthRequests`, `ListQuery`, `ProblemParams`, `UpdateMeRequest`)
  instead of Bean Validation, because Bean Validation neither keeps issue order nor matches the zod messages
  (`Invalid input: expected object, received undefined`, `Unrecognized key: "email"`, `query.tags.1`).
- Security: `/api/v1/__test/**` (test-only routes) is skipped through a test-only `WebSecurityCustomizer`.
- Signup duplicates are not pre-checked: the unique constraint `uk_users_email` fails and the global handler maps
  it to AUTH_EMAIL_TAKEN (same message as legacy).
- Controllers are tested through full MockMvc integration tests (real security chain and DB) rather than
  `@WebMvcTest` slices; the legacy controller tests only checked delegation, which the ITs cover end to end.
- Text search `q`: words are OR-ed (`websearch_to_tsquery('english', 'w1 or w2')`, never a syntax error), ranked
  with `ts_rank` weights title:description = 3:1 like the Mongo text index.

- Session 4: the 100-line rule does not apply to build/lock files (CLAUDE.md rule 1); `pom.xml` and
  `build/pom.xml` stay unsplit.
- Sync, lock and handle writes use native SQL (`JdbcTemplate`) so each is one atomic statement; JPA only reads
  users. Linking/unlinking runs the user update and the synced-data delete in one `TransactionTemplate`.
- `SyncService` is built in `SyncConfig` with `SyncSettings.DEFAULT` and `StatsService::recomputeForUser`; tests
  build their own with small pages (5 × 3) and no cooldown, like legacy `TEST_SYNC`.
- In-process jobs use `SchedulingConfigurer` cron triggers (the 5-field SYNC_CRON gets a leading `0` seconds
  field); each job is guarded against overlapping firings (node-cron `noOverlap`). No scheduler for `--task` runs.
  `/internal/sync-all` runs the job on Spring Boot's `applicationTaskExecutor` (virtual threads).
- The llm_cache TTL index is replaced by `LlmCacheCleanupJob` (daily 04:00, `created_at < now − 30 days`).
- The cron secret is checked by a servlet filter for every `/api/v1/internal/**` path (legacy `router.use`);
  security permits that prefix for every method.
- Topic stat ratings stay `double precision` columns; reads round them to integers for the JSON.

## Parity notes

- `LOG_LEVEL` accepts Spring's levels (`trace|debug|info|warn|error|fatal|off`); legacy `silent` is `off`.
- `DATABASE_URL` must be `jdbc:postgresql://...` (replaces `MONGODB_URI`); `NODE_ENV` is replaced by
  `SPRING_PROFILES_ACTIVE=prod`. Port errors say "Must be an integer between 1 and 65535" (zod wording differed).
- Express matched routes case-insensitively and with a trailing slash; Spring does not
  (`/api/v1/health/` → 404). The frontend never sends such paths.
- The 1 MB limit applies to `application/json` bodies; legacy also limited urlencoded bodies (unused).
- Error responses use `Content-Type: application/json` (legacy added `; charset=utf-8`).
- Rate limiting keys on `getRemoteAddr()`; in `prod`, `server.forward-headers-strategy=native`
  replaces Express `trust proxy 1` (check the host's proxy in Session 8).

- Tasks need the full environment (JWT_SECRET, GEMINI_*, ...) because they start the app context; legacy
  scripts only needed MONGODB_URI. Real users never run them; `backend/.env` already has every value.
- `toIntOrNull` (legacy `toNumberOrNull`) keeps only whole numbers: a fractional rating like `1.5` becomes
  null instead of 1.5, and booleans become null (JS `Number(true)` = 1). The dataset and CF API have neither.
- Re-importing (OVERWRITE) never moves `updated_at`, exactly like legacy bulkUpsert; cf_api rating/tag
  updates do set it.
- Duplicate-key `details.fields` use the legacy API names exactly as Mongo's keyPattern gave them (`email`,
  `cfHandle`, `cfSubmissionId`, `userId`+`topicKey`, `key`, `userId`+`problemId`, `_id` for a primary key),
  never SQL columns (Session 3 replaced the Session 2 column names).
- User ids (JWT `sub`, `user.id`) are UUIDs instead of 24-hex ObjectIds; tokens with any other `sub` are
  AUTH_INVALID_TOKEN. The frontend treats ids as opaque strings.
- An invalid JWT_EXPIRES_IN now fails at startup (legacy failed on the first signup/login with a 500).
- Text search follows Postgres English stemming; Mongo's `"phrase"` and `-negation` syntax is not supported
  (quotes and leading `-` are dropped, words stay OR-ed). Ranking among matches can differ slightly from Mongo's
  textScore; the filter (any word) is the same.
- Similarity numbers are equal but Jackson writes doubles as `1.0` / `0.0` where JS wrote `1` / `0`.
- `tags[]=dp` (qs bracket syntax) is not parsed as `tags`; the frontend sends `tags=a,b`.
- If both element errors and "more than 10 tags" apply, both are reported (zod may report only the first kind).
- cf_api rows store `''` for text fields; legacy bulkWrite stubs had no text fields at all (read as '').
- Unknown `--task` names fail with exit code 1 and list the known tasks.
- Session 4: the lock release (`sync_locked_until = NULL`) does not move `updated_at` (mongoose timestamps did on
  every updateOne); lock acquire, the sync result, link and unlink do set it.
- Sync-all visits users ordered by `created_at, id`; the stats read submissions ordered by
  `submitted_at, cf_submission_id` (Mongo used natural order). Only ties within the same second could differ.
- llm_cache rows are deleted once a day instead of by Mongo's TTL monitor (about every minute), so an entry can
  live up to one extra day. The weekly problemset cron is `0 0 3 * * SUN` in the server time zone (as node-cron).
- `strength` is written by Jackson as a double (`0.5`; `0.0` for a never-computed row) where JS wrote `0`.
- With the right secret, an unknown method/path under `/internal` answers 404 ROUTE_NOT_FOUND (as legacy).

## Blockers

- E2E: `e2e/server/start.js` imports the legacy Express backend (`../../backend/src`), so `npm run e2e`
  does not run; the CI e2e job is disabled (`if: false`) until its server setup is adapted.
- On this machine a native PostgreSQL 17 service uses port 5432, so the root `.env` (git-ignored) sets
  `POSTGRES_PORT=5433` and `backend/.env` uses `localhost:5433`.

## Next

- Spring Session 5 (scope comes with its prompt). Ready to use: `SyncService.syncUser(id)` (practice verify),
  `StatsQueries.all(userId)` / `TopicStatDoc` for recommendations and the stuck gap, `SimilarSearch.find(...)`,
  `UsersService.accountGone()`, `JsonBody` + `Issues`, `MutableClock` / `FakeCodeforcesClient` in ITs.
- When the LLM cache is ported: legacy reads relied on the TTL index, so decide whether reads should also skip
  rows older than 30 days between the daily cleanups (record it under Parity notes).
- Adapt the e2e server to the Spring backend and re-enable the CI e2e job.

# MERN log

## Done

### Session 1 (2026-10-28) — Monorepo skeleton + Express foundation

- Root npm workspaces (`backend`, `frontend`), scripts `dev` (concurrently), `test`,
  `test:cov`, `lint`. Shared ESLint 9 flat config (`eslint.config.js`): `max-lines` 100 for
  all files, `no-var`, `prefer-const`, `prefer-arrow-callback`, `eqeqeq`, `no-unused-vars`,
  and `no-restricted-syntax` against `require`, `module.exports`/`exports` and `.then()`.
- `.gitignore`, `.editorconfig`, `.nvmrc` (22). `frontend/` is still a placeholder (CLAUDE.md only).
- Backend (Express 5, ESM):
  - `config/env.js` (zod, fail fast listing missing/invalid vars), `config/tags.js`
    (37 tags, 36 topic tags, `isTopicTag`, `pairKey`, `TOPIC_PAIR_KEYS` with 630 keys).
  - `errors/`: `AppError`, subclasses in `httpErrors.js`, `codes.js` (26 codes), and
    `mappers/` for zod, mongoose, mongo duplicate key, jwt, multer, body-parser JSON, plus `index.js`.
  - `middlewares/`: `requestId`, `notFound`, `errorHandler`, `rateLimit`, `validate`.
  - `lib/`: `logger` (pino with redaction), `fetchWithTimeout`, `retry`, `gracefulShutdown`.
  - `app.js` (`createApp`), `routes.js`, `server.js` (`startServer` plus SIGINT/SIGTERM shutdown).
  - Endpoints: `GET /api/v1/health`, `GET /api/v1/meta/tags`.
  - `.env.example` with every variable.
- Tests: 30 files, 131 tests (Vitest + supertest). Coverage: about 98% lines, 97% branches
  (thresholds 80/80/75 in `backend/vitest.config.js`).

### Session 2 (2026-10-29) — MongoDB connection + all models

- `db/connect.js`: `connectDB(uri, { logger, serverSelectionTimeoutMS })` / `disconnectDB({ logger })`,
  global `sanitizeFilter` + `strictQuery`, logs host and db name (never the URI), logs
  disconnect/reconnect/error. Failures throw `ExternalServiceError` 503 `DB_UNAVAILABLE`.
- `server.js`: connects the DB **before** listening (injectable `db: { connect, disconnect }`),
  closes the DB if HTTP fails to start, and on SIGINT/SIGTERM via `onClose`.
- `db/schema.js`: `createSchema` (timestamps + toJSON transform removing `__v`/`passwordHash`),
  `requiredRef`, `optionalEnum`. `config/constants.js`: enums, CF verdicts, TTL, 20k input limit.
- Models: `Problem`, `User`, `Submission`, `TopicStat`, `StuckQuery`, `LlmCache`, `PracticeItem`
  (collections and indexes documented in `docs/API.md` → Data model).
  `problems/helpers/derivedFields.js` computes `tagCount`/`hasEditorial`.
- New error code `DB_UNAVAILABLE` (503), now 27 codes.
- Tests: Vitest `globalSetup` starts one mongodb-memory-server; `useTestDB()` gives each test
  file its own database (connect + build indexes, clear after each test, drop at the end).
  Helpers: `db.js`, `mongoServer.js`, `factories.js` (`makeProblem`, `makeUser`, ...),
  `assertions.js` (`invalidPaths`, `expectDuplicateKey`, `indexesByName`).
  44 files, 206 tests. Coverage: 99% lines, 97.7% branches.

### Session 3 (2026-10-29) — Dataset import + Codeforces client

- `PROBLEM_ID_PATTERN` moved to `config/constants.js` (re-exported by the model) and widened to
  `^\d+\/[A-Z0-9]{1,3}$`, so `1723/GP1`, `1723/GP2`, `921/01`, `921/02` are accepted.
- `lib/rateLimitQueue.js`: FIFO limiter, starts spaced by `intervalMs`, errors propagate per task.
- `modules/codeforces/`: `codeforces.client.js` (`problemsetProblems`, `userInfo`, `userStatus`;
  injected fetch/limiter/sleep, 2.1 s spacing, 20 s timeout, 2 retries) and `helpers/cfRequest.js`
  (URL building, response parsing) + `helpers/cfErrors.js` (typed errors, retry rule).
- `modules/problems/helpers/`: `cleanProblem.js`, `validateProblemDoc.js` (id/contest/tag checks,
  because bulkWrite skips validators), `prepareImport.js` (summary counts), `fromCfProblem.js`.
- `scripts/`: `runScript.js` (env → connect → task → print → disconnect; exit 1 on failure),
  `importDataset.js`, `syncProblemset.js`, `import/readParquet.js`, `import/bulkUpsert.js`,
  `import/syncNewProblems.js`. npm scripts `import:dataset`, `sync:problemset` (backend and root).
- Tests: 60 files, 295 tests. Coverage 99.3% lines, 98.4% branches. The readParquet and import
  tests write a real fixture parquet with `hyparquet-writer` (devDependency).
- **Atlas import (2026-10-29), `npm run import:dataset`:**

  ```
  read 10024 · skippedEmptyDescription 43 · rejected 0 (rejectedByReason {})
  toUpsert 9981 · upserted 9981 · updated 0 · unchanged 0 · batches 20
  withRating 9745 · withTags 9827 · withEditorial 6080 · withSpecialTag 485
  totalInCollection 9981 · took ~14 s
  ```

  0 rows rejected for invalid ids. A second run gave upserted 0 / updated 0 / unchanged 9981.

### Session 4 (2026-10-29) — Email/password auth with JWT

- `bcrypt` (^6) added to the backend.
- `modules/auth/`: `auth.schema.js` (zod signup/login; email trimmed + lowercased),
  `helpers/token.js` (`signToken`, `verifyToken`, `createTokenService`), `auth.service.js`
  (`createAuthService({ tokens, User, hashRounds = 12 })` → `signup`, `login`),
  `auth.controller.js`, `auth.routes.js`, `auth.module.js` (`createAuth` wires tokens + service + requireAuth).
- `middlewares/auth.js`: `createRequireAuth(tokens)` and `readBearerToken(header)`; sets `req.user = { id, email }`.
- `modules/users/`: `users.service.js` (`getProfile`, `updateProfile`), `users.controller.js`,
  `users.routes.js` (`createUsersRouter({ requireAuth })`), `users.schema.js`, `helpers/publicUser.js`.
- Endpoints: `POST /auth/signup` (201), `POST /auth/login`, `GET /auth/me`, `GET /users/me`,
  `PATCH /users/me` (all documented in `docs/API.md` with examples and error codes).
- `AUTH_RATE_LIMIT` (20 / 15 min per IP) on every `/auth/*` route, in addition to the global limit.
- `createApp({ auth: { jwtSecret, jwtExpiresIn, hashRounds }, authRateLimit })`; `server.js` passes
  `JWT_SECRET`/`JWT_EXPIRES_IN`. `createApiRouter({ auth, authRateLimit })`.
- Tests: 74 files, 387 tests. Coverage 99.4% lines, 98.7% branches. New helper `tests/helpers/auth.js`
  (`makeSignup`, `signupViaApi`, `bearer`, `expectErrorShape`, `expectPublicUser`); `testApp.js`
  now exports `TEST_AUTH` / `TEST_JWT_SECRET`.

### Pre-Session-5 check (2026-10-29)

- **Fix:** the strict auth limiter (20 / 15 min per IP) now sits only on `POST /auth/signup` and
  `POST /auth/login`, which share one counter. `GET /auth/me` is only under the global 300 limit.
  Tests: 25 `/auth/me` calls in a row succeed under the default config, the global limit still
  returns 429 on `/auth/me`, and signup + login share the counter. `docs/API.md` updated.
- Lint and tests green: 74 files, 389 tests, coverage 99.4% lines / 98.7% branches.
- `.env` and parquet: ignored, never committed (`git log --all -- backend/.env` is empty).
  Added a global `*.parquet` ignore (before, only `data/` folders were covered).
- `npm audit --omit=dev`: 0 vulnerabilities. Full audit: 4 in dev-only test tooling
  (`@vitest/mocker` moderate, `tinypool` critical, through vitest 3.2). The only fix is
  `--force` to an older vitest major, so it was not applied (see the Vitest decision).
- `@google/genai` (^2.32) added for Session 9 (no LLM module built).
- Live check scripts in `backend/scripts/checks/` (manual, outside `src/`, no unit tests, each under
  100 lines): `npm run check:env`, `check:atlas` (`-- --sync` creates missing indexes),
  `check:server` (`-- --memory` uses in-memory MongoDB instead of Atlas), `check:gemini`.
- Results:
  - env: all 13 variables present and valid.
  - **Atlas: unreachable.** TCP to the cluster's port 27017 times out (all 3 nodes), while other
    internet works, so this machine's IP is most likely not in the Atlas Network Access list.
    Counts, indexes, spot checks and `$text` were **not run**.
  - Real server flow (health, 36 topic tags, signup, login, `/auth/me`, 25× `/auth/me` not
    limited, wrong password → `AUTH_INVALID_CREDENTIALS`, cleanup) **passed against in-memory
    MongoDB**. Not yet run against Atlas.
  - Codeforces `user.info` for tourist via our client: OK (rating 3382, max 4009).
  - **Gemini:** both configured models (`gemini-2.5-flash`, `gemini-2.5-flash-lite`) return 404
    "no longer available to new users". The suggested replacements: `gemini-3.5-flash-lite` OK
    (about 17 s); `gemini-3.8-flash` exists but answered 504/503 "high demand" (temporary).

### Session 5 (2026-10-29) — Problem browsing + never-blank similar search

- `config/constants.js`: `PROBLEM_INDEX_PATTERN` (`^[A-Z0-9]{1,3}$`), `CONTEST_ID_PATTERN`
  (`^[1-9]\d{0,6}$`); `PROBLEM_ID_PATTERN` is now built from the same index source.
  `SIMILARITY` (weights 0.75/0.25, k 10 / max 30, window 300 (50–1000), widen ×2, untagged band
  ±200, default target 1200) and `PROBLEM_LIST` (limit 20 / max 50, max 10 tags, q ≤ 100).
- `modules/problems/helpers/`: `similarity.js` (`topicTagsOf`, `jaccard`, `ratingCloseness`,
  `similarityScore`), `similarPipeline.js` (pure aggregation builder), `fallbackPlan.js`
  (`planAttempts`, `STRATEGIES`), `listQuery.js` (trusted find filter + sort),
  `problemView.js` (`toProblemSummary`, `toProblemDetail`, `SUMMARY_FIELDS`).
- `problems.service.js` (`list`, `getById`, `findSimilar`, `findSimilarToProblem`, `problemId`),
  `problems.schema.js`, `problems.controller.js`, `problems.routes.js` (public), mounted at `/problems`.
- Endpoints: `GET /problems`, `GET /problems/:contestId/:index`,
  `GET /problems/:contestId/:index/similar` (documented in `docs/API.md`). No new error codes.
- Tests: 88 files, 510 tests (memory server). Coverage 99.5% lines, 98.6% branches. New helper
  `tests/helpers/problems.js` (`problemAt`, `seedProblems`, `insertCfApiStub` writes a raw
  bulkWrite-style row with no defaults). A parity test checks pipeline scores against the JS helpers.
- **Atlas is reachable again** (`npm run check:atlas` passed: counts, spot checks, `$text`).
  Read-only smoke test of the service on Atlas (11,702 problems): similar for `1723/GP1`, a 2000+
  multi-tag problem and a `cf_api` row all returned `primary` results (~290 ms warm, ~1 s first
  call); `list` with `q` + tags ~100 ms.

### Session 6 (2026-10-29) — Codeforces handle linking + submission sync

- `node-cron` (^4.6) added. `config/constants.js`: `SYNC` (lock 5 min, page 500, max 20 pages),
  `PROBLEMSET_SYNC_CRON` (`0 3 * * 0`). `SYNC_CRON` is now validated with `node-cron`'s `validate`.
- `modules/codeforces/helpers/callCf.js`: typed CF errors pass through, anything else → 503 `CF_UNAVAILABLE`.
- `modules/users/`: `handle.service.js` (`createHandleService` → `linkHandle`, `unlinkHandle`),
  `handle.controller.js`, `helpers/accountGone.js` (shared), `linkHandleSchema`.
- `modules/sync/`: `sync.lock.js` (`unlockedFilter`, `acquireSyncLock`, `releaseSyncLock`,
  `lockedOrGone`), `sync.service.js` (`createSyncService({ client, onSynced })` → `syncUser`),
  `sync.controller.js`, `helpers/cfSubmissions.js` (`isPending`, `isStorable`, `toSubmissionDoc`,
  `nextCursor`, `uniqueById`), `helpers/fetchNewSubmissions.js`, `helpers/insertSubmissions.js`.
- `middlewares/cronSecret.js` (constant-time compare), `modules/internal/` (routes + controller).
- `jobs/`: `jobErrorHandler.js`, `syncAllUsers.job.js`, `syncProblemset.job.js`, `scheduler.js`.
- `src/services.js` (`createServices`): one CF client shared by the handle/sync services and the jobs.
  `createApp({ services, cronSecret })`; `startServer` builds the services once, passes them to the
  app, starts the scheduler after listening and stops it on shutdown (before closing the DB).
- Endpoints: `PUT /users/me/handle`, `DELETE /users/me/handle`, `POST /users/me/sync`,
  `POST /internal/sync-all` (202). No new error codes (all were already in the list).
- Extra: `scripts/import/syncNewProblems.js` now also updates `rating`/`tags`/`tagCount` of existing
  `cf_api` rows that changed (new `updateCfApiRows.js`), summary has `updated`; weekly cron job.
- Tests: 111 files, 631 tests. Coverage 99.6% lines, 98.5% branches. New helpers
  `tests/helpers/codeforces.js` (`fakeCfClient`, `cfSubmission`, `cfHistory`, `cfUser`, `cfDown`),
  `tests/helpers/sync.js`; `testApp.js` exports `TEST_CRON_SECRET`.

### Session 7 (2026-10-30) — Topic and pair strength from submissions

- `config/statsConstants.js` (re-exported by `constants.js`, which hit 100 lines): `STATS`
  (half-life 90, scale 300, prior 3 at 0.5, bases 0.5/1.5, pairs ≥ 2, comfort 365 d / top 5 / ≥ 3),
  `STATS_VIEW` (sorts, limit 50 / max 630, top 5, weak ≥ 3 attempts, 30 days, 200-wide bands
  800–3400), `STATS_EMPTY_REASONS`. `lib/sigmoid.js`.
- `modules/stats/helpers/` (pure, one concern each): `groupByProblem`, `topicKeys` (`topicKeysFor`),
  `decay`, `difficultyWeight`, `contribution` (`problemContribution`), `strength`, `comfortRating`
  (+ `median`), `topicTotals` (accumulator → doc), `buildTopicStats`, and for the summary
  `ratingBands` (`solvedByRating`), `activity` (`dailyActivity`), `statView`, `emptyReason`, `buildSummary`.
- `stats.service.js` (`createStatsService({ User, Submission, TopicStat, now })` → `recomputeForUser`,
  `getStats`, `getSummary`), `stats.schema.js`, `stats.controller.js`. Routes are on the users router.
- `createServices` builds `statsService` and uses `statsService.recomputeForUser` as the default
  `onSynced`, so every sync (route, cron, `/internal/sync-all`) recomputes. `server.js` unchanged.
- `problems.schema.js` now exports `blankToUndefined` and `queryInt` (reused by the stats query).
- Endpoints: `GET /users/me/stats`, `GET /users/me/stats/summary` (documented in `docs/API.md`).
  No new error codes.
- Tests: 133 files, 725 tests. Coverage 99.7% lines, 98.8% branches; `modules/stats` 100%.
  New helper `tests/helpers/stats.js` (`createSyncedUser`, `insertSubmissions`, `statsOf`, fixed `STATS_NOW`).

### Session 8 (2026-10-30) — Recommendations + practice list

- `config/recommendationConstants.js` (re-exported by `constants.js`): `RECOMMENDATIONS` (3 topics,
  5 problems, zone ≥ 3 attempted / strength 0.2–0.75, ±300 frequency window, 1 h cache, target
  +100..+300 rounded to 100, 10 recent failures), `COPY_CONTEST_GAP` 2, `TOPIC_BASES`, `PICKED_BY`,
  `VERIFY_REASONS`. `SYNC.cooldownMs` 20 s.
- `modules/recommendations/helpers/` (pure): `topicFrequency` (`tagCountsPipeline`, `toTagCounts`,
  `topicFrequencyAtRating`), `pickNextTopics` (`inLearningZone`, `topicPriority`), `topicReason`,
  `targetRange` (+ `baseRating`), `solvedCopies` (`normalizeTitle`, `isSameOrCopy`,
  `createSolvedMatcher`), `history` (`summarizeHistory`), `rankByFailed` (+ `maxJaccard`).
  `tagCounts.cache.js`, `recommendations.context.js`, `.service.js`, `.controller.js`, `.routes.js`.
- `modules/practice/`: `practice.schema.js`, `practice.service.js` (list/add/update/remove),
  `practice.verify.js` (`createVerifyService({ syncService })`), controller, routes;
  helpers `practiceView`, `verifyOutcome`, `copyFilter` (`copyIdPrefixes`).
- Sync: per-user 20 s cooldown (`RATE_LIMITED`, `details.retryAfterSeconds`); `syncUser(id,
  { ignoreCooldown })`, the sync-all job passes `true`. `syncUser` now also returns `pending`
  (`{ problemId, cfSubmissionId }` of submissions still being judged; new helper `pendingRefs`).
- `findSimilar` fill-up: later strategies fill the free slots (deduplicated); new `meta.strategies`.
- `createServices` builds `recommendationsService` and `practiceService` (CRUD + verify share it).
- Endpoints: `GET /recommendations`, `GET/POST /practice`, `PATCH/DELETE /practice/:contestId/:index`,
  `POST /practice/:contestId/:index/verify` (all in `docs/API.md`). No new error codes.
- Tests: 161 files, 855 tests. Coverage 99.75% lines, 98.9% branches. New helpers
  `tests/helpers/recommendations.js`, `tests/helpers/practice.js`; `TEST_SYNC.cooldownMs` is 0.

### Session 9 (2026-10-30) — LLM coach chain (never throws)

- `config/llmConstants.js` (re-exported by `constants.js`): `LLM` (3 tries, backoff 1 s · 2^(n−1),
  20 s timeout, budget/min gemini 8 · groq 25 per model, answer limits, rating 800–3500 step 100),
  `LLM_FALLBACK_REASONS` (`NO_INPUT`, `AI_BUSY`, `AI_UNAVAILABLE`).
- `lib/`: `hash.js` (`sha256Hex`), `minuteBudget.js` (sliding 60 s window per key), `withTimeout.js`
  (aborts the signal and rejects with `TimeoutError` even if the call ignores the signal).
- `modules/llm/`: `prompts/buildCoachPrompt.js`, `schema/coachResponse.schema.js` (zod +
  `parseCoachResponse`/`validateCoachResponse`, tolerates a ```json fence),
  `schema/sanitizeCoachResponse.js`, `providers/gemini.provider.js` (`generateJson`,
  `extractTextFromImage`; one provider per `GEMINI_MODELS` entry sharing one `GoogleGenAI`),
  `providers/groq.provider.js` (fetch, `response_format: json_object`, null when key/model missing),
  `helpers/isRetryable.js`, `helpers/llmError.js`, `helpers/cacheKey.js`, `helpers/callProvider.js`
  (retry + budget + timeout loop, never throws), `cache.js` (`createCoachCache` on `llmcaches`),
  `coach.service.js` (`createCoachService` → `getCoachAnswer`, `createLlmBudget`), `imageText.js`
  (`createImageTextExtractor` → `extractImageText`), `llm.module.js` (`createLlm({ env })`).
- Not wired into `createServices`/routes yet (the stuck module in Session 10 will call `createLlm`).
- `scripts/checks/coach.js` (`npm run check:coach [-- --fresh]`): one real call on problem 1/A.
  **Live run (2026-10-30, Atlas):** `gemini-3.8-flash` timed out 3× (20 s each), then
  `source=ai provider=gemini model=gemini-3.5-flash-lite`, about 67 s in total; tags `math, implementation`,
  rating 1000, 18-line C++ answer, cached as `problem:1/A`. Groq (`openai/gpt-oss-120b`) not reached.
- Tests: 178 files, 961 tests (all fakes, no network). Coverage 99.78% lines, 98.94% branches;
  `modules/llm` 100% lines. New helper `tests/helpers/llm.js` (`fakeProvider`, `fakeCache`,
  `coachJson`, `httpError`, `chainOptions`, open/closed budgets).

### Session 10 (2026-10-30) — Stuck flow (POST /stuck, never blank) + LLM chain deadline

- **LLM chain fixes (Session 9 follow-up):** `LLM` now `deadlineMs` 40 s, `tries` 2, constant
  `backoffMs` 1 s, `timeoutMs` 25 s, `circuitOpenMs` 2 min; new reason `AI_TIMEOUT`.
  `lib/circuitBreaker.js`; `llm/helpers/failureKind.js` (replaces `isRetryable.js`: `sick` = timeout/503,
  `retry` = 429/500/502/504, `fail` = rest), `helpers/chainOrder.js` (first Gemini → Groq → other Gemini),
  `helpers/chainSettings.js` (defaults + `createLlmBudget`/`createLlmBreaker`), `callProvider` rewritten.
  `getCoachAnswer({ ..., deadline })`, `extractImageText(buf, mime, { deadline })`. `createOfflineLlm()`.
- `config/stuckConstants.js` (`STUCK`, `GAP`, `STUCK_FALLBACK_NOTICE`). `GAP_STATUSES` is now
  `unseen|weak|developing|strong`; gap items have `kind` and nullable `strength`; `stuckqueries.solution`.
- `errors/httpErrors.js`: `UnprocessableError` (422). `middlewares/upload.js` (multer memory, 5 MB, 1 file,
  pdf/png/jpeg/webp/txt). `rateLimit.js`: `keyGenerator` option + `userKey`. `lib/ocr.js` (lazy tesseract.js).
- `modules/stuck/`: `input/` (`fromText`, `fromUrl`, `urlGuard` (SSRF), `fromPdf`, `fromImage`,
  `resolveInput`), `helpers/` (`codeforcesUrl`, `privateAddress`, `extractMainText`, `readLimitedBody`,
  `fileSignature`, `gapAnalysis`, `neighbors`, `problemMatch`, `fallbackHints`, `buildResult`, `stuckView`),
  `stuck.repository.js`, `stuck.locate.js`, `stuck.service.js` (`solve`), `stuck.queries.js`,
  `stuck.module.js` (`createStuckFeature`), schema, controller, routes.
- `createServices({ llm, ocr, stuck })` builds `stuckService` (offline LLM by default); `server.js` passes
  `createLlm({ env, logger })`. `createApp({ stuckRateLimit })` (default 10 / hour / user).
- New deps: `cheerio`, `unpdf`, `tesseract.js`.
- Endpoints: `POST /stuck`, `GET /stuck/history`, `GET /stuck/:id`, `GET /stuck/:id/solution`,
  `DELETE /stuck/:id`. No new error codes. `docs/API.md` finalized as the full frontend contract.
- Review: every controller handler has try/catch → `next(err)`; all 27 codes are in the API.md table.
- Tests: 217 files, 1206 tests (no network: fake fetch/DNS/LLM/OCR; one real unpdf PDF).
  Coverage 99.82% lines, 98.89% branches; `modules/stuck` 100% lines. New helpers
  `tests/helpers/stuck.js`, `stuckService.js`, `stuckRoutes.js`.

### Fix-up 10.5 (2026-10-30) — Shared deadline, local OCR data, connect-time IP check

- **One request deadline** for `POST /stuck`: `STUCK.requestDeadlineMs` 50 s, shared by input reading
  and the coach. Gemini image reading ≤ `imageMaxMs` 20 s, OCR ≤ `ocrTimeoutMs` 15 s (never past the
  deadline), the coach gets what is left, or is skipped for the `AI_TIMEOUT` fallback when less than
  `coachMinMs` 10 s remain. `createStuckService({ limits })` replaces `deadlineMs`.
- **OCR** (`lib/ocr.js`): `createOcr()` → `{ recognize(buffer, { timeoutMs }), terminate() }`. One
  worker, created lazily and reused; hard timeout (a timed-out worker is terminated, the next call starts
  a fresh one); `server.js` terminates it on shutdown (`services.ocr`, before the DB closes).
- **Local language data:** `@tesseract.js-data/eng` (npm, ~14 MB unpacked, `4.0.0_best_int`) as
  `langPath` with `gzip: true`, `cacheMethod: 'none'`: no download and no cache file at runtime.
- **DNS rebinding closed:** `stuck/input/safeFetch.js` — `undici` `fetch` on an `Agent` whose
  `connect.lookup` resolves the host and refuses private/local addresses, so the checked IP is the one
  the socket uses. A connect-time refusal maps to `400 URL_NOT_ALLOWED` (`reason: private`). The
  pre-fetch guard stays (IP literals skip DNS, and it gives a clear error before any connection).
- Stuck result now has `provider`/`model` (who wrote the answer; `null` for the fallback).
- New deps: `undici` ^7, `@tesseract.js-data/eng`. New check: `npm run check:stuck` (`scripts/checks/
  stuck.js` + `stuck/` helpers: generated PDF, generated PNG with a 5×7 bitmap font, problem texts).
- Tests: 222 files, 1229 tests (+ shared-deadline on fake timers with the real limits, OCR timeout /
  reuse / langPath, one real tesseract run on a generated PNG, safe fetch against a local server).
- **Live `npm run check:stuck` (2026-10-30, running dev server, Atlas, demo user ShobhitVasaniya 1253):**

  | Input | HTTP | Time | Source | Provider/model | Tags (source) | Match | Hints | Gap | Similar |
  |---|---|---|---|---|---|---|---|---|---|
  | text (71A) | 201 | 6.8 s | ai | gemini/gemini-3.5-flash-lite | strings (db) | 71/A | 3 | 0 | 10 |
  | url 4/A | 201 | 6.4 s | ai | gemini/gemini-3.5-flash-lite | brute force, math (db) | 4/A | 3 | 0 | 10 |
  | pdf (231A) | 201 | 8.6 s | ai | gemini/gemini-3.5-flash-lite | brute force, greedy (db) | 231/A | 3 | 0 | 10 |
  | png (1A) | 201 | 14.4 s | cache | gemini/gemini-3.5-flash-lite | math (db) | 1/A | 3 | 0 | 10 |

  All under 55 s, none blank. Gap 0 is correct (the demo user is strong there, e.g. math 0.95).
  `GET /stuck/:id/solution` for 71A: `kind ai` in 282 ms. Note: the model's C++ had
  `#iostream>` instead of `#include <iostream>` (verbatim from the model; our code only trims).

### Session 11 (2026-10-30) — Three design directions as static mockups (Impeccable shape)

- `/impeccable init` had not produced a PRODUCT.md, so it was written this session (root `PRODUCT.md`)
  from the brief and the user's answers: name **AlgoLearn** (never "CP Coach" in UI), users are
  Indian college students rated 800–2000 practising late at night on laptops, dark mode matters,
  1024px+ first, no Codeforces branding, no purple-gradient AI look, voice direct/honest/technical.
- Shape brief (IA, screens, states) and the direction round are in `frontend/mockups/README.md`.
- `frontend/mockups/`: `index.html` (comparison page, `compare.css`), `shared/` (motion, interact,
  radar, latex scripts), and `direction-a/`, `direction-b/`, `direction-c/`, each with 12 pages:
  index, landing, auth, dashboard, dashboard-states, stuck, stuck-result, stuck-fallback,
  stuck-states, problem (KaTeX), practice, history. 77 files, all ≤ 100 lines.
  - **A · Module:** calm editorial study module. Stone paper, Source Serif 4 + Public Sans, examiner green.
  - **B · Scorecard:** bold dark cricket scoreboard. Barlow Condensed, night navy + chalk, one yellow
    plate per screen, wagon-wheel radar, ball-by-ball activity. Dark by default.
  - **C · Graph notebook:** playful but precise. Graph paper, ballpoint blue, highlighter, sticky notes,
    Figtree + Kalam for margin notes, index-tab sidebar.
  - All three have press animation, staggered entrances, a parallax hero, skeleton shimmer and
    count-ups, all switched off by `prefers-reduced-motion`, plus a light/dark Theme toggle.
- `eslint.config.js` ignores `frontend/mockups/**` (reference only). No React was built.

### Session 12 (2026-10-30) — React foundation in direction B, landing + auth

- User chose **direction B · Scorecard** (dark default, light via toggle). Recorded in
  `frontend/DESIGN.md` ("The Floodlit Scorecard"): tokens for both themes, type, spacing, radius,
  shadow, motion (380 ms wipe, 45 ms stagger, 96% press). Impeccable choice ping sent.
- `frontend/` scaffolded: Vite 7 + React 19, React Router 7 (data router), TanStack Query 5, axios,
  motion, react-hook-form + zod 4, sonner, Tailwind v4 (`@theme inline` in `styles/theme.css` reads the
  token variables), self-hosted Barlow / Barlow Condensed (@fontsource). Vite proxies `/api` to :4000;
  vendor chunks split. Vitest 3.2 + RTL + MSW 2 + jsdom with coverage thresholds lines 80 / branches 75
  (now 100 / 98). `frontend/.env.example` has `VITE_API_URL`.
- Root ESLint: a frontend block with browser globals, JSX, `react/jsx-uses-vars`, rules-of-hooks and
  exhaustive-deps (`eslint-plugin-react` and `eslint-plugin-react-hooks` added at the root).
- Theme: an inline boot script in `index.html` sets `data-theme` before paint (saved choice, else
  system, else dark). `ThemeProvider` follows live system changes until a choice is saved. `ThemeToggle`.
- API: `api/client.js` (Bearer token from `lib/authStore`, 15 s default timeout, per-request override,
  every failure → `ApiError`). A 401 `AUTH_TOKEN_EXPIRED`/`AUTH_INVALID_TOKEN` on a request that sent a
  token logs out and goes to `/login` with a "session expired" note. Errors: `errors/codes.js` (27
  codes; a test compares it with the backend list and the API.md table), `getUserMessage` (context
  overrides, params, network/timeout/status/generic fallbacks), messages for every code.
- Components: ui (Button, Input, Card, Tag, Skeleton, Notice, EmptyState, ErrorState, Spinner,
  AppToaster), motion (Pressable, Wipe, FadeIn, StaggerList/Item, ParallaxLayer, PageTransition,
  CountUp; each has a reduced-motion branch), layout (AppShell, Navbar score bug, AccountMenu,
  ProtectedRoute, PageSkeleton, ErrorBoundary, RouteError, CrashScreen).
- Pages: landing (floodlight beams + scoreboard parallax planes; the board is labelled "Topic
  strength" with a "Scoreboard" caption and is a real table), /login and /signup (zod mirrors the
  backend rules, VALIDATION_FAILED details inline, AUTH_EMAIL_TAKEN on the email field, specific
  AUTH_INVALID_CREDENTIALS and RATE_LIMITED text), auth state (token in localStorage behind
  try/catch, /auth/me on load with a page skeleton), logout, 404, and a placeholder /dashboard.
- **Low-contrast warning from the B fallback mockup: fixed and measured.** In the mockup, the button
  on the yellow plate turned the theme ink on hover (navy on navy in light mode). The real `Button` has
  an `onPlate` variant (Plate Ink in both themes; hover is a Plate Ink fill with plate-yellow text),
  used with `Notice tone="plate"`. `src/styles/tokens.test.js` measures 19 text/background pairs per
  theme from tokens.css. Light `--miss` was deepened to #a33412 (it was 4.12:1 on band-2), and new
  `--chalk-miss` and `--figure` tokens cover weak rows on the board and the big auth figure.
- Bug found by tests and fixed: logging out from a protected page landed on /login (the route
  redirected before the navigation home). `useLogout` now navigates first, then clears the token.
- Checked in headless Chrome at 1366 and 760 px in both themes (landing, login, 404).

### Session 13 (2026-10-30) — Dashboard, handle linking, sync, recommendations, practice list

- Data layer: `api/endpoints/` users (link/unlink/sync with 30 s / 120 s timeouts, PATCH me), stats,
  recommendations, practice, meta, problems (similar); `unwrapWithMeta` keeps `meta` (for `reason`).
  Query keys for stats/recommendations/practice/problems plus `mutationKeys.sync`. Query hooks per
  feature; mutations: link/unlink, sync, practice add/update/remove.
- **Optimistic updates:** practice add/status/remove snapshot every cached list (one per status
  filter), apply the change per filter, roll back on error with a specific toast ("Couldn't remove
  474/D from your practice list" + the reason + a reference for unexpected errors), and invalidate
  on settle. `PRACTICE_ITEM_EXISTS` → info toast, no rollback; DELETE `404 NOT_FOUND` → done.
  Sync: "Syncing…" at once via `useIsMutating` (survives remounts), `lastSyncedAt` set from the
  answer and rolled back on error, success toast with the new submission count, then stats,
  recommendations and the user are invalidated. `SYNC_IN_PROGRESS` is an info toast.
- **Dashboard** by state: NO_HANDLE → the handle-link hero on the plate (why we need it, the form,
  "What happens next": link → first sync about 1 min → scoreboard); linking starts the first sync.
  NOT_SYNCED → chalk header + plate first-sync notice. Synced → chalk scoreboard (CountUp figures,
  parallax content, last synced relative time, Sync now, Unlink with a confirm dialog), a ruled grid
  of Topic strength (Recharts radar of the 8 most practised topics + table toggle), Weak topics,
  Topic pairs (struggle / hold up together, ≥ 3 attempts, split at 0.5), the 30-day overs strip
  (+ table), and Next topics (cards with reasons and problems, staggered). Every block has a skeleton,
  an empty state and an error with retry. Recommendations show in every state (never blank).
- Handle form messages: `CF_HANDLE_NOT_FOUND` / `CF_HANDLE_TAKEN` under the field with the typed
  handle, `CF_UNAVAILABLE` "Codeforces seems slow right now…" below the form, validation details on
  the field, a reference for unexpected errors. New message contexts (no new codes): `linkHandle`
  for `CF_UNAVAILABLE` and `SYNC_IN_PROGRESS`, `unlinkHandle`, and `sync` for `CF_HANDLE_NOT_FOUND`.
- Problem cards: rating, tags, Codeforces link (new tab), "Find similar" → new
  `/problems/:contestId/:index/similar` page, "Add to practice" (optimistic, then a drawn tick).
- `/practice`: status filter with counts, mark solved / skip / back to to-do / remove, all
  optimistic with a tick on confirmation. Navbar has Practice.
- UI: `QueryState`, `ConfirmDialog` (+ `useDialogFocus` trap), `Mark`, `PanelHeading`,
  `SegmentedControl`, `TableToggle`, `SuccessTick`; `Input tone="plate"`; button variants
  `onChalk` / `chalkText`; `styles/dashboard.css`. DESIGN.md has a new "Dashboard" section.
- Recharts 3.10 added (own `charts` vendor chunk). Tests: test setup stubs `ResizeObserver` and
  dismisses sonner toasts after each test (its store is global). Frontend: 86 files, 431 tests,
  coverage 99.7% lines / 97.1% branches. Lint, tests and build green.
- Checked in headless Chrome (mock API) at 1366 px dark/light and 760 px: fixed a clipped radar
  label and line-coloured empty slots in the problem grid.

### Session 14 (2026-10-30) — Stuck input/result, problem pages, history, "I solved it", Last 5

- **Session 13 extras first.**
  - "I solved it" (`VerifyButton`) on every recommended problem card and every to-do practice row,
    shown only with a linked handle. `POST /practice/:id/verify` (sync timeout). Verified → the
    item becomes `solved` in every cached list at once, a drawn tick ("Solved on Codeforces") and a
    toast, stats/user/practice refresh, recommendations refresh after 1.8 s (so the card does not
    vanish under the cursor). `NOT_SOLVED_YET` / `STILL_JUDGING` → status line; `RATE_LIMITED` →
    a live countdown from `details.retryAfterSeconds` with the button disabled; other errors → a
    toast with new `verify` message contexts (CF_HANDLE_NOT_LINKED, CF_UNAVAILABLE, SYNC_IN_PROGRESS).
  - **Backend: `lastResults`** on topic stats: the recompute keeps every attempted problem per key
    and stores the 5 newest `{ problemId, solved }` (`STATS.lastResults`, model field, `statView`).
    Returned by `GET /users/me/stats` and the summary lists. Weak topics table has a "Last 5" column
    (■ solved, □ not solved, an `img` with a sentence, a legend). API.md updated.
- **/stuck:** four tabs (keyboard tabs), text with a live count, link, PDF and image drop zones
  (drag-and-drop, browse, Ctrl+V pastes a screenshot from anywhere on the page). Client checks
  mirror the backend (`lib/stuckInput.js`: 40 chars, http(s) only, credentials, ports, private
  hosts, 5 MB, types per tab) and are worded through `getUserMessage` like server errors. Specific
  messages for every stuck code (URL_NOT_ALLOWED per reason, FILE_TYPE_UNSUPPORTED per tab,
  INPUT_UNREADABLE / URL_FETCH_FAILED with "Paste text instead", RATE_LIMITED with the reopening
  clock time and a History link). Practice-only note. "I'm stuck on this" on a problem page
  pre-fills the link. Success seeds the result cache and opens `/stuck/:id`.
- **/stuck/:id:** `StuckResultSkeleton`; chalk strap with detected tags and their source badge;
  plate fallback banner by `fallbackReason`; hints one at a time (wipe, focus moves to the new
  hint); concept gap cards (weak/unseen, strength bars); warm-up problems (+ practice,
  `addedFrom: stuck`, broader-picks note); "Show full solution"/"Show editorial" lazy-loads
  `/stuck/:id/solution` (skeleton, AI approach/steps/complexity/code with copy/pitfalls + editorial,
  editorial alone, or similar problems with editorials; error with retry). Unknown id → its message.
- **LaTeX:** `lib/latex.js` (`$$$$$$x$$$$$$` → display block, `$$$x$$$` → `$x$`) and `ui/Markdown`
  (react-markdown + remark-math + rehype-katex, `throwOnError: false`, no raw HTML).
- **/problems/:contestId/:index:** chalk strap (id, title, rating, tags, Codeforces link), statement
  sections, "Add to practice" on the plate, "I'm stuck on this", folded editorial, a no-statement
  notice for `cf_api` rows, similar problems with `meta.strategy` in small print, skeleton, and the
  PROBLEM_NOT_FOUND message with the id. **/problems:** topic / rating-from / rating-to filters in the
  URL (crossed range corrected, page reset), skeleton rows, kept previous page while loading, pager,
  empty state. Problem titles on cards now link to the detail page.
- **/history:** table (when, problem → result, input, answer, gap tags), pager, empty state. Delete
  is optimistic with an **Undo** toast: the row leaves every cached page at once, the DELETE is sent
  after 5 s (or on leaving the page); Undo restores it without a request; a failed DELETE restores
  it with a specific toast; STUCK_QUERY_NOT_FOUND counts as done.
- Navbar: Dashboard, I'm stuck, Problems, Practice, History (links never wrap).
- **Production build bug found and fixed (pre-existing since Session 12):** the built app was a blank
  page ("Cannot set properties of undefined (setting 'Activity')"). The name-based `manualChunks`
  put React's CommonJS wrapper in the `charts` chunk, creating a react ↔ charts import cycle. Vendor
  chunks are now assigned by package path (`vendorChunk` in `vite.config.js`); new `markdown` chunk.
  The dev server never showed it, which is why earlier visual checks passed.
- Tests: `test/nodeFormData.js` swaps in Node's FormData/File (jsdom's hang inside MSW uploads);
  Testing Library async timeout 3 s (coverage makes cold renders slow). Frontend 86 → 106 test files,
  431 → 542 tests, coverage 99.7% lines / 95.7% branches. Backend 1232 tests. Lint, tests and build green.
- Checked the production build in headless Chrome (mock API) at 1366 px dark/light and 760 px:
  stuck, result (AI and fallback), problem, browser, history, practice, dashboard Last 5. Fixed: the
  hint buttons stacked (now one row), an empty line-coloured gap cell at 760 px (`auto-fit`), a
  doubled 3px rule on list tables, and the nav wrapping "I'm stuck".

### Session 15 (2026-10-30) — Final: Impeccable audit/harden/animate/polish, perf, e2e, production, docs

- **Audit** (rendered: production build + test backend, every route at 1366 and 390 px, both themes,
  Impeccable detector over CDP). Scores before fixes: a11y 3, performance 2, theming 4, responsive 1,
  integrity 3 (13/20). Fixed: **every page scrolled sideways on phones** (99 px; history 186 px). The
  score bug now wraps below 860 px (links on their own scrollable row with an edge fade, the current
  link scrolled into view by `useActiveIntoView`, the name hidden under 520 px); wide tables sit in
  `.scroll-x` boxes (positioned, so `sr-only` text cannot escape them); `body { overflow-x: clip }`
  as a safety net. The empty-state figure was 1.5:1 (Line on Band): now Ink Soft at step 4.
  Not changed: the detector's "cream palette" on light mode (pinned in DESIGN.md) and one 89-char
  line on the fallback strap (inside the 68ch body rule).
- **Harden:** pasted titles are clamped (history 2 lines, result strap 3 lines, `overflow-wrap:
  anywhere`, full text in `title`). Checked a 200-char unbroken paste, a long name with emoji, the
  dashboard with `/stats` failing (error + reference + retry, recommendations still shown) and with
  recommendations offline: no overflow, never blank.
- **Animate:** motion language kept (wipes, 96% press, parallax planes). The global reduced-motion
  `0.01ms` kill was removed (it also erased colour/hover feedback); instead `Wipe` fades in over
  160 ms (`.reduced-enter`), pressed buttons dim to 0.78, the skeleton sweep stops, the spinner slows.
  Verified in a real browser by `e2e/tests/motion.spec.js`.
- **Polish:** type sizes consolidated: new `--step-lead` 1.08rem (was 1.05/1.06/1.08/1.1), row titles
  on step 1 (was 1.15/1.2), badge text raised to the step -1 floor (was 0.7/0.75). DESIGN.md updated.
  Detector advisories 43 → 22 (the rest are the documented in-row figures).
- **Performance:** every signed-in page is a `React.lazy` chunk (`lib/lazyPages.js`) behind
  `Suspense` with a page-shaped skeleton (`RouteFallback` + the page's skeleton); landing, auth and
  404 stay in the entry. Initial JS **~496 → ~255 kB gzip**; charts (100 kB) and markdown/KaTeX
  (120 kB + its CSS) load only on their pages. After login/signup, `usePrefetchDashboard` loads the
  dashboard chunk and its four queries (shared `*Options` factories keep the keys identical).
- **E2E:** new `e2e/` workspace (Playwright 1.64, Chromium). `server/start.js` refuses to run without
  `E2E=1`: in-memory MongoDB, 24 seeded problems, a fake Codeforces client (any `e2e_*` handle, a
  25-submission history with its own id range per handle) and the real coach chain around a fake
  provider (`AI-OUTAGE` in the text makes it fail). Playwright builds the frontend and runs
  `vite preview` (proxy target from `VITE_API_PROXY`). 10 tests: signup → link → first sync → stats
  (14 solved), unknown handle, optimistic add (request held) + rollback, stuck → 3 hints → full
  solution, AI fallback, history delete with Undo then the real DELETE, press/parallax/reduced
  motion. Found by looking at screenshots: my fake first reused submission ids across handles, so
  only the first synced user got data, and the first dashboard test only checked tiles existed.
- **Production:** `/health` now reports `db` (`ok`/`degraded`, always 200); new `/health/ready`
  answers 503 `DB_UNAVAILABLE` until MongoDB is connected. `CLIENT_URL` drops a trailing slash.
  helmet, CORS to CLIENT_URL only, `trust proxy` 1 in production and no stacks in production were
  already in place and are tested. `frontend/vercel.json`: SPA rewrite, immutable `/assets`, basic
  security headers. `.github/workflows/ci.yml`: lint + unit tests + build, then the e2e job.
- **Docs:** `README.md` (purpose, Mermaid architecture, setup, env vars, scripts, testing,
  limitations) and `docs/DEPLOY.md` (Atlas, Render, Vercel, cron-job.org warm-up + sync jobs).
- Frontend `testTimeout` 10 s (the sync flow test crossed 5 s under full parallel load).
- Totals: backend 1238 tests, frontend 111 files / 553 tests (99.7% lines, 95.7% branches),
  e2e 10. Lint, unit tests, build and e2e green.

## Final status (end of Session 15)

All 15 sessions are done. The app is feature-complete for the brief's core scope and ready to
deploy (`docs/DEPLOY.md`). Open items are optional: the solved-by-rating bands on the dashboard,
a backfill of `lastResults` for old topic stats (they fill on the next sync), a per-hour quota
figure on /stuck, C++ validation of AI code, and tracking other platforms.

## Decisions

- **Stuck / problems / history (Session 14):**
  - Client checks return ApiError-shaped `{ code, details }` so one message table words both the
    client and the server; client-only issues use `{ clientMessage }` (never the raw ApiError message).
  - History delete waits 5 s before the DELETE (Undo has no server endpoint, so nothing is deleted
    until the window ends). The hook lives in the page, not the table, so deleting the last row
    (table unmounts) does not commit early.
  - Problem pages are behind login like the rest of the app (they offer practice actions).
  - The solution and editorial are folded until asked (hints first), on both the result and problem pages.

- **Dashboard (Session 13):**
  - One plate per screen, chosen by state (hero / first-sync notice / lead next topic). The page
    test counts plates.
  - Recommendations are shown in every state, including NO_HANDLE (cold start), so the page is
    never just a form.
  - Linking a handle starts the first sync immediately (the onboarding promises "first sync ~1 min").
  - Radar = `GET /users/me/stats?kind=single&sort=attempted&limit=8`; fewer than 3 topics → table
    only. Pairs = `kind=pair&sort=attempted&limit=100`, eligible with ≥ 3 attempts.
  - The batting card's "last 5" marks from the mockup are not shown: the API has no per-topic
    recent results. It shows strength + level word + solved/tried instead.
  - Adding to practice does not refetch recommendations (they are only marked stale), so cards
    don't jump away under the cursor; the card says "In practice" instead.
  - "Mark solved" in the practice list is a manual status change; the verify endpoint ("I solved
    it", with a sync) is not wired yet.

- **Design direction (Session 12):** the user chose **direction B · Scorecard**. Dark is the default;
  light is available from the navbar toggle (system preference first, saved choice in localStorage).
  Every cricket-style element gets a plain-language label with the cricket name as a small caption,
  plus a table or text alternative. Desktop-first (1024px+): no mobile layout yet, but grids collapse
  below 860px so nothing breaks. `frontend/DESIGN.md` is the source of truth; mockups stay reference only.
- **Frontend conventions (Session 12):** tests sit next to their source (`*.test.jsx`). Motion
  primitives expose `data-motion="on|off"` for tests. Tailwind colour classes for idle and active
  states live in separate strings, never as two competing utilities on one element. Signup sends
  name/email/password only (the API has no handle field on signup), so the Codeforces handle is linked
  later on the dashboard. Only the session-ending 401 codes log the user out.

- **Stuck flow (Session 10):**
  - ~~Image reading and the coach each get their own 40 s deadline~~ (Fix-up 10.5: one shared 50 s
    request deadline, see above). A call that timed out only because the deadline clamped it does not
    open the circuit; reaching the deadline stops the chain (`AI_TIMEOUT`), no other provider is tried.
  - Network errors (`fetch failed`, ECONNRESET) are **not** retried any more (only 429/500/502/504);
    the next provider is tried at once. Circuit-skipped providers count as `AI_UNAVAILABLE`, not busy.
  - Exact text match = statement's first line equals a stored title (index prefix like "A." removed,
    case/spaces ignored) **or** the statement contains the first 200 chars of a stored description,
    checked only among the 5 `$text` neighbors (one query, reused for the neighbor tags).
  - Neighbor tags: tags shared by ≥ 2 of the 5 nearest (max 4), else the single most frequent tag.
    Neighbor median rating (rounded to 100) only when neither the DB nor the AI gave a rating.
  - "Easier on gap topics": if the gap has a weak/unseen **single** topic, `findSimilar` gets
    rating − 150 (or the user's rating − 150 if the problem rating is unknown). Solved problems excluded.
  - Gap = every single + pair key; `items` (weak + unseen) sorted weak first, then strength, singles
    before pairs. Stored `gap` holds only the items. Strength rounded to 2 decimals.
  - The AI solution is stored in `stuckqueries.solution` and only served by `/stuck/:id/solution`;
    `result` holds exactly the public response. History rows read `result.problem` only.
  - Malformed, unknown and other users' ids all → `404 STUCK_QUERY_NOT_FOUND`.
  - SSRF: DNS checked per hop (redirects followed manually, max 3), ports 80/443 only, no credentials,
    and again at connect time by the undici Agent (Fix-up 10.5), so there is no rebinding window.
    Validation `field` names use the `body.` prefix like the validate middleware.
  - Uploads: mime allow-list in multer, then a magic-byte check per input type (`.txt` must have no
    NUL byte). A second file is multer's `LIMIT_FILE_COUNT` → 400 `VALIDATION_FAILED`.
  - tesseract.js is imported lazily and reads the bundled `eng` data (no internet needed); one reused
    worker with a 15 s hard timeout. An OCR failure or timeout is logged at warn and kept as the
    `cause` of `INPUT_UNREADABLE`. Concurrent OCR requests queue on the one worker (their wait counts
    toward their own timeout).
  - Rate limit 10 / hour / user on `POST /stuck` only, before multer (failed requests count).

- **LLM coach chain (Session 9):**
  - Result: `{ answer, source: 'cache'|'ai', provider, model }` or `{ answer: null, source: 'fallback',
    reason }`. `getCoachAnswer` has an outer catch too, so even a bug ends as `AI_UNAVAILABLE` (logged at error).
  - Order: cache → each provider in order (Gemini models from `GEMINI_MODELS`, then Groq). Every
    failure is logged at warn with `provider`/`model`/`attempt` and a short error summary (no key).
  - ~~Retryable: HTTP 429/500/502/503/504, timeouts, network codes~~ (Session 10: only 429/500/502/504,
    1 retry after 1 s; a timeout or 503 skips the model and opens its circuit for 2 min; total 40 s deadline;
    order first Gemini → Groq → other Gemini models).
    Anything else (404 model gone, 400, invalid JSON, schema mismatch) moves to the next model at once.
  - Invalid JSON / schema mismatch = failure of **that model** (not retried, not cached), next model.
    Answers need ≥ 1 non-blank hint and an approach after sanitizing.
  - ~~With 3 tries the waits are 1 s and 2 s~~ (Session 10: 2 tries, one 1 s wait).
  - Budget: one unit per call attempt, keyed `name:model`. A full budget skips straight to the next
    provider; if **every** provider was skipped for budget the reason is `AI_BUSY`, else `AI_UNAVAILABLE`.
    The budget is per process (in memory) and shared by coach and image reading.
  - Cache key: `problem:<id>` when known, else `text:<sha256>` of NFKC text with whitespace runs
    collapsed and trimmed (case kept: `n` vs `N` matters). `problemId` without text → cache only,
    then `NO_INPUT`. Cache read/write errors are warn-logged and treated as miss/skip. Cached entries
    are re-validated on read (an outdated shape is a miss). Writes are upserts (no E11000).
  - Sanitizer: tags lower-cased, official topic tags only (`*special` dropped), deduplicated, max 8;
    rating numeric strings accepted, clamp then round to 100, else `null`; hints ≤ 3, steps ≤ 12,
    pitfalls ≤ 8, items ≤ 500 chars, approach ≤ 4000, code ≤ 20,000 (indentation kept).
  - Provider errors are a plain `LlmError` (not an `AppError`): they never leave the module, so no
    new error code (and no frontend message) was needed.
  - `extractImageText(buffer, mimeType)` → `{ text, provider, model }` or null (empty text is a
    failure); null lets Session 10 fall back to tesseract or ask for text.

- **Recommendations + practice (Session 8):**
  - Frequency = **share** (0–1) of rated problems within ±300 of the user's rating with the tag, so
    `priority = (1 − strength) · ln(1 + share)`. The cached aggregation is per (rating, tag) and does
    not depend on the user; `topicFrequencyAtRating` does the per-user window in JS.
    The cache lives in the recommendations service (one per process via `createServices`).
  - Fewer than 3 learning-zone topics → the rest is filled with the most frequent tags (mastered
    ones skipped), so the answer always has 3 topics (`basis` tells which kind). Cold start = all frequent.
  - "Recent failed" = the 10 problems attempted but **never solved**, by last submission time.
  - Div1/Div2 copy = same title (trimmed, case-insensitive, spaces collapsed) and contest id ±2.
    Solved problems missing from `problems` are matched by id only.
  - Pool items are ranked by `similarityToFailed`; fill-up items from `findSimilar` keep its own order
    (topic match first), so an off-topic problem never outranks an on-topic one. Items carry `pickedBy`.
  - A problem is recommended under at most one topic. No user without a handle is refused:
    `meta.reason` (`NO_HANDLE`/`NOT_SYNCED`) like the stats endpoints.
  - Practice: missing item on PATCH/DELETE → `404 NOT_FOUND` (no new code, so the frontend needs no
    new message). 409 has `details.problemId`. Every answer includes the problem summary.
    `POST /practice` checks the account exists (401 `AUTH_INVALID_TOKEN` otherwise).
  - Verify: pending submissions are never stored, so `syncUser` returns them as `pending`;
    `STILL_JUDGING` = the newest pending id on the problem/copies is newer than every stored one.
    An OK wins over a pending newer submission. Inside the cooldown, verify checks stored data and
    only re-throws `RATE_LIMITED` when no solve is found (never a false `NOT_SOLVED_YET`).
    Copies are found with anchored `_id` prefix regexes (`^1899/` … `^1903/`), which use the `_id` index.
  - Cooldown is checked **after** acquiring the lock (released in `finally`), so a concurrent sync
    shows `SYNC_IN_PROGRESS` and a just-finished one has already written `lastSyncedAt`.
  - `findSimilar` fill-up replaces the Session 5 rule "advance only on zero results"; `meta.strategy`
    is the first contributing attempt (its window/target in `meta`), `meta.strategies` all of them.

- **Topic stats (Session 7):**
  - Recompute is a **full rebuild** from all stored submissions (≤ 10k per user, one `find` +
    one `bulkWrite`: `deleteMany` of keys not in the new set, then `replaceOne` upserts). Simpler
    than incremental, and decay changes every score anyway.
  - The `$nin` in the stale-key filter is wrapped in `mongoose.trusted()` (see sanitizeFilter).
  - `attempted`/`solved`/`failed` count **problems**, not submissions. Decay uses the problem's
    **last** submission time (as specified), also for solved problems.
  - Rating/tags of a problem come from its newest submission that has them (submissions are
    read oldest first; a missing rating or empty tags do not override older values).
  - Unknown user rating (`cfRating: null`) → weight 0.5 for every problem.
  - `comfortRating` "fewer than 3 solves" means fewer than 3 **rated** solves in the last 365 days.
    Unrated solves count for `solved`/strength but not for ratings. Medians of an even count are
    averaged, then rounded.
  - Empty-on-purpose answers are `200` with `meta.reason`: `NO_HANDLE`, plus `NOT_SYNCED` (handle
    linked, never synced) so the UI can say "sync to see your stats" instead of a blank chart.
  - Summary: strongest/weakest are **single** topics only; weakest needs ≥ 3 attempted problems.
    All 14 rating bands and all 30 days are always present (zero-filled). Days are UTC.
  - A recompute error fails the sync (inside the lock, as in Session 6); the submissions are already
    stored, so the next sync recomputes again.

- **Handle + sync (Session 6):**
  - `CF_HANDLE_TAKEN` is checked in the DB (with the index collation) **before** calling Codeforces,
    and E11000 from the unique index is also mapped to it (race).
  - Linking a **different** handle (case-insensitive compare) deletes the user's submissions and
    topic stats and resets `lastSyncedAt`/`lastSubmissionId`; re-linking the same handle keeps them.
  - Link/unlink refuse with `SYNC_IN_PROGRESS` while the lock is held, so a running sync can't
    write submissions of a handle that was just removed.
  - Lock: `findOneAndUpdate` with `syncLockedUntil: { $not: { $gt: now } }` (matches null/missing/
    expired). No match → `SYNC_IN_PROGRESS` if the user exists, else `AUTH_INVALID_TOKEN`.
    Released in `finally` (only by the caller that acquired it).
  - `CF_HANDLE_NOT_LINKED` is **400** (as listed in API.md).
  - Pending submissions (no verdict / `TESTING`) are not stored, and `lastSubmissionId` never moves
    past the oldest pending one; the next sync re-reads from there and duplicates are ignored.
  - The 20-page cap applies to every sync (on incremental syncs it is only a safety net). A user with
    more than 10,000 submissions gets only the newest 10,000 on the first sync.
  - Duplicates: `insertMany({ ordered: false })`; an error made only of E11000 write errors counts
    `insertedDocs`. Any other failure → 500 `INTERNAL_ERROR` with the cause.
  - The rating is refreshed after inserting; if `userInfo` fails the cursor is not advanced (the
    inserted rows stay, the next sync ignores them as duplicates).
  - `onSynced(userIdString)` runs inside the lock; if it throws, the error goes to the caller (the
    lock is still released). Session 7 plugs `createServices({ onSynced })`.
  - The sync-all job skips a run that starts while one is in progress (cron + HTTP trigger), and
    `run()` never rejects. Cron tasks also use node-cron's `noOverlap`.
  - The internal secret compare hashes both sides (sha256) then `timingSafeEqual`. No configured
    secret → always 403. The secret header is already redacted in logs.
  - Problemset refresh: only rows with `source: "cf_api"` are compared (tag order ignored) and the
    update filter re-checks the source. `jobs/` imports `scripts/import/syncNewProblems.js` directly
    (it is library code; `modules/` still never imports from `scripts/`).

- **Problems / similar search (Session 5):**
  - ~~Fallbacks advance only when an attempt returns zero results~~ (Session 8: later attempts now
    fill the free slots). Order: primary → widened ×2 → no rating filter (tagged input) / ±200 band (untagged, rated)
    → near rating (no filter). The last attempt is empty only if nothing is left in the DB.
  - "Near the user's rating" target = `userRating` (optional service input, for later callers
    like stuck/recommendations) → problem rating → 1200 (`SIMILARITY.defaultTargetRating`).
  - The closeness used for scoring is the attempt's own window (600 when widened, 200 in the band).
  - Sort tie-break uses the absolute rating distance (unrated last) after closeness, so ranking
    still means "nearest" outside the window (closeness is 0 there).
  - Title duplicates are excluded inside the pipeline (`title $nin`), no extra query.
  - Responses use `id` (not `_id`), like users. `toProblemSummary`/`toProblemDetail` fill
    defaults because bulkWrite-inserted `cf_api` rows have no `description`/`editorial`/`hasEditorial`.
    Detail adds `hasStatement`.
  - List order: newest contest first (`contestId` desc, `index` asc); with `q`, textScore first.
    No new index (an in-memory sort of ≤ 12k docs is fine for now).
  - Query blanks (`?limit=`) count as missing; tags accept a comma list and repeated params.
    Listing may filter by `*special`; similar search ignores it.
  - Index params are upper-cased before validation (`/problems/4/b1` → `4/B1`).
  - Pipeline stages only use zod-validated values, our constants, or values read from our DB.

- **Auth (Session 4):**
  - `createApp()` now **requires** `auth.jwtSecret` (throws `TypeError` otherwise). No default secret.
  - Services that need config are factories (`createAuthService`); `users.service` stays plain
    module functions like `meta.service`. Future protected routers get `requireAuth` through
    `createApiRouter({ auth })`.
  - bcrypt cost **12** by default; tests use cost 4 via `TEST_AUTH.hashRounds` (one service test
    checks the real 12). Passwords over **72 bytes** are rejected (bcrypt silently truncates).
  - Login with an unknown email still runs `bcrypt.compare` against a lazily built dummy hash, so
    both failures take similar time and return the same `AUTH_INVALID_CREDENTIALS` message.
  - Login does not re-check signup password rules (only non-empty, max 256).
  - Duplicate email is detected from the unique index (E11000 → `AUTH_EMAIL_TAKEN`), not by a
    pre-check, so there is no race.
  - JWT: HS256 only (`algorithms` pinned on verify), `sub` = user id, `email` claim; payload
    checked with zod (24-hex `sub`). Non-JWT verify failures also become `AUTH_INVALID_TOKEN`.
  - `requireAuth` is stateless (no DB lookup). `/auth/me` and `/users/me` read the DB; a deleted
    account → `401 AUTH_INVALID_TOKEN` ("This account no longer exists") so the client logs out.
    No new error code.
  - Header must be exactly `Bearer <jwt>` (three base64url parts); otherwise `AUTH_INVALID_TOKEN`.
    A missing/blank header is `AUTH_REQUIRED`.
  - User responses use an explicit whitelist (`toPublicUser`) with **`id`** (not `_id`); internal
    fields `syncLockedUntil`, `lastSubmissionId` are never returned.
  - `PATCH /users/me` uses `z.strictObject`, so unknown fields (e.g. `email`) are a 400.
  - The strict auth limiter covers only signup + login (changed in the pre-Session-5 check;
    `/auth/me` is called on every page load).
  - Signup `name` is required (2–50). The model still allows up to 80 / default `""`.
- **Mongoose 8** pinned (`^8.24`) as required by backend/CLAUDE.md (npm's latest is 9).
- **Vitest 3.2** (not 5): npm 10.9 crashes (`edgesOut` bug) when resolving the peer set
  for `@vitest/coverage-v8@5`. Revisit after an npm upgrade.
- **Env loading** uses Node's built-in `--env-file-if-exists=.env` (no dotenv).
  `parseEnv(source)` is pure and testable. `getEnv()` caches. `createApp()` takes its config
  as arguments (`isProduction`, `clientUrl`, `logger`, `rateLimit`, `trustProxy`), so tests
  never need a real env.
- Required env vars right now: `MONGODB_URI`, `JWT_SECRET` (32 or more chars), `GEMINI_API_KEY`,
  `GEMINI_MODELS` (parsed to an array), `CRON_SECRET` (16 or more chars). Empty `GROQ_*` = disabled.
- **Error responses**: outside production, `error.stack` is added. In production it never is.
  Unknown errors always get a generic message. AppError messages are written by us, so they
  are shown in every environment.
- `jsonSyntax` mapper also maps body-parser `entity.too.large` → 413 `FILE_TOO_LARGE`.
- Multer: `LIMIT_FILE_SIZE` → 413 `FILE_TOO_LARGE`, `LIMIT_UNEXPECTED_FILE` → 415
  `FILE_TYPE_UNSUPPORTED`, other multer limits → 400 `VALIDATION_FAILED`.
- Mongo duplicate key → 409 `DUPLICATE_RESOURCE` with `details.fields` (names only, never values).
- `validate()` replaces `req.body`/`req.params` with parsed data and shadows Express 5's
  read-only `req.query` getter with an own property. All parts are reported in one error.
- `pairKey` throws `ValidationError` for equal, unknown or `*special` tags.
- Rate limit: 300 requests per 15 min per IP on `/api` (draft-7 headers). `trust proxy` = 1 in production.
- `retry` uses full jitter and re-throws the last error unchanged (callers throw typed errors).
- `fetchWithTimeout` maps timeouts → 503 and network errors/aborts → 502, with
  `errorCode` injectable (default `URL_FETCH_FAILED`).
- ESLint also forbids `.then()` (root rule 2). `_`-prefixed args are allowed to be unused
  (Express needs the 4-arg error middleware signature).
- The parquet dataset now lives in `backend/data/cf_problems.parquet` (git-ignored); the root
  `data/` folder is empty.
- **sanitizeFilter is global**, so our own operator filters must be marked trusted:
  `{ rating: mongoose.trusted({ $gte: lo, $lte: hi }) }`, `{ $text: mongoose.trusted({ $search: q }) }`.
  Untrusted operators become `$eq` (and then fail to cast), and an untrusted `$text` throws.
  Aggregation pipelines are not sanitized. Only wrap values we built ourselves, never raw input.
- **cfHandle index**: unique with a `partialFilterExpression` (`$type: 'string'`) instead of
  `sparse` (sparse still indexes `null`, so two unlinked users with `null` would collide), plus
  collation strength 2 because CF handles are case-insensitive. To unlink, `$unset` the field.
  Lookups by handle should pass the same collation to use the index.
- `passwordHash` has `select: false`; auth must query with `.select('+passwordHash')`.
- `contestId` is a Number. Problem `_id` must match `PROBLEM_ID_PATTERN` = `^\d+\/[A-Z0-9]{1,3}$`
  (Session 3; all 10,024 dataset ids match).
- **Parquet types:** hyparquet returns `rating` as BigInt **and `contest_id` as a string**.
  `readParquet` turns every BigInt into a Number; `cleanProblem` also accepts BigInt/strings.
- **`*special` stays in `problems.tags`** (it is a real CF tag, 485 imported rows). Stats code
  must skip it (`SPECIAL_TAG` in `cleanProblem.js`; `isTopicTag` in `tags.js`).
- **bulkUpsert timestamps:** both modes pass `timestamps: false` and write `createdAt`/`updatedAt`
  via `$setOnInsert`. Otherwise Mongoose bumps `updatedAt` on every match and a re-run reports
  every row as modified. Trade-off: `updatedAt` on hf rows is the first import time.
- **Import uses `$set`** (re-runs refresh hf text; it also upgrades a `cf_api` stub to `hf`).
  **Sync inserts with `$setOnInsert`**; since Session 6 it also updates rating/tags (only) of
  existing `cf_api` rows. Sync drops unknown future CF
  tags instead of rejecting the problem; the import rejects them (none in the dataset).
- Rows are checked by `validateProblemDoc.rejectReason` (id pattern, contestId, `id ===
contestId/index`, title, known tags) because `bulkWrite` skips schema validators.
- The sync logic lives in `scripts/import/syncNewProblems.js` (next to `bulkUpsert`) so
  `modules/` never imports from `scripts/`. The weekly job (`jobs/`) imports it from there.
- Scripts only need `MONGODB_URI` (`parseScriptEnv`, a `pick` of the main env schema).
- CF client errors: FAILED "handle … not found" → 404 `CF_HANDLE_NOT_FOUND`; "Call limit
  exceeded", 5xx, 429, timeouts, network errors → `CF_UNAVAILABLE` and retried (each retry goes
  back through the limiter); other FAILED/4xx → 502 `CF_UNAVAILABLE`, not retried. No new codes.
- Entry-point blocks of the two scripts are `c8 ignore`d; their logic is tested via exports.
- `tagCount`/`hasEditorial` are set in a `pre('validate')` hook. `bulkWrite` skips hooks, so the
  import script must spread `problemDerivedFields(doc)` itself.
- Problem `tags` are validated against the 37 tags; `submission.problemTags` are not (a new CF
  tag must not break sync).
- `topicKey` is validated against its `kind` (36 topic tags or 630 pair keys).
- `stuckqueries`/`llmcaches` have `createdAt` only. Gap `status` enum chosen as
  `untouched|weak|ok|strong` (not specified in the brief). `tagsSource` stays unset until known.
- `submission.verdict` is limited to the 17 CF API verdicts (`CF_VERDICTS`).
- Test globalSetup must not import `vitest`, hence the separate `tests/helpers/mongoServer.js`.
- mongodb-memory-server 11 downloads MongoDB 8.2.6 (~780 MB) once on first run and caches it
  (here: `~/.cache/mongodb-binaries`). CI should cache that folder.

## Blockers

- None. (Frontend messages for all 27 backend codes, incl. DB_UNAVAILABLE, were added in Session 12.)

## Resolved (done by the human outside sessions)

- check:server PASS against Atlas (health, tags, signup, login, /me x25, wrong password).
- Gemini: GEMINI_MODELS=gemini-3.8-flash,gemini-3.5-flash-lite. Lite answers OK in 17–28 s;
  3.8-flash often returns 503 "high demand" (temporary). Session 9 handles this.
- sync:problemset (first run): fetched 11481 · inserted 1721 · alreadyPresent 9760 ·
  total 11702.
- College Wi-Fi blocks port 27017; use a hotspot or another network for Atlas work.
- Live sync test (Session 6) on Atlas: handle <your handle> linked, first sync
  newSubmissions <N> in <~X> s, second sync newSubmissions 0.
- sync:problemset (second run): inserted <N> · updated <N>.
- Groq key added, model openai/gpt-oss-120b (configured, not yet needed in live test).

## Next

- ~~Dashboard session~~ done in Session 13 (wagon wheel, batting card, overs strip, handle form, Sync now).
- ~~Practice "I solved it"~~ and ~~problem detail page~~ done in Session 14. Still open: the summary's
  solved-by-rating bands are not drawn yet; existing topicstat docs get `lastResults` on their next sync.
- ~~Session 15: a polish/audit pass; lazy-load the `markdown` chunk~~ done (route-level splitting). Still open:
  only on stuck/problem pages, and a per-hour quota figure on /stuck if the API exposes it.
- ~~Live stuck check~~ done in Fix-up 10.5 (`npm run check:stuck`, table above). Groq was not reached
  (the first Gemini model answered every time); its order is covered by tests only.
- Possibly tighten the coach prompt or validate C++ code (the lite model once dropped `include <`).
- Stuck frontend (Session 11+): `POST /stuck` as multipart; show `hints` + `gap` first, a "Show
  solution" button → `GET /stuck/:id/solution` (`kind` ai/editorial/none); `notice` for `fallback`
  with "AI busy, try again in a minute" for `fallbackReason: AI_BUSY`; history page with paging and
  delete; the 10/hour limit (`RATE_LIMITED`, show the wait). UI copy: practice/upsolving only.
- Possible later: `addedFrom: "stuck"` in a one-click "add similar to practice" from the stuck result.
- Frontend: store the JWT, send `Authorization: Bearer`, and on any 401 `AUTH_*` (except
  `AUTH_INVALID_CREDENTIALS`) clear the token and go to login.
- ~~Frontend: recommendations page~~ (done in Session 13 on the dashboard, except verify). Was: (`GET /recommendations`; show `reason`, a notice for `meta.reason`,
  and label `pickedBy: similar_fallback` items as broader picks). Practice list with optimistic
  add/patch/delete reconciled from the returned item; treat `404 NOT_FOUND` on DELETE as done.
  "I solved it" button → `POST /practice/:contestId/:index/verify`; show `NOT_SOLVED_YET` /
  `STILL_JUDGING` as notices (200), and `RATE_LIMITED` with a countdown from `retryAfterSeconds`.
- ~~Stuck helper (F10 third bullet)~~ done in Session 10: `result.similar` (easier on gap topics). The
  frontend adds them to practice with `addedFrom: "stuck"`.
- ~~Frontend dashboard~~ (Session 13; the solved-by-rating bands are not shown yet). Was: `GET /users/me/stats/summary` (cards, bands bar chart, 30-day activity) and
  `GET /users/me/stats?kind=single|pair`. Show a notice for `meta.reason` `NO_HANDLE` (link a handle)
  and `NOT_SYNCED` (press "Sync now") instead of empty charts.
- Existing users on Atlas get stats only after their next sync (cron or "Sync now"); no backfill script.
- Atlas now holds 11,702 problems (9,981 hf + 1,721 cf_api), so the problemset sync has been run;
  record its summary here if it is still available.
- Frontend: the problem list uses `meta.total/totalPages`; the similar view should show a short
  notice when `meta.strategies` contains anything other than `primary` (some results are broader).
- Later callers of `findSimilar` (stuck, recommendations) should pass `userRating` and their own
  `excludeIds` (e.g. solved problems).
- Any new feature that calls Codeforces should take `services.client` from `createServices`
  (one limiter per process).
- ~~Frontend: handle form~~ (Session 13). Was: handle form (PUT/DELETE `/users/me/handle`), a "Sync now" button (POST
  `/users/me/sync`, show `SYNC_IN_PROGRESS` / `CF_UNAVAILABLE` / `RATE_LIMITED` (20 s cooldown)
  notices), and `lastSyncedAt`.
- Deploy: point an external scheduler at `POST /api/v1/internal/sync-all` with `x-cron-secret` (steps in `docs/DEPLOY.md`).
- When a feature service queries with operators, wrap them in `mongoose.trusted()` (see Decisions).

docs/PROGRESS.md: Pre-Session-5 Atlas checks: all PASS (11,702 problems, indexes in sync, server flow OK) — run on a non-college network; college Wi-Fi blocks port 27017
