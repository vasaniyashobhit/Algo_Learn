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

All `/api` routes: 300 requests per 15 minutes per IP (default). Responses include the
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

### Unknown routes

Any unmatched method or path → `404 ROUTE_NOT_FOUND`, e.g. `"Route GET /api/v1/nope not found"`.

## Error codes

Source: `backend/src/errors/codes.js`. Every code needs a frontend message in
`frontend/src/errors/messages/`.

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Invalid body/query/params, malformed JSON, Mongoose validation/cast errors. `details: [{ field, message }]` |
| `AUTH_REQUIRED` | 401 | Protected route called without a token |
| `AUTH_INVALID_TOKEN` | 401 | Token malformed, badly signed or not yet valid |
| `AUTH_TOKEN_EXPIRED` | 401 | Token expired |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `AUTH_EMAIL_TAKEN` | 409 | Registration with an existing email |
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

Statuses for codes not yet emitted by any endpoint (auth, CF, upload, stuck, practice) are
the intended ones; the sessions that implement those features confirm them here.

## Data model (MongoDB)

Source: `backend/src/modules/*/*.model.js`. Shared options in `backend/src/db/schema.js`.
Every document's JSON form drops `__v` and `passwordHash` and keeps `_id` (ObjectId → hex
string, except `problems`, whose `_id` is the problem id). `createdAt`/`updatedAt` are ISO
dates. Enum lists live in `backend/src/config/constants.js`.

### `problems`

| Field | Type | Notes |
|---|---|---|
| `_id` | string | `"<contestId>/<index>"`, e.g. `"1/A"`, `"1950/F2"` |
| `contestId` | number | required |
| `index` | string | required |
| `title` | string | required |
| `description`, `inputFormat`, `outputFormat`, `note`, `editorial` | string | default `""`; CF LaTeX `$$$...$$$` kept as is |
| `rating` | number \| null | 0–4000, `null` when unrated |
| `tags` | string[] | each one of the 37 CF tags (incl. `*special`) |
| `tagCount` | number | derived: `tags.length` |
| `hasEditorial` | boolean | derived: editorial is non-blank |
| `source` | `hf` \| `cf_api` | default `hf` |

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
