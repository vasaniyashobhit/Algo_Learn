import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { practiceItem, problem } from '../../test/dashboardFixtures.js';
import { server } from '../../test/msw/server.js';
import { respondError, respondOk } from '../../test/msw/scenarios.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { ProblemCard } from './ProblemCard.jsx';

const flowers = problem('474/D', { title: 'Flowers', tags: ['dp', 'math'] });
const renderCard = (props = {}) => renderWithProviders(<ProblemCard problem={flowers} addedFrom="recommendation" {...props} />, { signedIn: true });

describe('ProblemCard', () => {
  it('shows rating, tags, a Codeforces link and Find similar', async () => {
    renderCard({ note: 'Broader pick' });
    expect(screen.getByRole('heading', { name: 'Flowers' })).toBeInTheDocument();
    expect(screen.getByText('1700')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Topics' })).toHaveTextContent('dpmath');
    const cf = screen.getByRole('link', { name: /Codeforces.*opens 474\/D in a new tab/ });
    expect(cf).toHaveAttribute('href', 'https://codeforces.com/problemset/problem/474/D');
    expect(cf).toHaveAttribute('target', '_blank');
    expect(cf).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'Find problems similar to 474/D' })).toHaveAttribute('href', '/problems/474/D/similar');
    expect(screen.getByText(/· Broader pick/).parentElement).toHaveTextContent('474/D · Broader pick');
    expect(await screen.findByRole('button', { name: 'Add 474/D Flowers to practice' })).toBeInTheDocument();
  });

  it('shows "Unrated" instead of a blank rating', () => {
    renderWithProviders(<ProblemCard problem={{ ...flowers, rating: null, tags: [] }} />, { signedIn: true });
    expect(screen.getByText('Unrated')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Topics' })).not.toBeInTheDocument();
  });

  it('adds optimistically, then confirms with a tick', async () => {
    const saved = [];
    server.use(
      http.get('*/api/v1/practice', () => HttpResponse.json({ success: true, data: saved, meta: { total: saved.length } })),
      http.post('*/api/v1/practice', async ({ request }) => {
        const body = await request.json();
        await delay(120);
        saved.push(practiceItem(body.problemId, { addedFrom: body.addedFrom }));
        return HttpResponse.json({ success: true, data: saved.at(-1) }, { status: 201 });
      }),
    );
    renderCard();
    await userEvent.click(await screen.findByRole('button', { name: 'Add 474/D Flowers to practice' }));
    const inList = screen.getByRole('link', { name: '474/D is in your practice list. Open the list' });
    expect(inList).toHaveTextContent('In practice');
    expect(await screen.findByTestId('success-tick')).toBeInTheDocument();
    expect(inList).toHaveTextContent('Added');
  });

  it('rolls the card back and explains when adding fails', async () => {
    respondError('post', '/practice', 404, 'PROBLEM_NOT_FOUND', null, { wait: 80 });
    renderCard();
    await userEvent.click(await screen.findByRole('button', { name: 'Add 474/D Flowers to practice' }));
    expect(screen.getByRole('link', { name: /is in your practice list/ })).toBeInTheDocument();
    expect(await screen.findByText("Couldn't add 474/D to your practice list")).toBeInTheDocument();
    expect(screen.getByText("We don't have that problem. Check the contest number and letter.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add 474/D Flowers to practice' })).toBeInTheDocument();
  });

  it('says "In practice" for a problem already in the list, and handles PRACTICE_ITEM_EXISTS gracefully', async () => {
    respondOk('get', '/practice', [practiceItem('474/D')], { total: 1, status: null });
    const { unmount } = renderCard();
    expect(await screen.findByRole('link', { name: /474\/D is in your practice list/ })).toBeInTheDocument();
    unmount();
    respondOk('get', '/practice', [], { total: 0, status: null });
    respondError('post', '/practice', 409, 'PRACTICE_ITEM_EXISTS', { problemId: '474/D' });
    renderCard();
    await userEvent.click(await screen.findByRole('button', { name: 'Add 474/D Flowers to practice' }));
    expect(await screen.findByText('474/D is already in your practice list.')).toBeInTheDocument();
    expect(screen.queryByText(/Couldn't add/)).not.toBeInTheDocument();
  });
});
