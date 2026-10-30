import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { syncedSummary } from '../test/dashboardFixtures.js';
import { errorBody } from '../test/fixtures.js';
import { server } from '../test/msw/server.js';
import { useNotSyncedAccount, useSyncedAccount } from '../test/msw/scenarios.js';
import { renderApp } from '../test/renderWithProviders.jsx';

// The One Plate Rule: one yellow plate per screen besides the wordmark (which is a link).
const plates = (container) => [...container.querySelectorAll('.bg-plate')].filter((node) => node.tagName !== 'A');

describe('DashboardPage', () => {
  it('shows the scoreboard skeleton first, then the synced scoreboard', async () => {
    useSyncedAccount();
    const { container } = renderApp('/dashboard', { signedIn: true });
    expect(await screen.findByLabelText('Loading your scoreboard')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'ananya_k' })).toBeInTheDocument();
    expect(screen.getByText(/Specialist ·/)).toHaveTextContent(/Synced .+ ago|Synced yesterday/);
    expect(await screen.findByRole('heading', { name: 'Topic strength' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Weak topics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Topic pairs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Last 30 days' })).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'greedy' });
    expect(plates(container)).toHaveLength(1);
  });

  it('labels every cricket element in plain words first', async () => {
    useSyncedAccount();
    renderApp('/dashboard', { signedIn: true });
    await screen.findByRole('heading', { name: 'Topic strength' });
    await screen.findByRole('heading', { name: 'Last 30 days' });
    for (const caption of ['Wagon wheel', 'Batting card', 'Partnerships', 'Ball by ball · 5 overs', 'Your numbers · Scoreboard']) {
      expect(screen.getByText(caption)).toHaveClass('caption');
    }
  });

  it('before the first sync: the plate offers Sync now and no empty charts are drawn', async () => {
    useNotSyncedAccount();
    const { container } = renderApp('/dashboard', { signedIn: true });
    expect(await screen.findByRole('heading', { name: 'ananya_k is linked. First sync pending.' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Topic strength' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Sync now' })).toHaveLength(2);
    await screen.findByRole('heading', { name: 'greedy' });
    expect(plates(container)).toHaveLength(1);
  });

  it('a failed summary shows a retry, and the next topics still load', async () => {
    let calls = 0;
    useSyncedAccount();
    server.use(
      http.get('*/api/v1/users/me/stats/summary', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(errorBody('INTERNAL_ERROR', 'boom', null, 'req-sum'), { status: 500 })
          : HttpResponse.json({ success: true, data: syncedSummary.data, meta: syncedSummary.meta });
      }),
    );
    renderApp('/dashboard', { signedIn: true });
    expect(await screen.findByRole('heading', { name: "Your scoreboard didn't load" })).toBeInTheDocument();
    expect(screen.getByText('req-sum')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'greedy' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'ananya_k' })).toBeInTheDocument());
  });
});
