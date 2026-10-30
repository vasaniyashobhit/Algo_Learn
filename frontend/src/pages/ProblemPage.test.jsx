import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { problem } from '../test/dashboardFixtures.js';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server.js';
import { respondError, respondOk } from '../test/msw/scenarios.js';
import { renderApp } from '../test/renderWithProviders.jsx';

const full = (overrides = {}) => ({
  ...problem('1811/G2', { title: 'Vlad and the Nice Paths', rating: 2200, tags: ['combinatorics', 'dp'] }),
  description: 'There are $$$n$$$ tiles in a row.',
  inputFormat: 'The first line has $$$t$$$.',
  outputFormat: 'Print the count modulo $$$10^9+7$$$.',
  note: '',
  editorial: 'Let $$$dp_i$$$ be the best length.',
  hasStatement: true,
  ...overrides,
});

const similarMeta = (strategy) => ({ strategy, strategies: [strategy], problem: { id: '1811/G2' } });

const open = (data, strategy = 'primary') => {
  respondOk('get', '/problems/1811/G2', data, undefined, { wait: 20 });
  respondOk('get', '/problems/1811/G2/similar', [problem('474/D', { title: 'Flowers' })], similarMeta(strategy));
  return renderApp('/problems/1811/g2', { signedIn: true });
};

describe('ProblemPage', () => {
  it('shows a skeleton, then the statement with LaTeX, rating, tags and the Codeforces link', async () => {
    open(full());
    expect(await screen.findByLabelText('Loading the problem')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Vlad and the Nice Paths' })).toBeInTheDocument();
    expect(screen.getByText('2200')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Topics' })).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Open on Codeforces/ })).toHaveAttribute('href', 'https://codeforces.com/problemset/problem/1811/G2');
    const statement = screen.getByRole('article', { name: 'Statement' });
    expect(statement.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(3);
    expect(within(statement).getByRole('heading', { name: 'Input' })).toBeInTheDocument();
    expect(within(statement).getByRole('heading', { name: 'Output' })).toBeInTheDocument();
    expect(within(statement).queryByRole('heading', { name: 'Note' })).not.toBeInTheDocument();
    expect(document.title).toBe('1811/G2 Vlad and the Nice Paths · AlgoLearn');
  });

  it('lists similar problems with how they were matched, and keeps the editorial folded', async () => {
    open(full(), 'widened_window');
    expect(await screen.findByRole('link', { name: /Flowers/ })).toHaveAttribute('href', '/problems/474/D');
    expect(screen.getByText('Matched by same topics, wider rating range.')).toBeInTheDocument();
    expect(screen.queryByText(/best length/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show editorial' }));
    expect(screen.getByText(/be the best length/)).toBeInTheDocument();
  });

  it('adds to practice from the plate and opens the stuck form with the link filled in', async () => {
    let list = [];
    const added = { id: 'i1', problemId: '1811/G2', status: 'todo', addedFrom: 'manual', problem: full() };
    server.use(
      http.get('*/api/v1/practice', () => HttpResponse.json({ success: true, data: list, meta: { total: list.length } })),
      http.post('*/api/v1/practice', () => {
        list = [added];
        return HttpResponse.json({ success: true, data: added }, { status: 201 });
      }),
    );
    open(full());
    await userEvent.click(await screen.findByRole('button', { name: 'Add 1811/G2 Vlad and the Nice Paths to practice' }));
    expect(await screen.findByRole('link', { name: /1811\/G2 is in your practice list/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: "I'm stuck on this" }));
    expect(await screen.findByLabelText('Problem link')).toHaveValue('https://codeforces.com/problemset/problem/1811/G2');
  });

  it('says when we only have the tags and rating', async () => {
    open(full({ hasStatement: false, description: '', editorial: '', tags: [] }));
    expect(await screen.findByText(/We only store the topics and rating for this problem/)).toBeInTheDocument();
    expect(screen.getByText('No topics tagged on Codeforces.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Editorial' })).not.toBeInTheDocument();
  });

  it('explains an unknown problem with the PROBLEM_NOT_FOUND message', async () => {
    respondError('get', '/problems/1811/G2', 404, 'PROBLEM_NOT_FOUND');
    renderApp('/problems/1811/G2', { signedIn: true });
    expect(await screen.findByRole('heading', { name: 'Problem not found' })).toBeInTheDocument();
    expect(screen.getByText("We don't have problem 1811/G2. Check the contest number and letter.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse problems' })).toHaveAttribute('href', '/problems');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
