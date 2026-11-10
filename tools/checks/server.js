import { spawnSync } from 'node:child_process';
import { BASE, call, checkAccount, login } from './stuck/api.js';

// Smoke check of the RUNNING backend (npm run dev, or CHECK_BASE_URL): health, tags, a throwaway signup + login,
// the check account (CHECK_EMAIL / CHECK_PASSWORD) on /auth/me and /users/me, no rate limit on /auth/me, a wrong
// password, a protected route without a token, and an unknown route. The throwaway user is deleted afterwards from
// the local docker compose Postgres (skipped, with a note, when that is not reachable). Exit 1 on any FAIL.
const results = [];
const check = (label, ok, note = '') => {
  results.push(ok);
  console.log(ok ? 'PASS' : 'FAIL', label, note);
};

/** Deletes the throwaway user in the compose Postgres (email passed as a psql variable, never in the SQL text). */
const deleteThrowaway = (email) => {
  const sql = "DELETE FROM users WHERE email = :'email' AND email LIKE 'check+%@example.com';";
  const res = spawnSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'algolearn', '-d', 'algolearn',
    '-v', `email=${email}`, '-v', 'ON_ERROR_STOP=1', '-qAt'], { input: sql, encoding: 'utf8' });
  return res.status === 0 ? 'deleted' : `not deleted (${(res.stderr || res.error?.message || '').trim()})`;
};

const throwaway = { email: `check+${Date.now()}@example.com`, password: 'Check-only-12345', name: 'Check User' };
const account = checkAccount();
console.log(`backend ${BASE}`);
try {
  const health = await call('GET', '/health');
  check('health', health.status === 200 && health.body.data.status === 'ok', `db ${health.body.data?.db}`);
  const ready = await call('GET', '/health/ready');
  check('health/ready', ready.status === 200, `${ready.status}`);
  const tags = await call('GET', '/meta/tags');
  check('meta/tags', tags.body.data?.topicTags?.length === 36, `${tags.body.data?.topicTags?.length} topic tags`);

  const signup = await call('POST', '/auth/signup', { json: throwaway });
  check('signup (throwaway)', signup.status === 201 && Boolean(signup.body.data?.token), `${signup.status}`);
  const again = await call('POST', '/auth/login', { json: { email: throwaway.email, password: throwaway.password } });
  check('login (throwaway)', again.status === 200, `${again.status}`);

  const token = await login(account);
  check('login (check account)', Boolean(token));
  const me = await call('GET', '/auth/me', { token });
  check('auth/me', me.status === 200 && me.body.data.email === account.email && !('passwordHash' in me.body.data));
  const profile = await call('GET', '/users/me', { token });
  check('users/me', profile.status === 200, `handle ${profile.body.data?.cfHandle ?? '-'}`);
  const statuses = [];
  for (let i = 0; i < 25; i += 1) statuses.push((await call('GET', '/auth/me', { token })).status);
  check('auth/me x25 not limited', statuses.every((s) => s === 200), [...new Set(statuses)].join(','));

  const wrong = await call('POST', '/auth/login', { json: { email: account.email, password: 'Wrong-password-0' } });
  check('wrong password', wrong.status === 401 && wrong.body.error.code === 'AUTH_INVALID_CREDENTIALS', wrong.body.error?.code);
  const anonymous = await call('GET', '/recommendations');
  check('protected route without token', anonymous.status === 401 && anonymous.body.error.code === 'AUTH_REQUIRED');
  const unknown = await call('GET', '/does-not-exist');
  check('unknown route', unknown.status === 404 && unknown.body.error.code === 'ROUTE_NOT_FOUND');
} finally {
  console.log(`cleanup: throwaway user ${deleteThrowaway(throwaway.email)}`);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\nFAIL: ${failed} check(s) failed` : `\nPASS: all ${results.length} checks`);
process.exitCode = failed ? 1 : 0;
