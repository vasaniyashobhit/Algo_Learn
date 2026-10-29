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

All `/api` routes: 300 requests per 15 minutes per IP (default). `POST /api/v1/auth/signup`
and `POST /api/v1/auth/login` also share a stricter 20 per 15 minutes per IP (see Authentication). Responses include the
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

`POST /auth/signup` and `POST /auth/login` share a stricter limit: **20 requests per 15 minutes
per IP**, counted together (on top of the global 300). Exceeding it → `429 RATE_LIMITED`,
`details: { "retryAfterSeconds": 900 }`. `GET /auth/me` is **not** under the strict limit (the
frontend calls it on every page load); only the global limit applies to it.

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
Errors: `401 AUTH_REQUIRED` / `AUTH_INVALID_TOKEN` / `AUTH_TOKEN_EXPIRED`, `429 RATE_LIMITED`
(global limit only).

### `GET /api/v1/users/me`

Protected. Same response as `GET /auth/me` (also only under the global rate limit).
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

### Codeforces handle and sync (protected)

All three routes need `Authorization: Bearer <token>` (401 `AUTH_*` otherwise, checked before
the body). Codeforces is called through one shared client (≥ 2.1 s between calls, retries on
timeouts/5xx), so these requests can take a few seconds.

#### `PUT /api/v1/users/me/handle`

```json
{ "handle": "tourist" }
```

- `handle`: trimmed, 3–24 characters, letters, digits, `_`, `-`, `.` (strict body: no other fields).
- Checked with Codeforces `user.info`. The handle is stored with **Codeforces' exact casing**
  (`"TOURIST"` → `"tourist"`), together with `cfRating` / `cfMaxRating`.
- Linking a **different** handle than the current one deletes the user's submissions and topic
  stats and resets the sync state (`lastSyncedAt: null`). Re-linking the same handle keeps them.

`200 OK`: `{ "success": true, "data": <user> }` (with `cfHandle`, `cfRating`, `cfMaxRating` set).

Errors: `400 VALIDATION_FAILED` (`body.handle`), `404 CF_HANDLE_NOT_FOUND`,
`409 CF_HANDLE_TAKEN` (linked to another account; compared case-insensitively),
`409 SYNC_IN_PROGRESS` (a sync of this account is running), `503 CF_UNAVAILABLE`
(`details: { status, retryable }` when known; `502` if Codeforces rejected the request).

#### `DELETE /api/v1/users/me/handle`

Unlinks the handle, clears `cfRating`/`cfMaxRating`/`lastSyncedAt`, and **deletes the user's
submissions and topic stats**. Succeeds (200, same user body) even when no handle is linked.
Errors: `409 SYNC_IN_PROGRESS`, `401 AUTH_*`.

#### `POST /api/v1/users/me/sync`

Pulls new Codeforces submissions (`user.status`, newest first, pages of 500) until it reaches
the last stored one; the first sync reads at most 20 pages (10,000 submissions). Only judged
submissions to problems with a `contestId` are stored (with the problem's tags and rating
from the payload). Submissions still being judged are picked up by a later sync. Then the
rating is refreshed and the user's topic stats are fully recomputed (see Topic stats below),
inside the same lock; a recompute failure fails the sync with `500 INTERNAL_ERROR`.

`200 OK`:

```json
{ "success": true, "data": { "newSubmissions": 42, "totalSubmissions": 1310, "lastSyncedAt": "2026-10-29T14:00:00.000Z" } }
```

Errors: `400 CF_HANDLE_NOT_LINKED`, `409 SYNC_IN_PROGRESS` (another sync of this account holds
the 5-minute lock, e.g. the background job), `503 CF_UNAVAILABLE` (try again later; the sync
resumes where it stopped), `404 CF_HANDLE_NOT_FOUND` (the handle was renamed on Codeforces:
link it again).

### Topic stats (protected)

Both routes need `Authorization: Bearer <token>`. Stats are rebuilt from **all** stored
submissions after every sync. **Never an error for missing data:** without a linked handle the
answer is `200` with empty data and `meta.reason: "NO_HANDLE"`; a linked handle that was never
synced adds `meta.reason: "NOT_SYNCED"`. `reason` is absent otherwise.

How a topic's numbers are computed (constants in `backend/src/config/statsConstants.js`):

- Submissions are grouped per problem: `solved` = any `OK` verdict; time = last submission.
- A problem counts toward each topic tag (`*special` excluded) and each sorted pair of them.
  Pairs are stored only when attempted on **≥ 2 problems**.
- `d = 0.5^(ageDays / 90)`, `w = sigmoid((problemRating − userRating) / 300)` (0.5 if either is unknown).
  Solved: `solvedScore += d·(0.5 + w)`; unsolved: `failScore += d·(1.5 − w)`.
- `strength = (solvedScore + 1.5) / (solvedScore + failScore + 3)` (prior of 3 attempts at 0.5):
  0.5 with no data, 0.625 for one fresh solve at your rating, never 1.0 from a single solve.
- `comfortRating`: median of the top 5 solved ratings in the last 365 days when there are ≥ 3;
  otherwise `min(userRating, max solved)`, or whichever is known, or `null`.

A **topic stat**:

```json
{
  "topicKey": "bitmasks+dp", "kind": "pair", "tags": ["bitmasks", "dp"],
  "attempted": 7, "solved": 5, "failed": 2, "strength": 0.6412,
  "comfortRating": 1700, "avgSolvedRating": 1620, "maxSolvedRating": 1900,
  "lastActivityAt": "2026-10-20T18:03:11.000Z"
}
```

#### `GET /api/v1/users/me/stats?kind=single&sort=strength&limit=50`

- `kind`: `single` (default) | `pair`. `sort`: `strength` (default; ties: more attempted, then key)
  | `attempted` (ties: higher strength, then key). Both descending. `limit`: 1–630, default 50.

```json
{
  "success": true,
  "data": [<topic stat>, ...],
  "meta": { "kind": "single", "sort": "strength", "limit": 50, "total": 23, "lastSyncedAt": "2026-10-29T14:00:00.000Z" }
}
```

No handle: `{ "success": true, "data": [], "meta": { ..., "total": 0, "lastSyncedAt": null, "reason": "NO_HANDLE" } }`.
Errors: `400 VALIDATION_FAILED` (`query.kind`, `query.sort`, `query.limit`), `401 AUTH_*`.

#### `GET /api/v1/users/me/stats/summary`

Always the same shape (zeros, empty lists and zero-filled bands/days when there is no data):

```json
{
  "success": true,
  "data": {
    "totals": { "submissions": 1310, "problemsAttempted": 640, "problemsSolved": 590, "topicsAttempted": 31, "pairsTracked": 212 },
    "strongest": [<topic stat>, ...],
    "weakest": [<topic stat>, ...],
    "solvedByRating": { "bands": [{ "from": 800, "to": 999, "solved": 41 }, ...], "unrated": 3 },
    "activity": [{ "date": "2026-09-30", "submissions": 4, "accepted": 2 }, ...]
  },
  "meta": { "cfHandle": "tourist", "cfRating": 3382, "lastSyncedAt": "2026-10-29T14:00:00.000Z" }
}
```

- `strongest`: top 5 single topics by strength. `weakest`: bottom 5 single topics with
  **≥ 3 attempted problems** (one unlucky try is not "weak").
- `solvedByRating`: solved problems in 200-wide bands from 800 to 3400–3599 (all 14 bands always
  listed; out-of-range ratings go to the first/last band), plus `unrated`.
- `activity`: the last 30 **UTC** days, oldest first, ending today (`accepted` = verdict `OK`).
- No handle: same shape with zeros and `meta: { "cfHandle": null, "cfRating": null, "lastSyncedAt": null, "reason": "NO_HANDLE" }`.

Errors: `401 AUTH_*` (a deleted account → `AUTH_INVALID_TOKEN`).

### Internal (hosted cron)

#### `POST /api/v1/internal/sync-all`

For free hosts where the in-process cron sleeps: an external scheduler calls this with the header
`x-cron-secret: <CRON_SECRET>`. Answers **`202 Accepted`** at once and syncs every user with a
linked handle in the background (sequentially; a failing user is logged and skipped; a second
trigger while a run is in progress is ignored).

```json
{ "success": true, "data": { "started": true, "job": "syncAllUsers" } }
```

Errors: `403 FORBIDDEN` when the header is missing or wrong (or no `CRON_SECRET` is configured).

In-process schedule (`node-cron`, off when `NODE_ENV=test`): user sync on `SYNC_CRON`
(default every 6 hours) and a problemset refresh every **Sunday at 03:00** server time.

### Problems (public)

No auth needed. Route params: `contestId` is a positive integer without leading zeros
(`CONTEST_ID_PATTERN`), `index` is 1–3 characters `A-Z`/`0-9` (`PROBLEM_INDEX_PATTERN`, e.g.
`A`, `B1`, `F2`, `GP1`, `01`); a lowercase index is upper-cased. Bad params →
`400 VALIDATION_FAILED` with `params.contestId` / `params.index`.

A **problem summary** (lists and similar results, never any statement or editorial text):

```json
{
  "id": "1/A", "contestId": 1, "index": "A", "title": "Theatre Square",
  "rating": 1000, "tags": ["math"], "hasEditorial": true, "source": "hf"
}
```

`rating` is `null` when unrated. `source: "cf_api"` rows (about 1,721, added by the problemset
sync) have tags and a rating but **no statement**; they are always included.

#### `GET /api/v1/problems`

Query (all optional):

| Param | Rules |
|---|---|
| `tags` | any of the 37 tags (incl. `*special`); comma list `tags=dp,greedy` and/or repeated `tags=dp&tags=greedy`; max 10; duplicates removed |
| `matchAll` | `true`/`false` (default `false`: match **any** tag; `true`: must have **all**) |
| `minRating`, `maxRating` | integers 0–4000, `minRating ≤ maxRating`; unrated problems drop out when either is set |
| `q` | 1–100 chars, text search on title (weight 3) and description |
| `page` | integer ≥ 1, default 1 |
| `limit` | integer 1–50, default 20 |

An empty value (`?limit=`) counts as not given. Order: newest contest first, then index; with
`q`, text relevance first.

```json
{
  "success": true,
  "data": [<problem summary>, "..."],
  "meta": { "page": 1, "limit": 20, "total": 11702, "totalPages": 586 }
}
```

A page past the end returns `data: []` with the real `total`.

#### `GET /api/v1/problems/:contestId/:index`

The full problem: summary fields plus `description`, `inputFormat`, `outputFormat`, `note`,
`editorial` (each `""` when missing) and `hasStatement` (`false` when the description is blank,
e.g. every `cf_api` row). Errors: `404 PROBLEM_NOT_FOUND`.

#### `GET /api/v1/problems/:contestId/:index/similar?k=10&ratingWindow=300`

`k` 1–30 (default 10), `ratingWindow` 50–1000 (default 300). Excludes the problem itself and
any problem with the exact same title (div1/div2 duplicates).

Score = `0.75 · jaccard + 0.25 · ratingCloseness` (constants in `SIMILARITY`,
`config/constants.js`). Jaccard is over topic tags (`*special` ignored, 0 if both sides are
empty). `ratingCloseness = max(0, 1 − |Δrating| / window)`, 0 when a rating is missing.
Order: score desc, closeness desc, rating distance asc (unrated last), then id.

**Never blank.** Attempts run in order until one returns anything; `meta.strategy` names it:

| `strategy` | When / what |
|---|---|
| `primary` | Tags `$in` the problem's topic tags, and rating within ±window when the problem is rated |
| `widened_window` | Same, window × 2 |
| `no_rating_filter` | Tags only (still ranked by closeness) |
| `rating_band` | Untagged (or only `*special`) and rated: any problem within ±200 |
| `near_user_rating` | Anything, ranked by closeness to the user rating, else the problem rating, else 1200 |

```json
{
  "success": true,
  "data": [{ "<problem summary>": "...", "similarity": { "score": 0.917, "jaccard": 1, "ratingCloseness": 0.667 } }],
  "meta": {
    "strategy": "primary", "ratingWindow": 300, "targetRating": 1500, "count": 10,
    "problem": { "id": "1/A", "title": "Theatre Square", "rating": 1000, "tags": ["math"] }
  }
}
```

`meta.ratingWindow` is the window of the attempt that was used (600 for `widened_window`,
200 for `rating_band`). `data` is only empty when the database has no other problem.
Errors: `404 PROBLEM_NOT_FOUND`, `400 VALIDATION_FAILED` (params, `k`, `ratingWindow`).

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

Auth codes are confirmed (Session 4). CF and sync codes (`CF_HANDLE_*`, `CF_UNAVAILABLE`,
`SYNC_IN_PROGRESS`) and `FORBIDDEN` are confirmed (Session 6). Statuses for codes not yet emitted
by any endpoint (upload, stuck, practice) are the intended ones; the sessions that implement
those features confirm them here.

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
`npm run sync:problemset` / the weekly job (cf_api: inserts new problems, and updates only
`rating`, `tags`, `tagCount` of existing **cf_api** rows when Codeforces changed them; hf rows
and text fields are never touched).

Indexes: `tags`, `rating`, `{tags, rating}`, text index `problem_text` (title weight 3, description 1).

### `users`

`email` (unique, lowercased), `passwordHash` (never returned; `select: false`), `name`
(default `""`), `cfHandle` (unset until linked; unique **case-insensitively**, only when it
is a string), `cfRating`, `cfMaxRating`, `lastSyncedAt`, `lastSubmissionId`,
`syncLockedUntil` (all default `null`).

### `submissions`

`cfSubmissionId` (unique), `userId`, `problemId`, `contestId`, `index`, `problemRating`
(nullable), `problemTags` (copied from CF at sync time), `verdict` (CF verdict, e.g. `OK`,
`WRONG_ANSWER`), `submittedAt`. Index `{userId: 1, submittedAt: -1}`. Written by the sync
(`insertMany`, unordered, duplicates ignored); deleted when the handle is unlinked or changed.

### `topicstats`

`userId`, `topicKey` (`dp` or a pair key like `bitmasks+dp`), `kind` (`single` \| `pair`,
must match the key), `attempted`, `solved`, `failed` (default 0), `avgSolvedRating`,
`maxSolvedRating`, `comfortRating` (default `null`), `strength` (0..1, default 0),
`lastActivityAt`. Unique `{userId, topicKey}`. Rewritten after every sync by
`recomputeForUser` (one `bulkWrite`: delete this user's keys that are no longer present, then
upsert-replace every current key).

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
