# CP Coach — Progress Log

Read this first, update it last, every session.

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

## Decisions

- **Problems / similar search (Session 5):**
  - Fallbacks advance only when an attempt returns **zero** results (not when it returns < k).
    Order: primary → widened ×2 → no rating filter (tagged input) / ±200 band (untagged, rated)
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
  **Sync uses `$setOnInsert`** so it never changes an existing row. Sync drops unknown future CF
  tags instead of rejecting the problem; the import rejects them (none in the dataset).
- Rows are checked by `validateProblemDoc.rejectReason` (id pattern, contestId, `id ===
  contestId/index`, title, known tags) because `bulkWrite` skips schema validators.
- The sync logic lives in `scripts/import/syncNewProblems.js` (next to `bulkUpsert`) so
  `modules/` never imports from `scripts/`. If a cron job needs it later, move both to `lib/`.
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

- ~~Atlas unreachable~~: reachable again in Session 5 (`check:atlas` passed). `npm run check:server`
  against Atlas has still not been run.
- **Gemini models retired:** set `GEMINI_MODELS=gemini-3.8-flash,gemini-3.5-flash-lite` in
  `backend/.env` (and `.env.example`), then `npm run check:gemini`.
- Rule "add a code on both sides in the same session": the frontend doesn't exist yet, so
  `frontend/src/errors/messages/` could not be created. The frontend setup session must add
  messages for all 27 codes (listed in docs/API.md), including `DB_UNAVAILABLE` (added in Session 2).
  Session 4 added no new codes; the five `AUTH_*` codes are now emitted by real endpoints.

## Next

- Frontend: store the JWT, send `Authorization: Bearer`, and on any 401 `AUTH_*` (except
  `AUTH_INVALID_CREDENTIALS`) clear the token and go to login.
- Session 6 (CF handle linking/sync) mounts under `/users/me/...` and reuses `requireAuth` from
  `createApiRouter({ auth })`.
- Atlas now holds 11,702 problems (9,981 hf + 1,721 cf_api), so the problemset sync has been run;
  record its summary here if it is still available.
- Frontend: the problem list uses `meta.total/totalPages`; the similar view should show a short
  notice when `meta.strategy` is not `primary` (results are a broader fallback).
- Later callers of `findSimilar` (stuck, recommendations) should pass `userRating` and their own
  `excludeIds` (e.g. solved problems).
- Session 6 uses `createCodeforcesClient().userInfo` / `.userStatus`; share one client (one
  limiter) per process so all CF calls respect the 2.1 s spacing together.
- When a feature service queries with operators, wrap them in `mongoose.trusted()` (see Decisions).
