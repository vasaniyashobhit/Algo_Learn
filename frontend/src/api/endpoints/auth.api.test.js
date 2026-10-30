import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { authStore } from '../../lib/authStore.js';
import { TEST_TOKEN, testUser } from '../../test/fixtures.js';
import { server } from '../../test/msw/server.js';
import { fetchMe, login, signup } from './auth.api.js';

describe('auth endpoints', () => {
  it('login posts credentials and returns token + user', async () => {
    let body;
    server.use(
      http.post('*/api/v1/auth/login', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ success: true, data: { token: TEST_TOKEN, user: testUser } });
      }),
    );
    await expect(login({ email: 'a@b.co', password: 'pw' })).resolves.toEqual({ token: TEST_TOKEN, user: testUser });
    expect(body).toEqual({ email: 'a@b.co', password: 'pw' });
  });

  it('signup returns the new account', async () => {
    const result = await signup({ name: 'Ravi', email: 'ravi@example.in', password: 'abc12345' });
    expect(result.user).toMatchObject({ name: 'Ravi', email: 'ravi@example.in' });
  });

  it('fetchMe sends the stored token', async () => {
    let auth;
    server.use(
      http.get('*/api/v1/auth/me', ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json({ success: true, data: testUser });
      }),
    );
    authStore.setToken('stored');
    await expect(fetchMe()).resolves.toEqual(testUser);
    expect(auth).toBe('Bearer stored');
  });

  it('an expired token clears the stored session', async () => {
    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({ success: false, error: { code: 'AUTH_TOKEN_EXPIRED', message: 'x' } }, { status: 401 }),
      ),
    );
    authStore.setToken('old');
    await expect(fetchMe()).rejects.toMatchObject({ code: 'AUTH_TOKEN_EXPIRED' });
    expect(authStore.getToken()).toBeNull();
  });
});
