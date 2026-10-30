import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { problem } from '../test/dashboardFixtures.js';
import { respondError, respondOk } from '../test/msw/scenarios.js';
import { renderApp } from '../test/renderWithProviders.jsx';

const meta = (strategies) => ({ strategy: strategies[0], strategies, problem: { id: '474/D', title: 'Flowers', rating: 1700, tags: ['dp'] } });

describe('SimilarPage', () => {
  it('shows a skeleton, then similar problems as cards', async () => {
    respondOk('get', '/problems/474/D/similar', [problem('1/A', { title: 'Theatre Square' }), problem('2/B')], meta(['primary']));
    renderApp('/problems/474/D/similar', { signedIn: true });
    expect(await screen.findByLabelText('Loading your next topics')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Similar to Flowers' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.queryByText(/Few close matches exist/)).not.toBeInTheDocument();
    expect(document.title).toBe('Similar to 474/D · AlgoLearn');
  });

  it('says when some results are broader matches', async () => {
    respondOk('get', '/problems/474/D/similar', [problem('1/A')], meta(['primary', 'widened_window']));
    renderApp('/problems/474/D/similar', { signedIn: true });
    expect(await screen.findByText(/Few close matches exist/)).toBeInTheDocument();
  });

  it('is never blank when nothing is similar', async () => {
    respondOk('get', '/problems/474/D/similar', [], meta(['near_user_rating']));
    renderApp('/problems/474/D/similar', { signedIn: true });
    expect(await screen.findByText('We have no other problems to compare with yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the dashboard' })).toBeInTheDocument();
  });

  it('explains an unknown problem', async () => {
    respondError('get', '/problems/474/D/similar', 404, 'PROBLEM_NOT_FOUND');
    renderApp('/problems/474/D/similar', { signedIn: true });
    expect(await screen.findByRole('heading', { name: "We couldn't find problems similar to 474/D" })).toBeInTheDocument();
    expect(screen.getByText("We don't have that problem. Check the contest number and letter.")).toBeInTheDocument();
  });
});
