# Backend — Spring Boot + PostgreSQL

Read the root `CLAUDE.md` first. This file adds backend rules. The behaviour to reproduce is in
`legacy/backend-node/` and `docs/API.md`.

## Stack

Java 21, Spring Boot (current stable) with: web, validation, data-jpa, security, actuator.
PostgreSQL driver, Flyway, jjwt (JWT), Bucket4j (rate limits), spring-dotenv (loads
`backend/.env` in dev), Apache PDFBox (PDF text), Tess4J (OCR), jsoup (HTML text),
DuckDB JDBC (reads the parquet dataset), Jackson. HTTP calls use Spring `RestClient`.
Lombok is allowed **only** on JPA entities; DTOs are records.
Tests: JUnit 5, AssertJ, Mockito, Spring Boot Test + MockMvc, Testcontainers (PostgreSQL),
WireMock, JaCoCo, Checkstyle. Maven wrapper (`mvnw`, `mvnw.cmd`) — never require a global Maven.

## Package structure (by feature) — base package `com.algolearn`

```
config/          AppProperties (typed @ConfigurationProperties), Jackson, CORS, clock, scheduling
common/error/    ErrorCode (enum), AppException + subclasses, GlobalExceptionHandler, ErrorResponse
common/web/      ApiResponse<T> (success envelope), RequestIdFilter, logging
security/        SecurityConfig, JwtService, JwtAuthFilter, JsonAuthEntryPoint, CurrentUser
ratelimit/       Bucket4j filters/interceptors (global, auth, stuck, sync cooldown helpers)
problems/        ProblemController, ProblemService, ProblemRepository, SimilarityQueries, dto/
auth/ users/ codeforces/ sync/ stats/ recommendations/ practice/ llm/ stuck/ jobs/ importer/
```

Each feature: `XController` → `XService` → `XRepository` (JPA) and/or `XQueries` (native SQL via
`NamedParameterJdbcTemplate`), with `dto/` records and pure helper classes for maths/parsing
(most unit tests target these helpers).

## Layering rules

- **Controller:** maps HTTP to a service call and wraps the result in `ApiResponse`. Validation
  with `@Valid` on request records and `@Validated` path/query params. No try/catch, no logic.
- **Service:** business logic, `@Transactional` where it writes. Throws `AppException` subclasses
  with an `ErrorCode`. Wrap external failures: `throw new ExternalServiceException(CF_UNAVAILABLE,
  msg, cause)`.
- **Entities never leave the service layer.** Map to response records that match `docs/API.md`
  exactly (field names, nesting, nulls vs missing). Check the legacy tests for exact shapes.
- External clients (Codeforces, Gemini, Groq, URL fetcher, OCR) are interfaces with one real
  implementation; tests inject fakes or point the real client at WireMock.

## Error handling (strict)

- `AppException(HttpStatus status, ErrorCode code, String message, Object details, Throwable cause)`
  with subclasses: Validation 400, Auth 401, Forbidden 403, NotFound 404, Conflict 409,
  Payload 413/415, RateLimit 429, ExternalService 502/503.
- `GlobalExceptionHandler` (`@RestControllerAdvice`) maps:
  `MethodArgumentNotValidException`, `ConstraintViolationException`, `HttpMessageNotReadableException`,
  type mismatches → `VALIDATION_FAILED` with `details: [{ field, message }]`;
  `DataIntegrityViolationException` unique violation → code by constraint name
  (e.g. `uk_users_email` → `AUTH_EMAIL_TAKEN`, `uk_users_cf_handle` → `CF_HANDLE_TAKEN`,
  `uk_practice_user_problem` → `PRACTICE_ITEM_EXISTS`, else `DUPLICATE_RESOURCE`);
  `MaxUploadSizeExceededException` → `FILE_TOO_LARGE`; `NoResourceFoundException` →
  `ROUTE_NOT_FOUND`; database connection failures → `DB_UNAVAILABLE` 503; anything else →
  `INTERNAL_ERROR` 500.
- Errors raised inside the Spring Security filter chain do not reach the advice: `JsonAuthEntryPoint`
  and the JWT filter must write the same JSON (`AUTH_REQUIRED`, `AUTH_INVALID_TOKEN`,
  `AUTH_TOKEN_EXPIRED`) through one shared `ErrorResponseWriter`.
- Every error response includes the `requestId` (from `RequestIdFilter`, header `X-Request-Id`).
  No stack traces or internal messages when the `prod` profile is active; always log the full error.
- Allowed catch-and-continue (documented, logged at `warn`): the LLM fallback chain, and background
  jobs (one user failing must not stop the job).

## Database (Flyway, `src/main/resources/db/migration`)

Tables (snake_case columns; names may follow the legacy collections):
`problems` (id text PK "1/A", contest_id, idx, title, description, input_format, output_format,
note, editorial, rating int null, tags text[], tag_count, has_editorial, source, search tsvector
generated from title weight A + description weight B), `users` (uuid id, email unique, password_hash,
name, cf_handle unique case-insensitive via `lower(cf_handle)` index, cf_rating, cf_max_rating,
last_synced_at, last_submission_id, sync_locked_until, timestamps), `submissions`
(cf_submission_id unique), `topic_stats` (unique user_id+topic_key, last_results jsonb),
`stuck_queries` (gap jsonb, result jsonb), `llm_cache` (key unique, response jsonb, created_at;
a daily `@Scheduled` job deletes rows older than 30 days), `practice_items`
(unique user_id+problem_id). Indexes: GIN on `problems.tags`, GIN on `problems.search`,
btree on rating and (tags, rating) where useful, (user_id, submitted_at desc), (user_id, created_at desc).
Use `text[]` and `jsonb` via Hibernate `@JdbcTypeCode`. Always use bind parameters, never string-built SQL.
The sync lock is one atomic `UPDATE ... WHERE sync_locked_until IS NULL OR sync_locked_until < now()`.

## Configuration

`application.yml` reads environment variables; `backend/.env` is loaded in dev. Variables:
`SPRING_PROFILES_ACTIVE, PORT=4000, DATABASE_URL, DATABASE_USERNAME, DATABASE_PASSWORD,
JWT_SECRET, JWT_EXPIRES_IN=7d, CLIENT_URL, GEMINI_API_KEY, GEMINI_MODELS, GROQ_API_KEY,
GROQ_MODEL, CRON_SECRET, SYNC_CRON, LOG_LEVEL`. Fail fast at startup with a clear message listing
missing or invalid variables (as the legacy env check did). Never log secrets or the DB password.
Enable virtual threads. Time-based logic uses an injected `Clock` so tests can control time.

## Testing rules

- Every main class has a test. Pure helpers: plain JUnit. Controllers: `@WebMvcTest` with mocked
  services, checking JSON shape and error codes. Repositories/queries: Testcontainers PostgreSQL
  with Flyway applied (one shared container for the whole run). Full flows: `@SpringBootTest` +
  MockMvc + Testcontainers. HTTP clients: WireMock. Never call real Codeforces, Gemini or Groq.
- Port every legacy test case (same inputs, same expected outputs, same error codes).
- Each endpoint: success, validation failure, auth failure (if protected), error JSON shape.
- JaCoCo thresholds: lines 80%, branches 75%. Checkstyle `FileLength` 100 applies to tests too.
- Docker must be running for tests (Testcontainers). If it is not, say so instead of skipping tests.

## Commands (from `backend/`; root npm scripts wrap them)

`mvnw verify` (tests + coverage + Checkstyle), `mvnw spring-boot:run`,
`mvnw spring-boot:run -Dspring-boot.run.arguments=--task=import-dataset`,
`... --task=sync-problemset`. On Windows use `mvnw.cmd`.
