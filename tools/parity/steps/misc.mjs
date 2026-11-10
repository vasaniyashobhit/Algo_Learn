/** Unknown routes, the hosted-cron trigger, auth on guarded prefixes, and unlinking the handle at the end. */
export const CRON_SECRET = 'e2e-cron-secret-0123456789';

export const miscSteps = [
  { name: 'unknown route', method: 'GET', path: '/does-not-exist', auth: 'none' },
  { name: 'unknown method on known path', method: 'DELETE', path: '/problems', auth: 'none' },
  { name: 'guarded prefix unknown path', method: 'GET', path: '/practice/x/y/z', auth: 'none' },
  { name: 'recommendations without token', method: 'GET', path: '/recommendations', auth: 'none' },
  { name: 'sync-all without secret', method: 'POST', path: '/internal/sync-all', auth: 'none' },
  { name: 'sync-all wrong secret', method: 'POST', path: '/internal/sync-all', auth: 'none',
    headers: { 'x-cron-secret': 'wrong-secret-0123456789' } },
  { name: 'sync-all', method: 'POST', path: '/internal/sync-all', auth: 'none', headers: { 'x-cron-secret': CRON_SECRET } },
  // The background sync-all job holds each user's sync lock for a moment: let it finish on both servers.
  { name: 'me after sync-all', method: 'GET', path: '/users/me', waitMs: 3_000 },
  { name: 'unlink handle', method: 'DELETE', path: '/users/me/handle' },
  { name: 'stats after unlinking', method: 'GET', path: '/users/me/stats/summary' },
];
