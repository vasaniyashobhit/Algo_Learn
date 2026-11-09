# AlgoLearn — Root Instructions (Spring Boot edition)

The product name is **AlgoLearn** (fixed). "CP Coach" was the working name; internal names may keep it.

AlgoLearn is a competitive-programming coach built on Codeforces data: similar-problem search,
per-topic strength from the user's Codeforces submissions, "I'm stuck" help (hints first), and
recommendations of the next topics and problems.

## What this repository is doing right now

This repo is a **backend migration** of a finished MERN project:

- The old Express + MongoDB backend lives in `legacy/backend-node/` as a **read-only reference**.
- The new backend is **Spring Boot + PostgreSQL** in `backend/`.
- **Goal: identical functionality.** Same endpoints, same request/response JSON, same status codes,
  same 27 error codes, same limits, same algorithms and constants. Users must not notice the change.
- `frontend/` must keep working **without code changes**. Only dev tooling around it may change
  (root scripts, Docker, CI). If the frontend seems to need a change, the backend is wrong.

## Sources of truth (read at the start of every session)

1. `docs/API.md` — the **frozen API contract**. Do not change it, except to fix a mistake proven by
   the legacy code (record that under "Parity notes" in PROGRESS.md).
2. `legacy/backend-node/src` and `legacy/backend-node/tests` — the behaviour to reproduce. Port
   test cases, not just code: every legacy test case should have an equivalent Java test.
3. `docs/PROGRESS.md` — read first, update last, every session (section "Spring migration").
4. `docs/PROJECT_BRIEF.md`, `PRODUCT.md`, `frontend/DESIGN.md` — product context (unchanged).

If legacy behaviour looks like a bug, **keep the behaviour** and add a line under "Parity notes"
in PROGRESS.md. Never silently "improve" behaviour during the migration.

## Stack

| Part | Technology |
|---|---|
| Frontend | React 19 + Vite (unchanged, see `frontend/CLAUDE.md`) |
| Backend | Java 21, Spring Boot (current stable), Maven wrapper |
| Database | PostgreSQL 16 in Docker (image `pgvector/pgvector:pg16` so embeddings can be added later) |
| Migrations | Flyway |
| Containers | Docker Compose: `postgres`, `backend`, `frontend` |
| Tests | JUnit 5, Mockito, AssertJ, Testcontainers, WireMock; frontend Vitest; Playwright E2E |

Do **not** create MongoDB, Mongoose, Express or Python code in `backend/`.

## Repository layout

```
/                  root package.json (frontend + e2e workspaces, dev/test/lint scripts), CLAUDE.md
├─ docs/           PROJECT_BRIEF.md, PROGRESS.md, API.md (frozen), DEPLOY.md
├─ backend/        Spring Boot app → see backend/CLAUDE.md
├─ frontend/       React app → see frontend/CLAUDE.md (unchanged)
├─ e2e/            Playwright tests (unchanged tests; server setup adapted)
├─ legacy/         backend-node/ (reference only; removed in the last session)
└─ docker-compose.yml
```

## Hard rules (everywhere)

1. **Max 100 lines per file**, including tests and config. Enforced by Checkstyle (`FileLength`,
   max 100) for Java and ESLint `max-lines` for JS. Split files; never cram code onto fewer lines.
2. **Modern Java 21:** records for DTOs, `var` where it helps, switch expressions, text blocks,
   `Optional` for absent values, constructor injection only (no field `@Autowired`), no raw types,
   no `System.out`, no checked-exception swallowing. Frontend stays modern ES2022+ JavaScript.
3. **One error path:** code throws typed exceptions; all of them end in ONE global handler
   (`@RestControllerAdvice` plus the security entry point) that writes the standard error JSON.
   No controller builds an error response itself. Never swallow an exception silently.
4. **Modular by feature** with small single-purpose classes; external clients behind interfaces so
   tests inject fakes.
5. **Tests for everything.** Every main class has a test. A session is done only when root
   `npm test` and `npm run lint` pass.
6. **No secrets in git.** `backend/.env` is git-ignored; keep `backend/.env.example` current.
7. **Never blank:** every result screen must still get useful data when Gemini or Codeforces fail.
8. **Positioning:** practice and upsolving only.

## Shared contracts (unchanged from the MERN version)

- Success: `{ "success": true, "data": ..., "meta": { ... } }` (`meta` optional).
- Error: `{ "success": false, "error": { "code", "message", "details", "requestId" } }`.
- Base path `/api/v1`. Dev ports: backend **4000**, frontend 5173 (Vite proxies `/api`).
- JSON field names are camelCase exactly as in `docs/API.md`; dates are ISO-8601 UTC strings.
- Error codes: `backend/src/main/java/.../common/error/ErrorCode.java` must list exactly the codes in
  `docs/API.md`; the frontend copy in `frontend/src/errors/codes.js` must not change.

## Domain constants

37 Codeforces tags; `*special` is not a topic (36 topic tags, 630 sorted pairs, key `a+b`).
Problem id `"<contestId>/<index>"`, index pattern `[A-Z0-9]{1,3}` (ids like `1723/GP1`, `921/01` exist).

## Session workflow

1. Read PROGRESS.md, this file, `backend/CLAUDE.md`, `docs/API.md`, and the legacy module(s) you port.
2. Do only the current session's scope. Blockers go to PROGRESS.md, not into a different design.
3. Run root `npm run lint` and `npm test`; fix until green.
4. Update PROGRESS.md (Done, Decisions, Parity notes, Blockers, Next). Conventional Commits.
5. `git push origin main` (remote is the NEW repository). Never add or push to any other remote.
6. End with a short list of what the human must do next.

## Root commands (after Session 1)

- `npm run dev` — starts Postgres (Docker), the Spring Boot backend and the Vite frontend
- `npm test` — backend `mvnw verify` (tests, coverage, Checkstyle) + frontend tests
- `npm run lint` — Checkstyle + ESLint
- `npm run db:up` / `npm run db:down` — Postgres container only
