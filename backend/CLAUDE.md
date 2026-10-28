# Backend — Express 5 + MongoDB Atlas

Read the root `CLAUDE.md` first. Everything here adds to it.

## Stack

Node.js 22+ (ESM, `"type": "module"`), Express 5, Mongoose 8, zod (validation and env),
jsonwebtoken + bcrypt, helmet, cors, express-rate-limit, multer (memory storage),
pino + pino-http (logging), node-cron, `@google/genai`, cheerio, unpdf, tesseract.js
(OCR fallback), hyparquet (dataset import).
Tests: Vitest, supertest, mongodb-memory-server, `@vitest/coverage-v8`.

## Folder structure (feature modules)

```
backend/
├─ src/
│  ├─ app.js                  builds the Express app (no listen) — imported by tests
│  ├─ server.js               connects DB, starts HTTP + scheduler, graceful shutdown
│  ├─ config/                 env.js (zod-validated), tags.js, constants.js
│  ├─ db/                     connect.js
│  ├─ errors/                 AppError.js, httpErrors.js (subclasses), codes.js, mappers/
│  ├─ middlewares/            requestId, auth, validate, upload, rateLimit, notFound, errorHandler
│  ├─ lib/                    logger, fetchWithTimeout, retry, rateLimitQueue, hash, sigmoid...
│  ├─ modules/
│  │  └─ <feature>/           <feature>.routes.js · .controller.js · .service.js
│  │                          .model.js · .schema.js (zod) · helpers/ (pure functions)
│  ├─ jobs/                   scheduler.js, syncAllUsers.job.js
│  └─ scripts/                importDataset.js, syncProblemset.js
├─ tests/                     mirrors src/ (unit/ and integration/), helpers/ (db, factories)
└─ data/                      cf_problems.parquet (git-ignored)
```

Feature modules: `auth`, `users`, `meta`, `problems`, `codeforces` (client only), `sync`,
`stats`, `recommendations`, `practice`, `llm` (no routes), `stuck`.

## Layering rules

- **routes** → wire middlewares and controllers only. No logic.
- **controllers** → read `req`, call one service, send the response. Always this shape:

```js
export const getSimilar = async (req, res, next) => {
  try {
    const data = await problemService.findSimilar(req.params, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
```

- **services** → business logic. Never touch `req`/`res`. Throw typed errors
  (`throw new NotFoundError(codes.PROBLEM_NOT_FOUND, ...)`). When calling external code,
  wrap it in try/catch and re-throw as an `AppError` with the original error as `cause`.
- **helpers/** → pure functions (scoring, similarity math, parsing). Most unit tests target these.
- **models** → Mongoose schemas plus indexes. Use `.lean()` for reads and projections to
  skip large fields (`description`, `editorial`) in list endpoints.
- External clients (Codeforces, Gemini, Groq, generic HTTP) are created by factories that
  take their dependencies (`fetch`, keys, limiter) so tests inject fakes.

## Error handling (strict)

- `AppError(statusCode, code, message, details?, { cause })`, plus subclasses:
  `ValidationError 400`, `AuthError 401`, `ForbiddenError 403`, `NotFoundError 404`,
  `ConflictError 409`, `PayloadError 413/415`, `RateLimitError 429`,
  `ExternalServiceError 502/503`.
- Middleware order in `app.js`: requestId → pino-http → helmet → cors → json/urlencoded →
  rate limit → routes → `notFound` → **`errorHandler` last**.
- `errorHandler` normalizes everything through mappers in `errors/mappers/`:
  zod error → `VALIDATION_FAILED` (details = `[{ field, message }]`),
  Mongoose `ValidationError`/`CastError` → 400, Mongo duplicate key `11000` → 409
  `DUPLICATE_RESOURCE` (or a specific code), JWT errors → `AUTH_INVALID_TOKEN` /
  `AUTH_TOKEN_EXPIRED`, multer errors → `FILE_TOO_LARGE` / `FILE_TYPE_UNSUPPORTED`,
  malformed JSON → `VALIDATION_FAILED`, anything unknown → 500 `INTERNAL_ERROR`.
- Never leak stack traces or internal messages when `NODE_ENV=production`. Log the full error
  with the `requestId`.
- **Allowed exceptions to "forward every error":**
  1. LLM fallback chain: catching a provider failure to try the next provider. Log it at
     `warn`. When all providers fail, return the database fallback result (not an error).
  2. Background jobs: no `next` exists, so errors go to `jobErrorHandler` (logs and
     continues with the next user). Never crash the process.

## MongoDB collections

`problems` (`_id: "1/A"`, contestId, index, title, description, inputFormat, outputFormat,
note, editorial, rating, tags[], source `hf|cf_api`; indexes on tags, rating, and a text
index on title + description), `users`, `submissions` (unique cfSubmissionId; stores the
problem's tags and rating), `topicstats` (unique userId + topicKey), `stuckqueries`,
`llmcaches` (TTL 30 days), `practiceitems` (unique userId + problemId).
Call `mongoose.set('sanitizeFilter', true)` and validate all input with zod.

## Environment variables (`backend/.env`, mirrored in `.env.example`)

`NODE_ENV, PORT=4000, MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN=7d, CLIENT_URL,
GEMINI_API_KEY, GEMINI_MODELS=<comma list, primary first>, GROQ_API_KEY (optional),
GROQ_MODEL (optional), CRON_SECRET, SYNC_CRON="0 */6 * * *", LOG_LEVEL=info`

## Testing rules

- Every `src` file gets a test file. Unit-test helpers and services; integration-test routes
  with supertest against `createApp()` and mongodb-memory-server.
- Never call real Codeforces, Gemini or Groq in tests. Inject fakes or use `vi.mock`.
- Each route has tests for success, validation failure, auth failure (if protected), and the
  error-response shape.
- Coverage thresholds (vitest config): lines 80, functions 80, branches 75.
- Tests follow the 100-line rule too. Split by behavior (`similar.success.test.js`,
  `similar.errors.test.js`) and use factories in `tests/helpers/`.

## Commands

`npm run dev` (node --watch), `npm start`, `npm test`, `npm run test:cov`, `npm run lint`,
`npm run import:dataset`, `npm run sync:problemset`.
