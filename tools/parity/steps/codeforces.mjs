/** Handle linking, sync, topic stats, summary and recommendations (fake Codeforces on both servers). */
export const HANDLE = 'e2e_parity';

export const beforeLinkSteps = [
  { name: 'stats before linking', method: 'GET', path: '/users/me/stats' },
  { name: 'summary before linking', method: 'GET', path: '/users/me/stats/summary' },
  { name: 'recommendations before linking', method: 'GET', path: '/recommendations' },
  { name: 'sync before linking', method: 'POST', path: '/users/me/sync' },
  { name: 'unlink when not linked', method: 'DELETE', path: '/users/me/handle' },
  { name: 'link invalid handle', method: 'PUT', path: '/users/me/handle', json: { handle: 'a' } },
  { name: 'link unknown handle', method: 'PUT', path: '/users/me/handle', json: { handle: 'not_on_codeforces' } },
  { name: 'link extra key', method: 'PUT', path: '/users/me/handle', json: { handle: HANDLE, x: 1 } },
  { name: 'link handle', method: 'PUT', path: '/users/me/handle', json: { handle: ` ${HANDLE} ` } },
  { name: 'stats before first sync', method: 'GET', path: '/users/me/stats' },
  { name: 'summary before first sync', method: 'GET', path: '/users/me/stats/summary' },
  { name: 'recommendations before first sync', method: 'GET', path: '/recommendations' },
];

export const syncSteps = [
  { name: 'sync', method: 'POST', path: '/users/me/sync' },
  { name: 'sync again (cooldown)', method: 'POST', path: '/users/me/sync' },
  { name: 'stats single', method: 'GET', path: '/users/me/stats' },
  { name: 'stats pair by attempts', method: 'GET', path: '/users/me/stats?kind=pair&sort=attempts&limit=5' },
  { name: 'stats sort by name', method: 'GET', path: '/users/me/stats?sort=name&limit=3' },
  { name: 'stats invalid query', method: 'GET', path: '/users/me/stats?kind=triple&limit=0' },
  { name: 'summary', method: 'GET', path: '/users/me/stats/summary' },
  { name: 'recommendations', method: 'GET', path: '/recommendations' },
  { name: 'recommendations again (same order)', method: 'GET', path: '/recommendations' },
];
