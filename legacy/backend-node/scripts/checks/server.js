import { EventEmitter } from 'node:events';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { startServer } from '../../src/server.js';
import { parseEnv } from '../../src/config/env.js';
import { createLogger } from '../../src/lib/logger.js';
import { User } from '../../src/modules/users/user.model.js';

// Default: real Atlas from .env. `--memory`: same server code against an in-memory MongoDB.
const memory = process.argv.includes('--memory') ? await MongoMemoryServer.create() : null;
const env = { ...parseEnv(), PORT: 0, ...(memory && { MONGODB_URI: `${memory.getUri()}cp-coach-check` }) };
const { server, shutdown } = await startServer({
  env, logger: createLogger({ level: 'silent' }), proc: new EventEmitter(), exit: () => {},
});
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
const call = async (method, path, { body, token } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
};
const check = (label, ok, note = '') => console.log(ok ? 'PASS' : 'FAIL', label, note);
const email = `check+${Date.now()}@example.com`;
const password = 'Check12345';
try {
  const health = await call('GET', '/health');
  check('health', health.status === 200 && health.json.data.status === 'ok');
  const tags = await call('GET', '/meta/tags');
  check('meta/tags', tags.json.data.topicTags.length === 36, `${tags.json.data.topicTags.length} topic tags`);
  const signup = await call('POST', '/auth/signup', { body: { email, password, name: 'Check User' } });
  check('signup', signup.status === 201 && !!signup.json.data.token, `${signup.status}`);
  const login = await call('POST', '/auth/login', { body: { email, password } });
  check('login', login.status === 200, `${login.status}`);
  const { token } = login.json.data;
  const me = await call('GET', '/auth/me', { token });
  check('auth/me', me.status === 200 && me.json.data.email === email && !('passwordHash' in me.json.data));
  const statuses = [];
  for (let i = 0; i < 25; i += 1) statuses.push((await call('GET', '/auth/me', { token })).status);
  check('auth/me x25 not limited', statuses.every((s) => s === 200), [...new Set(statuses)].join(','));
  const wrong = await call('POST', '/auth/login', { body: { email, password: 'Wrong12345' } });
  check('wrong password', wrong.status === 401 && wrong.json.error.code === 'AUTH_INVALID_CREDENTIALS', wrong.json.error.code);
} finally {
  const { deletedCount } = await User.deleteOne({ email });
  console.log('cleanup: deleted throwaway user', deletedCount);
  await shutdown('check');
  await memory?.stop();
}
