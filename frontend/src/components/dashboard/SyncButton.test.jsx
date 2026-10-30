import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { linkedUser, syncedSummary } from '../../test/dashboardFixtures.js';
import { server } from '../../test/msw/server.js';
import { respondError, useSyncedAccount } from '../../test/msw/scenarios.js';
import { renderApp } from '../../test/renderWithProviders.jsx';

const openDashboard = async () => {
  renderApp('/dashboard', { signedIn: true });
  return screen.findByRole('button', { name: 'Sync now' });
};

describe('SyncButton', () => {
  it('says "Syncing…" at once, toasts the new submissions, then refreshes stats and sync time', async () => {
    useSyncedAccount();
    let summaryCalls = 0;
    const freshAt = new Date().toISOString();
    let syncDone = false;
    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({ success: true, data: { ...linkedUser, lastSyncedAt: syncDone ? freshAt : linkedUser.lastSyncedAt } }),
      ),
      http.get('*/api/v1/users/me/stats/summary', () => {
        summaryCalls += 1;
        return HttpResponse.json({ success: true, data: syncedSummary.data, meta: syncedSummary.meta });
      }),
      http.post('*/api/v1/users/me/sync', async () => {
        await delay(150);
        syncDone = true;
        return HttpResponse.json({ success: true, data: { newSubmissions: 42, totalSubmissions: 1352, lastSyncedAt: freshAt, pending: [] } });
      }),
    );
    const button = await openDashboard();
    await userEvent.click(button);
    const busy = screen.getByRole('button', { name: /Syncing…/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/Syncing your Codeforces submissions/)).toBeInTheDocument();

    expect(await screen.findByText('Synced. 42 new submissions.')).toBeInTheDocument();
    await waitFor(() => expect(summaryCalls).toBeGreaterThan(1));
    expect(screen.getByText(/Specialist ·/)).toHaveTextContent('Specialist · Synced just now');
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeEnabled();
  });

  it('explains a sync that is already running', async () => {
    useSyncedAccount();
    respondError('post', '/users/me/sync', 409, 'SYNC_IN_PROGRESS');
    await userEvent.click(await openDashboard());
    expect(await screen.findByText('A sync is already running. Your numbers will update when it finishes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeEnabled();
  });

  it('explains the cooldown with the remaining wait', async () => {
    useSyncedAccount();
    respondError('post', '/users/me/sync', 429, 'RATE_LIMITED', { retryAfterSeconds: 15 });
    await userEvent.click(await openDashboard());
    expect(await screen.findByText('You synced moments ago. Try again in 15 seconds.')).toBeInTheDocument();
  });
});
