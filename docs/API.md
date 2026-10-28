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
| `INTERNAL_ERROR` | 500 | Anything unexpected. Message is always generic |

Statuses for codes not yet emitted by any endpoint (auth, CF, upload, stuck, practice) are
the intended ones; the sessions that implement those features confirm them here.
