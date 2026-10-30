import { delay, http, HttpResponse } from 'msw';
import { emptySummary, linkedUser, pairStats, radarStats, syncedSummary } from '../dashboardFixtures.js';
import { errorBody } from '../fixtures.js';
import { server } from './server.js';

const ok = (data, meta) => HttpResponse.json({ success: true, data, ...(meta ? { meta } : {}) });

/** GET /users/me/stats answers by kind. */
const statsHandler = (single, pairs, reason) =>
  http.get('*/api/v1/users/me/stats', ({ request }) => {
    const kind = new URL(request.url).searchParams.get('kind') ?? 'single';
    const data = kind === 'pair' ? pairs : single;
    return ok(data, { kind, total: data.length, lastSyncedAt: linkedUser.lastSyncedAt, ...(reason ? { reason } : {}) });
  });

/** A linked, synced account with radar, weak topics, pairs and activity. */
export const useSyncedAccount = ({ summary = syncedSummary, single = radarStats, pairs = pairStats } = {}) =>
  server.use(
    http.get('*/api/v1/auth/me', () => ok(linkedUser)),
    http.get('*/api/v1/users/me/stats/summary', () => ok(summary.data, summary.meta)),
    statsHandler(single, pairs),
  );

/** Linked but never synced. */
export const useNotSyncedAccount = () => {
  const user = { ...linkedUser, lastSyncedAt: null };
  const { data, meta } = emptySummary('NOT_SYNCED', { cfHandle: user.cfHandle, cfRating: user.cfRating });
  server.use(
    http.get('*/api/v1/auth/me', () => ok(user)),
    http.get('*/api/v1/users/me/stats/summary', () => ok(data, meta)),
    statsHandler([], [], 'NOT_SYNCED'),
  );
};

/** Any route answering with an error envelope (optionally after `wait` ms). */
export const respondError = (method, path, status, code, details = null, { wait = 0, requestId } = {}) =>
  server.use(
    http[method](`*/api/v1${path}`, async () => {
      if (wait) await delay(wait);
      return HttpResponse.json(errorBody(code, 'server text that must never be shown', details, requestId), { status });
    }),
  );

/** Any route answering with success data (optionally after `wait` ms, or never with `wait: 'infinite'`). */
export const respondOk = (method, path, data, meta, { wait = 0 } = {}) =>
  server.use(
    http[method](`*/api/v1${path}`, async () => {
      if (wait) await delay(wait);
      return ok(data, meta);
    }),
  );
