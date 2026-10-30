# Deploying AlgoLearn

Render (free web service) runs the API, Vercel serves the React app, MongoDB Atlas holds the data,
and a free cron service triggers the 6-hourly sync because Render's free instances sleep.
Do the steps in this order: the API URL is needed by the app, and the app URL by the API (CORS).

## 1. MongoDB Atlas

1. Use the existing cluster (it already holds the ~11,700 problems). If you start fresh, run
   `npm run import:dataset` and `npm run sync:problemset` locally against it once.
2. **Database Access:** create a user just for the app (role *Read and write to any database*,
   or scoped to the app database). Use a long generated password without `@ : / ?` characters
   (or URL-encode them in the URI).
3. **Network Access:** Render's free plan has no fixed outbound IPs, so add `0.0.0.0/0`
   ("Allow access from anywhere"). Security then rests on the strong password; never commit the URI.
4. **Connect → Drivers:** copy the `mongodb+srv://…` URI and put the database name before the
   `?` (for example `…mongodb.net/cp-coach?retryWrites=true&w=majority`).

## 2. Backend on Render

1. Push the repo to GitHub. On https://render.com: **New → Web Service**, pick the repo.
2. Settings: **Root Directory** empty (repo root, so the workspace lockfile is used),
   **Runtime** Node, **Build Command** `npm ci -w backend --include-workspace-root=false`,
   **Start Command** `npm start -w backend`, **Instance Type** Free.
3. **Health Check Path:** `/api/v1/health` (always 200 while the process answers;
   `/api/v1/health/ready` answers 503 until MongoDB is connected, useful for a manual check).
4. **Environment** (Settings → Environment → Add): every variable from `backend/.env.example`:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | the Atlas URI from step 1 |
   | `JWT_SECRET` | `node -e "console.log(crypto.randomBytes(48).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | the Vercel URL from step 3 (set a placeholder first, then update) |
   | `GEMINI_API_KEY`, `GEMINI_MODELS` | your key; e.g. `gemini-3.8-flash,gemini-3.5-flash-lite` |
   | `GROQ_API_KEY`, `GROQ_MODEL` | optional backup provider |
   | `CRON_SECRET` | `node -e "console.log(crypto.randomBytes(24).toString('hex'))"` |
   | `SYNC_CRON`, `LOG_LEVEL` | `0 */6 * * *`, `info` |

   Do not set `PORT`: Render provides it. Node 22 comes from `.nvmrc` (or set `NODE_VERSION=22`).
5. Deploy. The log should say `CP Coach API listening`. Open
   `https://<service>.onrender.com/api/v1/health` and check `"db": "up"`.

The server sets `trust proxy` to 1 in production (Render's proxy), so rate limits see the real
client IP. Responses never include stack traces in production.

## 3. Frontend on Vercel

1. On https://vercel.com: **Add New → Project**, import the repo.
2. **Root Directory:** `frontend`. Vercel reads `frontend/vercel.json` (Vite preset, `npm run build`,
   output `dist`, SPA rewrite of every path to `index.html`, long cache for `/assets/*`). It detects
   the npm workspace and installs from the root lockfile.
3. **Environment Variables:** `VITE_API_URL` = `https://<service>.onrender.com` (no trailing
   `/api`, no slash). It is baked in at build time: redeploy after changing it.
4. Deploy, then copy the production URL (e.g. `https://algolearn.vercel.app`).
5. Back on Render, set `CLIENT_URL` to exactly that origin and save (Render redeploys). CORS
   allows only this origin, so preview deployments on other URLs cannot call the API.

## 4. Scheduled sync (free cron)

Render's free instance sleeps after 15 minutes without traffic, and the in-process `node-cron`
does not run while it sleeps. An external scheduler wakes it and starts the sync instead.

1. Create a free account on https://cron-job.org (or any service that can send a POST with a
   custom header).
2. **Job 1, warm-up:** `GET https://<service>.onrender.com/api/v1/health`, every 6 hours at
   minute 55 of hours 23, 5, 11 and 17 (cron `55 5,11,17,23 * * *`). It wakes the instance, which
   takes up to about a minute, so job 2 does not hit the cold start.
3. **Job 2, sync:** `POST https://<service>.onrender.com/api/v1/internal/sync-all` at
   `0 0,6,12,18 * * *`, with header `x-cron-secret: <CRON_SECRET>`. Expect `202` and
   `{ "started": true }`; the sync runs in the background (a second trigger during a run is ignored).
   Turn on "notify on failure"; `403` means the secret header is wrong.
4. Test it once with **Run now**, then check Render's logs for the sync job lines.

Optional: an uptime pinger on `/api/v1/health` every 10–14 minutes keeps the instance awake, but
it uses free instance hours; the two jobs above are enough for the 6-hour sync.

## 5. Check the deployment

1. Open the Vercel URL, sign up, link your Codeforces handle, wait for the first sync.
2. The dashboard shows your numbers; "I'm stuck" returns hints (or the fallback notice).
3. Reload a deep link such as `/history`: it must load (SPA rewrite), not 404.
4. If requests fail with a CORS error in the browser console, `CLIENT_URL` on Render does not
   match the app's origin exactly.
