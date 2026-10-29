# CP Coach API

Base path: `/api/v1` · Dev: `http://localhost:4000` (the Vite dev server proxies `/api`).
All bodies are JSON. Every response carries an `X-Request-Id` header (a safe incoming
`X-Request-Id` is reused; otherwise the server generates a UUID).

## Envelopes

Success:

```json
{ "success": true, "data": { }, "meta": { } }
```

`meta` is optional.

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [{ "field": "body.email", "message": "Invalid email address" }],
    "requestId": "6f1c2b8e-..."
  }
}
```

- `details` is `null`, an array of `{ field, message }` (validation), or an object (see codes).
- Validation `field` names are prefixed with the request part: `body.*`, `query.*`, `params.*`.
- Outside production, `error.stack` is also included for debugging. It is **never** sent when
  `NODE_ENV=production`, and unknown errors always get a generic message.

## Rate limiting

All `/api` routes: 300 requests per 15 minutes per IP (default). `/api/v1/auth/*` also has a
stricter 20 per 15 minutes per IP (see Authentication). Responses include the
standard `RateLimit` / `RateLimit-Policy` headers (draft-7). When exceeded: `429 RATE_LIMITED`,
`details: { "retryAfterSeconds": 900 }`.

## Endpoints

### `GET /api/v1/health`

Public. Liveness check.

```json
{ "success": true, "data": { "status": "ok", "uptime": 12.34, "time": "2026-10-28T16:41:50.482Z" } }
```

`uptime` is the process uptime in seconds; `time` is the server time (ISO 8601, UTC).

### `GET /api/v1/meta/tags`

Public. The Codeforces tag lists (single source: `backend/src/config/tags.js`).

```json
{
  "success": true,
  "data": {
    "topicTags": ["math", "greedy", "implementation", "...36 total"],
    "allTags": ["math", "greedy", "...", "*special", "...37 total"]
  }
}
```

`topicTags` excludes `*special` (36 tags). `allTags` has all 37 in canonical order.
Topic-pair keys are built client-side the same way as the backend: the two tags sorted
alphabetically and joined by `+` (e.g. `bitmasks+dp`), 630 pairs in total.

### Authentication

Protected routes need `Authorization: Bearer <token>`. Tokens are HS256 JWTs with
`sub` = user id and an `email` claim, valid for `JWT_EXPIRES_IN` (default `7d`). There is no
refresh token: on `AUTH_TOKEN_EXPIRED` the client asks the user to log in again.

| Situation | Response |
|---|---|
| No `Authorization` header (or blank) | `401 AUTH_REQUIRED` |
| Header not exactly `Bearer <jwt>` (e.g. `Basic ...`, `Bearer` alone) | `401 AUTH_INVALID_TOKEN` |
| Bad signature, garbage, wrong algorithm, unexpected payload | `401 AUTH_INVALID_TOKEN` |
| Token expired | `401 AUTH_TOKEN_EXPIRED` |
| Valid token but the account no longer exists (`/auth/me`, `/users/me`) | `401 AUTH_INVALID_TOKEN` |

The public **user** object (returned by every endpoint below; never contains `passwordHash`
or internal sync fields):

```json
{
  "id": "65f1c2b8e4a1b2c3d4e5f601",
  "email": "ada@example.com",
  "name": "Ada Lovelace",
  "cfHandle": null,
  "cfRating": null,
  "cfMaxRating": null,
  "lastSyncedAt": null,
  "createdAt": "2026-10-29T14:00:00.000Z",
  "updatedAt": "2026-10-29T14:00:00.000Z"
}
```

Note: users are identified by `id` (hex string), not `_id`.

All `/auth/*` routes share a stricter limit: **20 requests per 15 minutes per IP** (on top of
the global 300). Exceeding it → `429 RATE_LIMITED`, `details: { "retryAfterSeconds": 900 }`.

### `POST /api/v1/auth/signup`

Public. Creates an account and logs it in.

```json
{ "email": "Ada@Example.com", "password": "analytical1", "name": "Ada Lovelace" }
```

- `email`: valid email, trimmed and lowercased, max 254 chars.
- `password`: at least 8 characters, at least one letter and one digit, at most 72 bytes
  (bcrypt limit). Stored as a bcrypt hash (cost 12).
- `name`: trimmed, 2–50 characters.

`201 Created`:

```json
{ "success": true, "data": { "token": "eyJhbGciOiJIUzI1NiIs...", "user": { "id": "...", "email": "ada@example.com", "name": "Ada Lovelace", "...": "see user object" } } }
```

Errors: `400 VALIDATION_FAILED` (all field problems at once, e.g.
`[{ "field": "body.password", "message": "Password must contain at least one digit" }]`),
`409 AUTH_EMAIL_TAKEN` ("An account with this email already exists"; emails compare
case-insensitively), `429 RATE_LIMITED`.

### `POST /api/v1/auth/login`

Public.

```json
{ "email": "ada@example.com", "password": "analytical1" }
```

`200 OK`: same body as signup (`{ token, user }`).

Errors: `400 VALIDATION_FAILED` (missing/invalid email, empty password; the signup password
rules are **not** re-checked here), `401 AUTH_INVALID_CREDENTIALS` with the message
"Invalid email or password" for both an unknown email and a wrong password (same message,
similar timing), `429 RATE_LIMITED`.

### `GET /api/v1/auth/me`

Protected. Returns the current user: `{ "success": true, "data": <user> }`.
Errors: `401 AUTH_REQUIRED` / `AUTH_INVALID_TOKEN` / `AUTH_TOKEN_EXPIRED`, `429 RATE_LIMITED`.

### `GET /api/v1/users/me`

Protected. Same response as `GET /auth/me`, but under the normal API rate limit.
Errors: `401 AUTH_REQUIRED` / `AUTH_INVALID_TOKEN` / `AUTH_TOKEN_EXPIRED`.

### `PATCH /api/v1/users/me`

Protected. Changes the display name only.

```json
{ "name": "Grace Hopper" }
```

`200 OK`: `{ "success": true, "data": <updated user> }`.

Errors: `401 AUTH_REQUIRED` / `AUTH_INVALID_TOKEN` / `AUTH_TOKEN_EXPIRED` (checked before the
body), `400 VALIDATION_FAILED` for a name outside 2–50 characters, a missing name, or **any
other field** (e.g. `email`), which is reported as an unrecognized key.

### Unknown routes

Any unmatched method or path → `404 ROUTE_NOT_FOUND`, e.g. `"Route GET /api/v1/nope not found"`.

## Error codes

Source: `backend/src/errors/codes.js`. Every code needs a frontend message in
`frontend/src/errors/messages/`.

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Invalid body/query/params, malformed JSON, Mongoose validation/cast errors. `details: [{ field, message }]` |
| `AUTH_REQUIRED` | 401 | Protected route called without an `Authorization` header |
| `AUTH_INVALID_TOKEN` | 401 | Header not `Bearer <jwt>`, token malformed/badly signed/not yet valid, or the account no longer exists |
| `AUTH_TOKEN_EXPIRED` | 401 | Token expired |
| `AUTH_INVALID_CREDENTIALS` | 401 | Login with an unknown email or a wrong password (one message for both) |
| `AUTH_EMAIL_TAKEN` | 409 | Signup with an email that already has an account |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `ROUTE_NOT_FOUND` | 404 | No route matches method + path |
| `NOT_FOUND` | 404 | Generic missing resource |
| `PROBLEM_NOT_FOUND` | 404 | Problem id (e.g. `1/A`) does not exist |
| `CF_HANDLE_NOT_FOUND` | 404 | Codeforces handle does not exist |
| `CF_HANDLE_TAKEN` | 409 | Handle already linked to another account |
| `CF_HANDLE_NOT_LINKED` | 400 | Feature needs a linked Codeforces handle |
| `CF_UNAVAILABLE` | 502/503 | Codeforces API down, slow or erroring |
| `SYNC_IN_PROGRESS` | 409 | A sync for this user is already running |
| `RATE_LIMITED` | 429 | Too many requests. `details: { retryAfterSeconds }` |
| `FILE_TOO_LARGE` | 413 | Upload or request body over the size limit (JSON body limit: 1 MB) |
| `FILE_TYPE_UNSUPPORTED` | 415 | Unsupported upload type or unexpected file field |
| `URL_NOT_ALLOWED` | 400 | URL not on the allow-list for problem import |
| `URL_FETCH_FAILED` | 502/503 | Fetching an external URL failed (`details.reason`: `timeout`/`network`/`aborted`) |
| `INPUT_UNREADABLE` | 422 | Uploaded file or page could not be parsed into text |
| `PROBLEM_TEXT_TOO_SHORT` | 400 | Pasted/extracted problem text is too short to analyse |
| `PRACTICE_ITEM_EXISTS` | 409 | Problem already in the user's practice list |
| `STUCK_QUERY_NOT_FOUND` | 404 | Stuck-helper query id does not exist for this user |
| `DUPLICATE_RESOURCE` | 409 | Generic unique-index violation. `details: { fields: [...] }` (field names only) |
| `DB_UNAVAILABLE` | 503 | Could not connect to or close MongoDB (startup/shutdown; not yet sent by any endpoint) |
| `INTERNAL_ERROR` | 500 | Anything unexpected. Message is always generic |

Auth codes are confirmed (Session 4). Statuses for codes not yet emitted by any endpoint (CF, upload, stuck, practice) are
the intended ones; the sessions that implement those features confirm them here.

## Data model (MongoDB)

Source: `backend/src/modules/*/*.model.js`. Shared options in `backend/src/db/schema.js`.
Every document's JSON form drops `__v` and `passwordHash` and keeps `_id` (ObjectId → hex
string, except `problems`, whose `_id` is the problem id). `createdAt`/`updatedAt` are ISO
dates. Enum lists live in `backend/src/config/constants.js`.

### `problems`

| Field | Type | Notes |
|---|---|---|
| `_id` | string | `"<contestId>/<index>"`, must match `^\d+\/[A-Z0-9]{1,3}$` (`PROBLEM_ID_PATTERN` in `config/constants.js`), e.g. `"1/A"`, `"1950/F2"`, `"1723/GP1"`, `"921/01"` |
| `contestId` | number | required |
| `index` | string | required |
| `title` | string | required |
| `description`, `inputFormat`, `outputFormat`, `note`, `editorial` | string | default `""`; CF LaTeX `$$$...$$$` kept as is |
| `rating` | number \| null | 0–4000, `null` when unrated |
| `tags` | string[] | each one of the 37 CF tags (incl. `*special`) |
| `tagCount` | number | derived: `tags.length` |
| `hasEditorial` | boolean | derived: editorial is non-blank |
| `source` | `hf` \| `cf_api` | default `hf`; `cf_api` rows (from `npm run sync:problemset`) have no statement text |

Rows are written by `npm run import:dataset` (hf, `$set` upsert) and
`npm run sync:problemset` (cf_api, insert-only, never overwrites existing rows).

Indexes: `tags`, `rating`, `{tags, rating}`, text index `problem_text` (title weight 3, description 1).

### `users`

`email` (unique, lowercased), `passwordHash` (never returned; `select: false`), `name`
(default `""`), `cfHandle` (unset until linked; unique **case-insensitively**, only when it
is a string), `cfRating`, `cfMaxRating`, `lastSyncedAt`, `lastSubmissionId`,
`syncLockedUntil` (all default `null`).

### `submissions`

`cfSubmissionId` (unique), `userId`, `problemId`, `contestId`, `index`, `problemRating`
(nullable), `problemTags` (copied from CF at sync time), `verdict` (CF verdict, e.g. `OK`,
`WRONG_ANSWER`), `submittedAt`. Index `{userId: 1, submittedAt: -1}`.

### `topicstats`

`userId`, `topicKey` (`dp` or a pair key like `bitmasks+dp`), `kind` (`single` \| `pair`,
must match the key), `attempted`, `solved`, `failed` (default 0), `avgSolvedRating`,
`maxSolvedRating`, `comfortRating` (default `null`), `strength` (0..1, default 0),
`lastActivityAt`. Unique `{userId, topicKey}`.

### `stuckqueries`

`userId`, `inputType` (`text|url|pdf|image`), `rawInput` (truncated to 20,000 chars),
`matchedProblemId` (nullable), `detectedTags`, `tagsSource` (`db|ai|neighbors`, unset until
known), `estimatedRating` (nullable), `gap` (`[{ topicKey, strength, status }]`, status
`untouched|weak|ok|strong`), `result` (free-form), `source` (`ai|cache|fallback`),
`createdAt` (no `updatedAt`). Index `{userId: 1, createdAt: -1}`.

### `llmcaches` (internal, never returned directly)

`key` (unique: problem id or sha256 of the statement), `provider`, `model`, `response`
(free-form), `createdAt`. TTL index: entries expire 30 days after `createdAt`.

### `practiceitems`

`userId`, `problemId`, `status` (`todo|solved|skipped`, default `todo`), `addedFrom`
(`recommendation|similar|stuck|manual`, default `manual`), timestamps. Unique `{userId, problemId}`.

Unique-index violations on any collection → `409 DUPLICATE_RESOURCE` with
`details.fields` (field names only). Feature endpoints may map them to a specific code
(e.g. `PRACTICE_ITEM_EXISTS`).
