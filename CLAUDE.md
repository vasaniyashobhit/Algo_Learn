# CP Coach — Root Instructions

A personal competitive-programming coach built on Codeforces data. It finds similar
problems, tracks each user's strength per topic and per topic pair, helps when the
user is stuck (practice/upsolving only), and recommends the next topic and problems.

**Product source of truth:** `docs/PROJECT_BRIEF.md`. Read it at the start of every session.
**Progress log:** `docs/PROGRESS.md`. Read it first, update it last, every session.
**API contract:** `docs/API.md`. Backend sessions keep it current; frontend sessions follow it.
**Deployment:** `docs/DEPLOY.md` (Render, Vercel, Atlas, external cron).

## Stack override (this file wins over the brief)

The brief was written for Python + PostgreSQL. This project is **MERN**. Map as follows:

| Brief says | Use instead |
|---|---|
| FastAPI | Express 5 (Node.js 22+, ESM) |
| PostgreSQL + pgvector | MongoDB Atlas + Mongoose 8 |
| SQL Jaccard on `TEXT[]` | Aggregation pipeline (`$setIntersection` / `$setUnion`) |
| Text search fallback | MongoDB text index (`$text`) on title + description |
| APScheduler | `node-cron` + a protected HTTP trigger for hosted cron |
| `google-genai` (Python) | `@google/genai` (npm) |
| pypdf / BeautifulSoup | `unpdf` / `cheerio` |
| pandas / DuckDB loading | `hyparquet` (pure JS Parquet reader) |
| Streamlit or React | React (Vite) designed with the Impeccable skill |
| SQL tables | Mongo collections (see `backend/CLAUDE.md`) |

Do **not** create Spring Boot, Python or PostgreSQL code.

## Repository layout

```
/                    npm workspaces root (package.json, eslint config, CLAUDE.md)
├─ docs/             PROJECT_BRIEF.md, PROGRESS.md, API.md
├─ backend/          Express API  → see backend/CLAUDE.md
├─ frontend/         React app    → see frontend/CLAUDE.md (+ PRODUCT.md, DESIGN.md from Impeccable)
└─ e2e/              Playwright specs + test backend (fakes, behind E2E=1); see README.md
```

## Hard rules (apply everywhere, no exceptions)

1. **Max 100 lines per file**, including tests, configs and components. ESLint enforces
   `max-lines: 100`. If a file grows, split it (helpers, sub-components, hooks, test files
   per behavior). Never compress code onto fewer lines to pass the limit.
2. **Modern JavaScript only (ES2022+), ES modules.** `import`/`export`, `const`/`let`,
   arrow functions, destructuring, spread, optional chaining `?.`, nullish `??`,
   template literals, `Array.prototype.at`, `Object.groupBy`/`structuredClone` where useful,
   top-level `await` in scripts.
   **Forbidden:** `var`, `require`, `module.exports`, callbacks for async work,
   `.then()` chains, `function` hoisting tricks, prototype manipulation, jQuery-style code.
3. **async/await everywhere with try/catch.** Every caught error is either forwarded to the
   Express error middleware with `next(err)` or re-thrown as a typed `AppError`. Never
   swallow an error silently. (Only exceptions: the LLM fallback chain and background jobs,
   documented in `backend/CLAUDE.md`.)
4. **Modular by feature.** Small single-purpose modules, dependency injection for external
   clients (Codeforces, Gemini, HTTP) so they can be mocked.
5. **Tests for everything.** Every source file gets a matching test file. Vitest on both
   sides. A session is not done until `npm run lint` and `npm test` pass.
6. **No secrets in git.** Use `.env` (git-ignored) and keep `.env.example` updated.
7. **Never blank.** Every user-facing result screen must show something useful, even when
   Gemini or Codeforces fail (fallback data plus a clear notice).
8. **Positioning:** practice and upsolving only. UI copy must never encourage use during
   live rated contests or assessments.

## Shared contracts

- Success response: `{ "success": true, "data": ..., "meta": { ... } }` (`meta` is optional).
- Error response: `{ "success": false, "error": { "code", "message", "details", "requestId" } }`.
- Error codes live in `backend/src/errors/codes.js`, and user-facing messages for every code
  live in `frontend/src/errors/messages/`. **When you add a code on one side, add it on the
  other in the same session**, and list it in `docs/API.md`.
- API base path: `/api/v1`. Dev ports: backend `4000`, frontend `5173` (Vite proxies `/api`).

## Domain constants

- 37 Codeforces tags exist; `*special` is **not** a topic. That leaves 36 topic tags and
  630 sorted pairs. Pair key format: alphabetical, joined by `+`, e.g. `bitmasks+dp`.
- The tag list lives in `backend/src/config/tags.js` (single source; the frontend gets it from
  `GET /api/v1/meta/tags`).
- Problem id format: `"<contestId>/<index>"`, e.g. `"1/A"`.

## Session workflow

1. Read `docs/PROGRESS.md`, this file, the relevant sub-folder `CLAUDE.md`, and the brief.
2. Do **only** the scope of the current session prompt. If something blocks you, write it
   in PROGRESS.md under "Blockers" instead of improvising a different architecture.
3. Run `npm run lint` and `npm test` from the root. Fix everything until green.
4. Update `docs/PROGRESS.md` (done, decisions, next) and `docs/API.md` if endpoints changed.
5. Commit with Conventional Commits (`feat(backend): ...`, `test(frontend): ...`).
6. End with a short list of anything the **human** must do next (keys, accounts, checks).

## Commands (root)

- `npm run dev` — backend and frontend together (concurrently)
- `npm test` — all workspace tests
- `npm run lint` — ESLint on all workspaces
- `npm run build` — frontend production build
- `npm run e2e` — Playwright end-to-end tests (`npx -w e2e playwright install chromium` once)
