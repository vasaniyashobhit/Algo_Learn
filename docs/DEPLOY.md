# Deploying AlgoLearn

The API runs as a **Docker web service** built from `backend/Dockerfile` (Render, Koyeb, Fly.io or
any host that builds a Dockerfile), the data lives in **managed PostgreSQL** (Neon or Supabase), the
React app stays on **Vercel** (unchanged), and **cron-job.org** triggers the 6-hourly sync because
free instances sleep. Order matters: the API URL is needed by the app, the app URL by the API (CORS).

## 1. Managed PostgreSQL

**Neon** (free tier): create a project (PostgreSQL 16, a region close to the API host). In
*Connection details* pick the **direct** connection (not the `-pooler` host: Flyway and the JDBC
driver's prepared statements want a session) and note host, database, user and password.

**Supabase** (alternative): *Project settings → Database*. The direct host is IPv6-only on the free
plan, so use the **Session pooler** connection (port 5432, IPv4), never the transaction pooler (6543).

Either way the backend gets three variables (no credentials inside the URL):

| Key | Value |
|---|---|
| `DATABASE_URL` | `jdbc:postgresql://<host>:5432/<db>?sslmode=require` |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | the role and its password |

Flyway creates the schema on the first start (V1–V4, including the `algolearn_text` text-search
configuration; the database owner role on Neon and the `postgres` role on Supabase may create it).
Load the problems once from your machine: point `backend/.env` at the managed database, then run
`npm run import:dataset` and `npm run sync:problemset` (about 11,700 problems; put the local values
back afterwards). Copying a local database with `pg_dump -Fc --no-owner` / `pg_restore --no-owner`
works too.

## 2. Backend as a Docker web service (Render example)

1. On https://render.com: **New → Web Service**, pick the repository, **Runtime: Docker**,
   **Root Directory** `backend` (the Dockerfile and its build context), **Instance Type** Free or
   Starter (512 MB).
2. **Health Check Path:** `/api/v1/health` (200 while the process answers; `/api/v1/health/ready`
   answers 503 until the database is reachable).
3. **Environment:** every variable from `backend/.env.example`:

   | Key | Value |
   |---|---|
   | `SPRING_PROFILES_ACTIVE` | `prod` (already the image default) |
   | `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | from step 1 |
   | `JWT_SECRET` | `node -e "console.log(crypto.randomBytes(48).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | the Vercel URL from step 3 (a placeholder first, then update) |
   | `GEMINI_API_KEY`, `GEMINI_MODELS` | your key; e.g. `gemini-3.8-flash,gemini-3.5-flash-lite` |
   | `GROQ_API_KEY`, `GROQ_MODEL` | optional backup provider |
   | `CRON_SECRET` | `node -e "console.log(crypto.randomBytes(24).toString('hex'))"` |
   | `SYNC_CRON`, `LOG_LEVEL` | `0 */6 * * *`, `info` |

   `PORT` defaults to 4000 in the image; hosts that inject their own `PORT` work as well.
   `TESSDATA_PREFIX` is already set in the image.
4. Deploy. The log ends with `Started AlgoLearnApplication`; open
   `https://<service>.onrender.com/api/v1/health` and check `"db": "up"`. A missing or invalid
   variable stops the container at once with a list of every problem.

The `prod` profile hides stack traces and reads client IPs from the proxy's `X-Forwarded-For`
(Tomcat trusts private-range proxies such as Render's). After the first deploy, check that rate
limits are per user IP: two different networks should each see `RateLimit-Remaining` count down
on their own.

### Memory on a 512 MB host

- The image starts the JVM with `-Xmx256m -Xss512k -XX:MaxMetaspaceSize=160m
  -XX:ReservedCodeCacheSize=48m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError`. The rest of the
  512 MB covers metaspace, thread stacks, direct buffers and Tesseract's native memory. Measured in
  `docker compose` (same 512 MB limit): about 340 MB after startup.
- Do not raise `-Xmx` above ~300 MB: OCR runs in native memory outside the heap, and the host kills
  the container at its limit (no Java `OutOfMemoryError` first). To override, set
  `JAVA_TOOL_OPTIONS` on the host (it replaces the image value).
- Requests run on virtual threads; the Hikari pool holds at most 10 connections (well inside
  Neon's and Supabase's free limits).
- The image build itself is lean (Maven heap capped, tests not compiled, BuildKit cache for
  `~/.m2`), so it also builds on small builders; CI runs the tests.

## 3. Frontend on Vercel (unchanged)

1. On https://vercel.com: **Add New → Project**, import the repository.
2. **Root Directory:** `frontend`. Vercel reads `frontend/vercel.json` (Vite preset, `npm run build`,
   output `dist`, SPA rewrite, long cache for `/assets/*`) and installs from the root lockfile.
3. **Environment Variables:** `VITE_API_URL` = `https://<service>.onrender.com` (no `/api`, no
   trailing slash). It is baked in at build time: redeploy after changing it.
4. Deploy, copy the production URL (e.g. `https://algolearn.vercel.app`), and set `CLIENT_URL` on
   the backend to exactly that origin (the backend redeploys). CORS allows only this origin.

## 4. Scheduled sync with cron-job.org

Free instances sleep after a while without traffic, and the in-process scheduler does not run while
asleep. An external scheduler wakes the API and starts the sync.

1. Create a free account on https://cron-job.org.
2. **Job 1, warm-up:** `GET https://<service>.onrender.com/api/v1/health` at `55 5,11,17,23 * * *`.
   Waking a sleeping instance plus JVM startup takes up to about a minute.
3. **Job 2, sync:** `POST https://<service>.onrender.com/api/v1/internal/sync-all` at
   `0 0,6,12,18 * * *` with header `x-cron-secret: <CRON_SECRET>`. Expect `202` and
   `{ "started": true, "job": "syncAllUsers" }`; the sync runs in the background (a second trigger
   during a run is skipped). Turn on "notify on failure"; `403` means the secret header is wrong.
4. Test with **Run now**, then look for the `syncAllUsers` lines in the backend log.

## 5. Check the deployment

1. Open the Vercel URL, sign up, link your Codeforces handle, wait for the first sync.
2. The dashboard shows your numbers; "I'm stuck" returns hints (or the fallback notice).
3. Reload a deep link such as `/history`: it must load (SPA rewrite), not 404.
4. From your machine: `CHECK_BASE_URL=https://<service>.onrender.com/api/v1` with `CHECK_EMAIL` /
   `CHECK_PASSWORD` of an existing account, then `npm run check:server` and `npm run check:stuck`
   (`check:server` creates one throwaway user and can only delete it from the local compose
   database; remove `check+…@example.com` users on the host by hand, or skip it there).
5. A CORS error in the browser console means `CLIENT_URL` does not match the app origin exactly.
