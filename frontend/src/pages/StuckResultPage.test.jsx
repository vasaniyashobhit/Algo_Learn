import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { respondError, respondOk } from '../test/msw/scenarios.js';
import { renderApp } from '../test/renderWithProviders.jsx';
import { fallbackResult, STUCK_ID, stuckResult } from '../test/stuckFixtures.js';

const open = (result) => {
  respondOk('get', `/stuck/${STUCK_ID}`, result, undefined, { wait: 30 });
  renderApp(`/stuck/${STUCK_ID}`, { signedIn: true });
};

const countPlates = (container) => container.querySelectorAll('.bg-plate').length;

describe('StuckResultPage', () => {
  it('shows a skeleton, then an AI result: header, tags with their source, hints, gap and warm-ups', async () => {
    open(stuckResult());
    expect(await screen.findByLabelText('Loading your stuck result')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Vlad and the Nice Paths (hard version)' })).toBeInTheDocument();
    expect(screen.getByText(/1811\/G2 · from your link/)).toBeInTheDocument();
    expect(screen.getByText('2200')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Detected topics' })).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('From our database')).toBeInTheDocument();
    expect(screen.getByText('AI hints (gemini-3.5-flash-lite). They can be wrong: check each step.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').filter((item) => item.closest('ol[aria-label="Hints"]'))).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Next hint (2 left)' })).toHaveClass('bg-plate');
    expect(screen.queryByRole('status', { name: /AI hints are busy/ })).not.toBeInTheDocument();
    expect(document.title).toBe('Stuck: Vlad and the Nice Paths (hard version) · AlgoLearn');
  });

  it('shows weak and unseen gap cards with strength bars', async () => {
    open(stuckResult());
    const gap = await screen.findByRole('list', { name: 'Gap topics' });
    const cards = within(gap).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('combinatorics');
    expect(cards[0]).toHaveTextContent('0.29Weak');
    expect(cards[1]).toHaveTextContent('combinatorics + dp');
    expect(cards[1]).toHaveTextContent('–Not practised yet');
    expect(within(gap).getAllByTestId('strength-bar')).toHaveLength(2);
    const warmUp = screen.getByRole('list', { name: 'Warm up on the gap' });
    expect(within(warmUp).getByRole('link', { name: /Flowers/ })).toHaveAttribute('href', '/problems/474/D');
    expect(screen.getByText(/A little easier, around 2050/)).toBeInTheDocument();
  });

  it('labels a cached answer and estimated tags', async () => {
    open(stuckResult({ source: 'cache', problem: { ...stuckResult().problem, tagsSource: 'neighbors' } }));
    expect(await screen.findByText('Estimated')).toBeInTheDocument();
    expect(screen.getByText(/AI hints \(gemini-3\.5-flash-lite\)/)).toBeInTheDocument();
  });

  it('puts the fallback notice on the plate and keeps the page useful without AI', async () => {
    open(fallbackResult());
    expect(await screen.findByText('AI hints are busy. Try again in a minute.')).toBeInTheDocument();
    expect(screen.getByText('Built from the topics, your stats and the editorial. No AI involved.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ask again' })).toHaveAttribute('href', '/stuck');
    expect(screen.getByRole('button', { name: 'Next hint (1 left)' })).not.toHaveClass('bg-plate');
    expect(countPlates(screen.getByRole('main'))).toBe(1);
    expect(screen.getByRole('button', { name: 'Show editorial' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Gap topics' })).toBeInTheDocument();
  });

  it('says when nothing could be detected', async () => {
    const problem = { matchedProblemId: null, requestedProblemId: null, title: null, tags: [], tagsSource: null, rating: null };
    open(stuckResult({ inputType: 'text', problem, gap: { message: null, items: [], topics: [] }, similar: { items: [], strategies: ['near_user_rating'] } }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Untitled problem' })).toBeInTheDocument();
    expect(screen.getByText(/No topics found for this one/)).toBeInTheDocument();
    expect(screen.getByText(/No gap found/)).toBeInTheDocument();
    expect(screen.getByText(/We have no similar problems for this one yet/)).toBeInTheDocument();
    expect(screen.getByText(/broader picks/)).toBeInTheDocument();
  });

  it('explains a deleted or unknown result', async () => {
    respondError('get', `/stuck/${STUCK_ID}`, 404, 'STUCK_QUERY_NOT_FOUND');
    renderApp(`/stuck/${STUCK_ID}`, { signedIn: true });
    expect(await screen.findByRole('heading', { name: 'This stuck result is gone' })).toBeInTheDocument();
    expect(screen.getByText("We couldn't find that stuck request. It may have been deleted.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open history' })).toBeInTheDocument();
  });
});
