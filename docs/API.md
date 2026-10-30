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

`POST /users/me/sync` (and the sync inside `POST /practice/:contestId/:index/verify`) also has a
**per-user cooldown of 20 s** after `lastSyncedAt`: `429 RATE_LIMITED` with
`details.retryAfterSeconds` (1–20). The background sync job ignores the cooldown.

`POST /stuck` is limited to **10 per hour per user** (`retryAfterSeconds` 3600), in addition to the
IP limit.

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
{
  "success": true,
  "data": {
    "newSubmissions": 42, "totalSubmissions": 1310, "lastSyncedAt": "2026-10-29T14:00:00.000Z",
    "pending": [{ "problemId": "1950/F2", "cfSubmissionId": 251234567 }]
  }
}
```

`pending` lists submissions Codeforces is still judging (not stored yet; a later sync stores them).

Errors: `400 CF_HANDLE_NOT_LINKED`, `409 SYNC_IN_PROGRESS` (another sync of this account holds
the 5-minute lock, e.g. the background job), `429 RATE_LIMITED` (synced less than 20 s ago;
`details.retryAfterSeconds`; checked after the lock, so a running sync answers 409 first), `503 CF_UNAVAILABLE` (try again later; the sync
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

**Never blank.** Attempts run in order; each later attempt only **fills the slots still free**
(problems already found are excluded, so nothing repeats) until `k` results are found. Results
of earlier attempts come first. `meta.strategy` is the first attempt that returned anything,
`meta.strategies` lists every attempt that contributed (in order):

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
    "strategy": "primary", "strategies": ["primary", "widened_window"],
    "ratingWindow": 300, "targetRating": 1500, "count": 10,
    "problem": { "id": "1/A", "title": "Theatre Square", "rating": 1000, "tags": ["math"] }
  }
}
```

`meta.ratingWindow` is the window of the attempt that was used (600 for `widened_window`,
200 for `rating_band`); each item's `similarity` was scored with its own attempt's window.
Because the last attempt has no filter, `data` has `k` items unless the database has fewer
other problems (and is only empty when it has none).
Errors: `404 PROBLEM_NOT_FOUND`, `400 VALIDATION_FAILED` (params, `k`, `ratingWindow`).

### Recommendations (protected)

#### `GET /api/v1/recommendations`

"What to learn next": up to **3 topics**, each with up to **5 problems**. Practice and upsolving
only. **Never blank:** a new account (no handle, no stats) still gets topics and problems.

**Topics.** Frequency = share of rated problems within **±300** of the user's rating (`cfRating`,
else 1200) that carry the tag (per-rating counts cached in memory for 1 hour).

- **Learning zone** (`basis: "learning_zone"`): single topics with `attempted ≥ 3` and
  `0.2 ≤ strength ≤ 0.75`, ordered by `priority = (1 − strength) · ln(1 + frequency)`
  (ties: lower strength, then name).
- **Frequent** (`basis: "frequent"`): fills the remaining slots (cold start = all 3) with the most
  common tags at the user's rating, skipping topics already picked and mastered ones
  (`attempted ≥ 3`, `strength > 0.75`). `priority` is `null` here.

**Problems per topic.** `targetRange = [base + 100, base + 300]`, each bound rounded to 100, with
`base` = the topic's `comfortRating`, else `cfRating`, else 1200. Problems with the tag in that
range, excluding: solved problems, **Div1/Div2 copies** of solved problems (same title,
case-insensitive, contest id within ±2), practice-list items, and problems already picked for an
earlier topic. Ranked by `similarityToFailed` = max topic-tag Jaccard to the user's **10 most
recent never-solved problems** (desc), then rating asc (unrated last), then id
(`pickedBy: "target_range"`). If fewer than 5 remain, the rest comes from the similar search
(`tags: [topic]`, centred on the range with window 100, fill-up strategies) in its own order
(`pickedBy: "similar_fallback"`).

```json
{
  "success": true,
  "data": {
    "topics": [{
      "topic": "dp", "basis": "learning_zone", "strength": 0.42, "attempted": 11, "solved": 4,
      "comfortRating": 1400, "frequency": 0.22, "priority": 0.1153,
      "reason": "You've solved 4 of 11 dp problems; dp shows up in 22% of problems at your level",
      "targetRange": { "min": 1500, "max": 1700 },
      "problems": [{ "<problem summary>": "...", "similarityToFailed": 0.6667, "pickedBy": "target_range" }]
    }]
  },
  "meta": { "userRating": 1450, "frequencyRating": 1450, "coldStart": false, "recentFailed": 10 }
}
```

`reason` for a topic with no attempts: `"New topic for you: dp shows up in 22% of problems at your
level"` ("rated around 1200" when the user has no rating). `meta.coldStart` is true when the user
has no topic stats; `meta.reason` is `NO_HANDLE` / `NOT_SYNCED` as in Topic stats.
Errors: `401 AUTH_*`.

### Practice list (protected)

All routes need `Authorization: Bearer <token>`. A problem id `"1950/F2"` is addressed as
`/practice/1950/F2` (`contestId` and `index` rules as in Problems; the index is upper-cased).
Every success returns the **full item** so the client can reconcile optimistic updates:

```json
{
  "id": "6720f0c2a1b2c3d4e5f60718", "problemId": "1950/F2", "status": "todo", "addedFrom": "recommendation",
  "createdAt": "2026-10-30T10:00:00.000Z", "updatedAt": "2026-10-30T10:00:00.000Z",
  "problem": { "<problem summary>": "..." }
}
```

`status`: `todo|solved|skipped`. `addedFrom`: `recommendation|similar|stuck|manual`. `problem` is
`null` if the problem no longer exists.

#### `GET /api/v1/practice?status=todo`

Newest first. `status` is optional. `meta: { total, status }` (`status: null` when not filtered).
Errors: `400 VALIDATION_FAILED` (`query.status`).

#### `POST /api/v1/practice`

```json
{ "problemId": "1950/f2", "addedFrom": "recommendation" }
```

Strict body; `addedFrom` defaults to `manual`. `201 Created` with the item.
Errors: `400 VALIDATION_FAILED`, `404 PROBLEM_NOT_FOUND`, `409 PRACTICE_ITEM_EXISTS`
(`details: { problemId }`).

#### `PATCH /api/v1/practice/:contestId/:index`

`{ "status": "solved" }` (strict). `200` with the updated item.
Errors: `400 VALIDATION_FAILED`, `404 NOT_FOUND` (not in the list).

#### `DELETE /api/v1/practice/:contestId/:index`

`200` with the deleted item. Errors: `400 VALIDATION_FAILED`, `404 NOT_FOUND` (not in the list,
e.g. a repeated delete; an optimistic client can treat it as done).

#### `POST /api/v1/practice/:contestId/:index/verify`

"I solved it". Runs a sync for the user (same lock and cooldown as `POST /users/me/sync`), then
looks for an `OK` on the problem or a Div1/Div2 copy (same title, contest ±2).

- Solved → the item's status becomes `solved` (created with `addedFrom: "recommendation"` if it
  was not in the list; an existing item keeps its `addedFrom`):
  `{ "verified": true, "item": <item> }`.
- Not solved → **200**, not an error: `{ "verified": false, "reason": "NOT_SOLVED_YET" }`, or
  `"STILL_JUDGING"` when the newest submission on that problem has no final verdict yet.
- Inside the 20 s cooldown the stored submissions are checked instead; a solve found there is
  verified, otherwise `429 RATE_LIMITED` (`details.retryAfterSeconds`) because fresh data could
  not be fetched.

Errors: `404 PROBLEM_NOT_FOUND` (checked before syncing), `400 CF_HANDLE_NOT_LINKED`,
`409 SYNC_IN_PROGRESS`, `429 RATE_LIMITED`, `503 CF_UNAVAILABLE`, `400 VALIDATION_FAILED` (params).

### Stuck helper (protected, practice and upsolving only)

The user is stuck on a problem they are **practising or upsolving** (never a live rated contest).
`POST /stuck` turns text, a link, a PDF or a screenshot into a coaching result that is **never
blank**: when every AI provider fails, the result still has the likely topics, the user's weak
areas, similar problems and the editorial (`source: "fallback"` plus `notice`).
UX: show `hints` and `gap` first; fetch `GET /stuck/:id/solution` only when the user asks.

#### `POST /api/v1/stuck`

`multipart/form-data` (needed for files) or JSON. **Rate limit: 10 per hour per user**
(`429 RATE_LIMITED`, `details.retryAfterSeconds` = the window, 3600), counted before the upload
is read; failed requests count too.

| Field | Required for | Notes |
|---|---|---|
| `inputType` | always | `text` \| `url` \| `pdf` \| `image` |
| `text` | `text` (or a `.txt` file) | ≥ 40 chars after trimming, ≤ 20,000 |
| `url` | `url` | ≤ 2,048 chars, full `http(s)://` link |
| `file` | `pdf`, `image` (optional `.txt` for `text`) | one file, ≤ 5 MB; `application/pdf`, `image/png`, `image/jpeg`, `image/webp`, `text/plain`. The first bytes must match the type |

How each input is read:

- **Codeforces link** (`codeforces.com`/`codeforces.ru`, `www.`/`m1-3.`; `/contest/{id}/problem/{idx}`,
  `/problemset/problem/{id}/{idx}`, `/gym/{id}/problem/{idx}`) → problem id, **no fetch**.
- **Other link** → fetched server-side, best effort (many sites block bots): only `http`/`https` on
  ports 80/443, no `user:pass@`, every address the host resolves to must be public (localhost,
  private, link-local incl. `169.254.169.254`, CGNAT, multicast, reserved → `URL_NOT_ALLOWED`),
  re-checked on each redirect (max 3). 8 s for the whole fetch, 2 MB max, HTML or plain text only;
  the main text is extracted (`.problem-statement`, `main`, `article`, … `body`).
- **PDF** → text layer (scanned PDFs have none → `INPUT_UNREADABLE`; upload a screenshot instead).
- **Image** → Gemini reads it, then tesseract OCR (English) if Gemini returns nothing.

Then: find the problem in our DB (by id, else an exact title / statement match among the 5
nearest `$text` results) → AI coach (cache → providers) → tags (`db` → `ai` →
`neighbors`: most common tags of the 5 nearest problems) → concept gap → similar problems
(rating window centred **150 below** the problem's rating, or the user's rating if unknown, when
there is a weak/unseen single topic; solved problems excluded) → saved.

**Timing:** one 50 s deadline per request is shared by every step: Gemini image reading ≤ 20 s, OCR
≤ 15 s, link fetch ≤ 8 s, then the coach gets the time left (skipped, `fallbackReason: AI_TIMEOUT`,
when under 10 s). The answer always arrives before 55 s; set the client timeout to about 60 s.

`201`:

```json
{
  "success": true,
  "data": {
    "id": "6720f0c2a1b2c3d4e5f60718",
    "inputType": "url",
    "createdAt": "2026-10-30T12:00:00.000Z",
    "source": "fallback",
    "provider": null,
    "model": null,
    "notice": "AI solution temporarily unavailable. Here are the likely topics, your weak areas, similar problems and editorials.",
    "fallbackReason": "AI_TIMEOUT",
    "problem": {
      "matchedProblemId": "1/A", "requestedProblemId": "1/A", "title": "Theatre Square",
      "tags": ["math"], "tagsSource": "db", "rating": 1000
    },
    "hints": ["This problem most likely uses math.", "Review math first. You have not practised math yet.", "From the editorial: ..."],
    "hasSolution": false,
    "editorialAvailable": true,
    "gap": {
      "message": "This problem needs math. You have not practised math yet.",
      "items": [{ "topicKey": "math", "kind": "single", "strength": null, "status": "unseen", "attempted": 0, "message": "You have not practised math yet." }],
      "topics": [{ "topicKey": "math", "kind": "single", "strength": null, "status": "unseen", "attempted": 0, "message": "..." }]
    },
    "similar": {
      "items": [{ "id": "4/A", "contestId": 4, "index": "A", "title": "Watermelon", "rating": 800, "tags": ["math"], "hasEditorial": true, "source": "hf", "similarity": { } }],
      "easier": true, "targetRating": 850, "strategies": ["primary"]
    }
  }
}
```

- `source`: `ai` \| `cache` (AI answer) \| `fallback`. `provider`/`model` name the model that wrote
  the answer (e.g. `gemini` / `gemini-3.5-flash-lite`, also for `cache`), `null` for `fallback`. `notice` and `fallbackReason` are `null` unless
  `fallback`. `fallbackReason`: `AI_BUSY` (every model's per-minute budget used up: "try again in a
  minute"), `AI_TIMEOUT` (the request deadline left no time for the AI), `AI_UNAVAILABLE`, `NO_INPUT` (no statement
  text, e.g. a gym link we do not have).
- `problem.matchedProblemId`: our DB id or `null`; `requestedProblemId`: the id parsed from a
  Codeforces link (even if we do not have it), else `null`. `title` is the stored title or the
  statement's first line (≤ 120 chars), `null` if unknown. `tagsSource` is `null` when no tags were
  found (`tags: []`); `rating` may be `null`.
- `hints`: 1–3 strings. AI hints, or (fallback / AI gave none) the likely topics, the weakest gap
  topic and the editorial's first paragraph; never empty.
- `hasSolution`: an AI solution exists for `GET /stuck/:id/solution`. `editorialAvailable`: the
  matched problem has an editorial.
- `gap.topics`: every topic key of the problem (single tags and sorted pairs) with `strength`
  (0–1, 2 decimals, `null` = no stats) and `status` `weak` (< 0.4) \| `developing` (0.4–0.7) \|
  `strong` (> 0.7) \| `unseen`. `gap.items` = the gap (`weak` + `unseen`), weakest first (weak
  before unseen, singles before pairs). Users without a handle/stats see everything `unseen`.
- `similar.items` use the problem summary shape of `/problems`; `easier` says the window was
  shifted down; `strategies` as in `/problems/:contestId/:index/similar` (show a "broader picks"
  notice when it contains anything but `primary`).

Errors: `400 VALIDATION_FAILED` (`body.inputType`, `body.text`, `body.url`, `file` missing, a
second file, unknown fields), `400 PROBLEM_TEXT_TOO_SHORT` (`details: { minLength: 40, length }`),
`400 URL_NOT_ALLOWED` (`details.reason`: `scheme` \| `credentials` \| `port` \| `private`),
`502/503 URL_FETCH_FAILED` (`details.reason`: `dns` \| `status` (+ `status`) \| `unsupported_type`
\| `no_text` \| `too_large` (+ `maxBytes`) \| `too_many_redirects` \| `network` \| `timeout` (503)),
`413 FILE_TOO_LARGE`, `415 FILE_TYPE_UNSUPPORTED` (type not allowed, bytes do not match the type,
wrong file for the input type, or a file field other than `file`), `422 INPUT_UNREADABLE`
(`details.inputType`: `pdf` \| `image`), `429 RATE_LIMITED`, `401 AUTH_*`.
AI failures are **never** errors (see `source: "fallback"`).

#### `GET /api/v1/stuck/history?page=1`

The user's queries, newest first, 20 per page. `meta: { page, limit, total, totalPages }`.
Items: `{ id, inputType, createdAt, source, problem: { matchedProblemId, requestedProblemId, title,
tags, tagsSource, rating }, gapTopics: ["bitmasks", "bitmasks+dp"] }`.
Errors: `400 VALIDATION_FAILED` (`page` < 1).

#### `GET /api/v1/stuck/:id`

The same object `POST /stuck` returned (never the solution or the raw input).

#### `GET /api/v1/stuck/:id/solution`

Shown only on request (hints first):

```json
{
  "success": true,
  "data": {
    "id": "6720f0c2a1b2c3d4e5f60718",
    "kind": "ai",
    "solution": { "approach": "...", "solutionSteps": ["..."], "complexity": "O(1)", "code": "...", "pitfalls": ["..."] },
    "editorial": "Full editorial text, or null",
    "notice": null,
    "similarWithEditorial": [{ "id": "4/A", "title": "Watermelon", "hasEditorial": true }]
  }
}
```

`kind`: `ai` (AI solution, plus the editorial when we have one) \| `editorial` (no AI solution) \|
`none` (neither: `notice` is the fallback notice; show `similarWithEditorial`, the similar problems
from the result that have editorials). `solution` fields may be `null` (e.g. `code`).

#### `DELETE /api/v1/stuck/:id`

`200 { "id": "...", "deleted": true }`.

`GET /:id`, `/:id/solution` and `DELETE /:id` answer `404 STUCK_QUERY_NOT_FOUND` for an unknown id,
a malformed id **and another user's id** (no difference is revealed).

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
| `NOT_FOUND` | 404 | Generic missing resource (e.g. a problem that is not in the user's practice list) |
| `PROBLEM_NOT_FOUND` | 404 | Problem id (e.g. `1/A`) does not exist |
| `CF_HANDLE_NOT_FOUND` | 404 | Codeforces handle does not exist |
| `CF_HANDLE_TAKEN` | 409 | Handle already linked to another account |
| `CF_HANDLE_NOT_LINKED` | 400 | Feature needs a linked Codeforces handle |
| `CF_UNAVAILABLE` | 502/503 | Codeforces API down, slow or erroring |
| `SYNC_IN_PROGRESS` | 409 | A sync for this user is already running |
| `RATE_LIMITED` | 429 | Too many requests (IP limit, auth limit, 10 stuck queries/hour/user), or a sync within 20 s of the last one. `details: { retryAfterSeconds }` |
| `FILE_TOO_LARGE` | 413 | Upload over 5 MB, or a JSON body over 1 MB |
| `FILE_TYPE_UNSUPPORTED` | 415 | Upload type not allowed (pdf/png/jpeg/webp/txt), bytes not matching the type, wrong file for `inputType`, or a field other than `file` |
| `URL_NOT_ALLOWED` | 400 | Stuck link refused by the SSRF guard. `details.reason`: `scheme`/`credentials`/`port`/`private` |
| `URL_FETCH_FAILED` | 502/503 | Fetching a stuck link failed. `details.reason`: `dns`/`status`/`unsupported_type`/`no_text`/`too_large`/`too_many_redirects`/`network`, or `timeout` (503) |
| `INPUT_UNREADABLE` | 422 | No text in the PDF, or neither Gemini nor OCR could read the image. `details: { inputType }` |
| `PROBLEM_TEXT_TOO_SHORT` | 400 | Pasted text under 40 characters. `details: { minLength, length }` |
| `PRACTICE_ITEM_EXISTS` | 409 | Problem already in the user's practice list |
| `STUCK_QUERY_NOT_FOUND` | 404 | Stuck query id unknown, malformed, or another user's |
| `DUPLICATE_RESOURCE` | 409 | Generic unique-index violation. `details: { fields: [...] }` (field names only) |
| `DB_UNAVAILABLE` | 503 | Could not connect to or close MongoDB (startup/shutdown; not yet sent by any endpoint) |
| `INTERNAL_ERROR` | 500 | Anything unexpected. Message is always generic |

Auth codes are confirmed (Session 4). CF and sync codes (`CF_HANDLE_*`, `CF_UNAVAILABLE`,
`SYNC_IN_PROGRESS`) and `FORBIDDEN` are confirmed (Session 6). `PRACTICE_ITEM_EXISTS` (409) and the
sync use of `RATE_LIMITED` are confirmed (Session 8; no new codes). Upload and stuck codes
(`FILE_*`, `URL_*`, `INPUT_UNREADABLE`, `PROBLEM_TEXT_TOO_SHORT`, `STUCK_QUERY_NOT_FOUND`) are
confirmed (Session 10; no new codes). Only `DB_UNAVAILABLE` is not sent by any endpoint. This table
is the complete list for the frontend's messages.

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
`matchedProblemId` (nullable), `detectedTags`, `tagsSource` (`db|ai|neighbors`, unset when no
tags were found), `estimatedRating` (nullable), `gap` (the gap items only:
`[{ topicKey, kind, strength (null when unseen), status }]`, status `unseen|weak|developing|strong`),
`result` (the public result returned by the API), `solution` (the AI solution, only served by
`/stuck/:id/solution`; `null` without one), `source` (`ai|cache|fallback`), `createdAt` (no
`updatedAt`). Index `{userId: 1, createdAt: -1}`.

### `llmcaches` (internal, never returned directly)

`key` (unique: problem id or sha256 of the statement), `provider`, `model`, `response`
(free-form), `createdAt`. TTL index: entries expire 30 days after `createdAt`.

### `practiceitems`

`userId`, `problemId`, `status` (`todo|solved|skipped`, default `todo`), `addedFrom`
(`recommendation|similar|stuck|manual`, default `manual`), timestamps. Unique `{userId, problemId}`.
`POST /practice` maps its duplicate key to `409 PRACTICE_ITEM_EXISTS`.

Unique-index violations on any collection → `409 DUPLICATE_RESOURCE` with
`details.fields` (field names only). Feature endpoints may map them to a specific code
(e.g. `PRACTICE_ITEM_EXISTS`).
