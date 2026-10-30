import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { emptySummary, linkedUser } from '../../test/dashboardFixtures.js';
import { server } from '../../test/msw/server.js';
import { renderApp } from '../../test/renderWithProviders.jsx';

describe('HandleOnboarding (empty dashboard after signup)', () => {
  it('is the hero: why we need the handle and what happens next', async () => {
    renderApp('/dashboard', { signedIn: true });
    expect(await screen.findByRole('heading', { level: 1, name: 'Link your Codeforces handle' })).toBeInTheDocument();
    expect(screen.getByText(/so we need your handle to read them/)).toBeInTheDocument();
    const steps = within(screen.getByRole('region', { name: 'What happens next' })).getAllByRole('listitem');
    expect(steps.map((step) => step.querySelector('h3').textContent)).toEqual([
      'Link your handle',
      'First sync, about 1 minute',
      'Your topic scoreboard',
    ]);
    expect(steps[0]).toHaveAttribute('aria-current', 'step');
    // The rest of the page is never blank: cold-start topics are already there.
    expect(await screen.findByRole('heading', { name: 'greedy' })).toBeInTheDocument();
  });

  it('links, starts the first sync at once and moves to the first-sync state', async () => {
    let linked = false;
    let synced = false;
    server.use(
      http.put('*/api/v1/users/me/handle', () => {
        linked = true;
        return HttpResponse.json({ success: true, data: { ...linkedUser, lastSyncedAt: null } });
      }),
      http.get('*/api/v1/users/me/stats/summary', () => {
        const { data, meta } = emptySummary(linked ? 'NOT_SYNCED' : 'NO_HANDLE', linked ? { cfHandle: 'ananya_k' } : {});
        return HttpResponse.json({ success: true, data, meta });
      }),
      http.post('*/api/v1/users/me/sync', async () => {
        synced = true;
        await new Promise((resolve) => setTimeout(resolve, 300));
        return HttpResponse.json({ success: true, data: { newSubmissions: 0, totalSubmissions: 0, lastSyncedAt: null, pending: [] } });
      }),
    );
    renderApp('/dashboard', { signedIn: true });
    await userEvent.type(await screen.findByLabelText('Codeforces handle'), 'ananya_k');
    await userEvent.click(screen.getByRole('button', { name: 'Link handle' }));

    expect(await screen.findByRole('heading', { name: "Reading ananya_k's submissions" })).toBeInTheDocument();
    expect(synced).toBe(true);
    expect(screen.getAllByRole('button', { name: /Syncing…/ }).length).toBeGreaterThan(0);
    const steps = within(screen.getByRole('region', { name: 'What happens next' })).getAllByRole('listitem');
    expect(steps[1]).toHaveAttribute('aria-current', 'step');
    expect(steps[0]).toHaveTextContent('Done');
  });
});
