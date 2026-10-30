import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { practiceItem, problem } from '../test/dashboardFixtures.js';
import { server } from '../test/msw/server.js';
import { respondError } from '../test/msw/scenarios.js';
import { renderApp } from '../test/renderWithProviders.jsx';

const items = [
  practiceItem('474/D', { problem: problem('474/D', { title: 'Flowers' }) }),
  practiceItem('455/A', { status: 'solved', addedFrom: 'manual', problem: problem('455/A', { title: 'Boredom', rating: 1500 }) }),
  practiceItem('189/A', { status: 'skipped', addedFrom: 'stuck', problem: null }),
];

/** GET /practice that filters like the backend. */
const serveList = (list = items) =>
  server.use(
    http.get('*/api/v1/practice', ({ request }) => {
      const status = new URL(request.url).searchParams.get('status');
      const data = status ? list.filter((item) => item.status === status) : list;
      return HttpResponse.json({ success: true, data, meta: { total: data.length, status } });
    }),
  );

const rowFor = (name) => screen.getByRole('link', { name: new RegExp(name) }).closest('tr');

describe('PracticePage', () => {
  it('shows a skeleton, then the list with marks, ratings, topics and sources', async () => {
    serveList();
    renderApp('/practice', { signedIn: true });
    expect(await screen.findByLabelText('Loading your practice list')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Flowers/ })).toHaveAttribute('href', 'https://codeforces.com/problemset/problem/474/D');
    expect(within(rowFor('Flowers')).getByText('To do')).toHaveClass('sr-only');
    expect(rowFor('Boredom')).toHaveTextContent('1500');
    expect(rowFor('Boredom')).toHaveTextContent('Added by you');
    expect(screen.getByText('189/A (no longer in our problem set)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Practice list' })).toBeInTheDocument();
  });

  it('filters by status, with counts on each filter', async () => {
    serveList();
    renderApp('/practice', { signedIn: true });
    const filters = await screen.findByRole('group', { name: 'Show' });
    const all = within(filters).getByRole('button', { name: /All/ });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(await within(filters).findByRole('button', { name: 'To do 1' })).toBeInTheDocument();
    await userEvent.click(within(filters).getByRole('button', { name: 'Solved 1' }));
    expect(all).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByRole('link', { name: /Boredom/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Flowers/ })).not.toBeInTheDocument();
  });

  it('words the empty list for the filter, with a next step', async () => {
    serveList([items[1]]);
    renderApp('/practice', { signedIn: true });
    await userEvent.click(await screen.findByRole('button', { name: 'To do 0' }));
    expect(await screen.findByRole('heading', { name: 'Nothing left to do' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See your next topics' })).toHaveAttribute('href', '/dashboard');
  });

  it('shows an empty list with a way to fill it', async () => {
    renderApp('/practice', { signedIn: true });
    expect(await screen.findByRole('heading', { name: 'Nothing queued yet' })).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    respondError('get', '/practice', 500, 'INTERNAL_ERROR', null, { requestId: 'req-list' });
    renderApp('/practice', { signedIn: true });
    expect(await screen.findByRole('heading', { name: "Your practice list didn't load" })).toBeInTheDocument();
    expect(screen.getByText('req-list')).toBeInTheDocument();
  });
});
