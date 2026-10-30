import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { problem } from '../test/dashboardFixtures.js';
import { server } from '../test/msw/server.js';
import { renderApp } from '../test/renderWithProviders.jsx';

/** GET /problems that records each query and answers 2 pages of results (or none). */
const serveProblems = ({ empty = false } = {}) => {
  const queries = [];
  server.use(
    http.get('*/api/v1/problems', async ({ request }) => {
      const params = Object.fromEntries(new URL(request.url).searchParams);
      queries.push(params);
      await delay(20);
      const data = empty ? [] : [problem(`${params.page}00/A`, { title: `Page ${params.page} problem` }), problem('9/B', { rating: null })];
      return HttpResponse.json({ success: true, data, meta: { page: Number(params.page), limit: 20, total: empty ? 0 : 40, totalPages: empty ? 0 : 2 } });
    }),
  );
  return queries;
};

describe('ProblemsPage', () => {
  it('shows skeleton rows, then a page of problems linking to their detail pages', async () => {
    const queries = serveProblems();
    renderApp('/problems', { signedIn: true });
    expect(await screen.findByLabelText('Loading problems')).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /Page 1 problem/ });
    expect(link).toHaveAttribute('href', '/problems/100/A');
    expect(screen.getByText('40 problems, newest contest first.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Unrated')).toHaveClass('sr-only');
    expect(queries[0]).toEqual({ page: '1', limit: '20' });
  });

  it('filters by topic and rating range, keeping the range valid and the URL in sync', async () => {
    const queries = serveProblems();
    const { router } = renderApp('/problems?page=2', { signedIn: true });
    await screen.findByRole('link', { name: /Page 2 problem/ });
    await userEvent.selectOptions(screen.getByLabelText('Topic'), 'dp');
    await userEvent.selectOptions(screen.getByLabelText('Rating from'), '1600');
    await userEvent.selectOptions(screen.getByLabelText('Rating to'), '1200');
    expect(router.state.location.search).toBe('?tag=dp&min=1200&max=1200');
    await screen.findByRole('link', { name: /Page 1 problem/ });
    expect(queries.at(-1)).toEqual({ tags: 'dp', minRating: '1200', maxRating: '1200', page: '1', limit: '20' });
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.state.location.search).toBe('');
  });

  it('pages through results', async () => {
    serveProblems();
    const { router } = renderApp('/problems', { signedIn: true });
    const pages = await screen.findByRole('navigation', { name: 'Problem pages' });
    await userEvent.click(within(pages).getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('link', { name: /Page 2 problem/ })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');
    expect(within(pages).getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('suggests clearing filters when nothing matches', async () => {
    serveProblems({ empty: true });
    renderApp('/problems?tag=dp&min=3500', { signedIn: true });
    expect(await screen.findByRole('heading', { name: 'No problems match' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Clear filters' })).toHaveLength(2);
  });
});
