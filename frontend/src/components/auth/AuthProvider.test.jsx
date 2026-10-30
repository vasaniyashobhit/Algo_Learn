import { act, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { useAuth } from '../../hooks/useAuth.js';
import { authStore } from '../../lib/authStore.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { TEST_TOKEN, testUser } from '../../test/fixtures.js';
import { server } from '../../test/msw/server.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';

const Probe = () => {
  const { status, user } = useAuth();
  return (
    <p>
      {status}:{user?.name ?? 'nobody'}
    </p>
  );
};

describe('AuthProvider', () => {
  it('is anonymous without a token and never calls /auth/me', () => {
    let called = false;
    server.use(http.get('*/api/v1/auth/me', () => {
      called = true;
      return HttpResponse.json({ success: true, data: testUser });
    }));
    renderWithProviders(<Probe />);
    expect(screen.getByText('anonymous:nobody')).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('loads the user from /auth/me when a token is stored', async () => {
    renderWithProviders(<Probe />, { signedIn: true });
    expect(screen.getByText('loading:nobody')).toBeInTheDocument();
    expect(await screen.findByText(`authenticated:${testUser.name}`)).toBeInTheDocument();
  });

  it('drops the cached user when the token is cleared', async () => {
    const { queryClient } = renderWithProviders(<Probe />, { signedIn: true });
    await screen.findByText(`authenticated:${testUser.name}`);
    act(() => authStore.clear());
    expect(screen.getByText('anonymous:nobody')).toBeInTheDocument();
    expect(queryClient.getQueryData(queryKeys.auth.me())).toBeUndefined();
    expect(authStore.getToken()).toBeNull();
    expect(TEST_TOKEN).toBe('test-token');
  });
});
