/**
 * Health, meta, signup, login, me, profile. Both servers get the same account (separate databases), so values
 * such as the email and name compare as equal. `auth: 'none'` sends no token; default is the user's token.
 */
export const EMAIL = 'parity.user@e2e.test';
export const PASSWORD = 'Practice-only-2026';

const saveToken = (body, ctx) => {
  if (body?.data?.token) ctx.token = body.data.token;
};

export const accountSteps = [
  { name: 'health', method: 'GET', path: '/health', auth: 'none' },
  { name: 'health ready', method: 'GET', path: '/health/ready', auth: 'none' },
  { name: 'meta tags', method: 'GET', path: '/meta/tags', auth: 'none' },
  {
    name: 'signup', method: 'POST', path: '/auth/signup', auth: 'none', save: saveToken,
    json: { email: ` ${EMAIL.toUpperCase()} `, password: PASSWORD, name: '  Parity User ' },
  },
  { name: 'signup duplicate email', method: 'POST', path: '/auth/signup', auth: 'none',
    json: { email: EMAIL, password: PASSWORD, name: 'Again' } },
  { name: 'signup invalid fields', method: 'POST', path: '/auth/signup', auth: 'none',
    json: { email: 'not-an-email', password: 'short', name: '' } },
  { name: 'signup missing body', method: 'POST', path: '/auth/signup', auth: 'none' },
  { name: 'signup unknown key', method: 'POST', path: '/auth/signup', auth: 'none',
    json: { email: 'other@e2e.test', password: PASSWORD, name: 'X', role: 'admin' } },
  { name: 'signup malformed JSON', method: 'POST', path: '/auth/signup', auth: 'none',
    raw: { text: '{"email": ', type: 'application/json' } },
  { name: 'login', method: 'POST', path: '/auth/login', auth: 'none', save: saveToken,
    json: { email: EMAIL, password: PASSWORD } },
  { name: 'login wrong password', method: 'POST', path: '/auth/login', auth: 'none',
    json: { email: EMAIL, password: 'Wrong-password-1' } },
  { name: 'login unknown email', method: 'POST', path: '/auth/login', auth: 'none',
    json: { email: 'nobody@e2e.test', password: PASSWORD } },
  { name: 'auth me', method: 'GET', path: '/auth/me' },
  { name: 'auth me without token', method: 'GET', path: '/auth/me', auth: 'none' },
  { name: 'auth me malformed header', method: 'GET', path: '/auth/me', auth: 'none',
    headers: { Authorization: 'Token abc' } },
  { name: 'auth me bad token', method: 'GET', path: '/auth/me', auth: 'none',
    headers: { Authorization: 'Bearer not.a.jwt' } },
  { name: 'users me', method: 'GET', path: '/users/me' },
  { name: 'patch name', method: 'PATCH', path: '/users/me', json: { name: '  Renamed User ' } },
  { name: 'patch email refused', method: 'PATCH', path: '/users/me', json: { email: 'x@e2e.test' } },
  { name: 'patch empty name', method: 'PATCH', path: '/users/me', json: { name: '   ' } },
];
