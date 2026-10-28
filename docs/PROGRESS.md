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

## Decisions

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
- The parquet dataset currently lives in the root `data/` (git-ignored), not `backend/data/`.

## Blockers

- `docs/PROJECT_BRIEF.md` **does not exist**. Session 1 was built from the CLAUDE.md files
  only. Please add the brief before Session 2.
- Rule "add a code on both sides in the same session": the frontend doesn't exist yet, so
  `frontend/src/errors/messages/` could not be created. The frontend setup session must add
  messages for all 26 codes (listed in docs/API.md).

## Next

- Session 2 (suggested): `db/connect.js` (Mongoose, `sanitizeFilter`), connect and disconnect
  in `server.js` via `registerGracefulShutdown({ onClose })`, mongodb-memory-server test helper,
  `problems` model plus indexes.
- Move `data/cf_problems.parquet` to `backend/data/` (or point the import script at the root path).
