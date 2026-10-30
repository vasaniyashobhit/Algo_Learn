import { describe, expect, it } from 'vitest';
import { authStore } from './lib/authStore.js';
import { router } from './router.jsx';
import { routes } from './routes.jsx';

describe('router', () => {
  it('has the landing, auth, protected dashboard and catch-all routes', () => {
    const [shell] = routes;
    expect(shell.errorElement).toBeDefined();
    const paths = shell.children.map((route) => route.path ?? (route.index ? 'index' : 'protected'));
    expect(paths).toEqual(['index', 'login', 'signup', 'protected', '*']);
  });

  it('goes to /login with a session-expired note when the token is rejected', async () => {
    window.history.pushState({}, '', '/dashboard');
    authStore.setToken('old');
    authStore.expire();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toEqual({ reason: 'expired', from: '/dashboard' });
    expect(authStore.getToken()).toBeNull();
  });
});
