import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, onTestFinished } from 'vitest';
import { server } from '../../test/msw/server.js';
import { respondError, respondOk } from '../../test/msw/scenarios.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { aiSolution, STUCK_ID, stuckResult } from '../../test/stuckFixtures.js';
import { SolutionPanel } from './SolutionPanel.jsx';

const PATH = `/stuck/${STUCK_ID}/solution`;

const countRequests = () => {
  const calls = { count: 0 };
  const listener = ({ request }) => {
    if (request.url.endsWith(PATH)) calls.count += 1;
  };
  server.events.on('request:start', listener);
  onTestFinished(() => server.events.removeListener('request:start', listener));
  return calls;
};

const openPanel = async (result = stuckResult()) => {
  renderWithProviders(<SolutionPanel result={result} />, { signedIn: true });
  await userEvent.click(screen.getByRole('button', { name: /Show/ }));
};

describe('SolutionPanel', () => {
  it('fetches nothing until asked, then shows a skeleton and the AI solution', async () => {
    const calls = countRequests();
    respondOk('get', PATH, aiSolution(), undefined, { wait: 40 });
    renderWithProviders(<SolutionPanel result={stuckResult()} />, { signedIn: true });
    const button = screen.getByRole('button', { name: 'Show full solution' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(calls.count).toBe(0);
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Loading the solution')).toBeInTheDocument();
    expect(await screen.findByText(/Written by AI/)).toBeInTheDocument();
    expect(calls.count).toBe(1);
    expect(screen.getByText('dp', { selector: 'strong' })).toBeInTheDocument();
    const steps = screen.getByText('Steps').closest('section');
    expect(within(steps).getAllByRole('listitem')).toHaveLength(2);
    expect(steps.querySelector('.katex')).not.toBeNull();
    expect(screen.getByText('O(n^2)')).toBeInTheDocument();
    expect(screen.getByLabelText('Solution code')).toHaveTextContent('int main() { return 0; }');
    expect(screen.getByText('Take everything modulo 10^9+7.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Editorial' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hide solution' }));
    expect(screen.queryByText(/Written by AI/)).not.toBeInTheDocument();
  });

  it('copies the code with a confirmation', async () => {
    respondOk('get', PATH, aiSolution());
    await openPanel();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Copy code' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe('int main() { return 0; }');
  });

  it('shows the editorial alone when there is no AI solution', async () => {
    respondOk('get', PATH, aiSolution({ kind: 'editorial', solution: null, editorial: 'Use $$$dp$$$ over blocks.' }));
    renderWithProviders(<SolutionPanel result={stuckResult({ hasSolution: false })} />, { signedIn: true });
    await userEvent.click(screen.getByRole('button', { name: 'Show editorial' }));
    expect(await screen.findByRole('heading', { name: 'Editorial' })).toBeInTheDocument();
    expect(screen.queryByText(/Written by AI/)).not.toBeInTheDocument();
  });

  it('points to similar problems with editorials when nothing is stored', async () => {
    const similarWithEditorial = [{ id: '4/A', title: 'Watermelon', hasEditorial: true }];
    respondOk('get', PATH, aiSolution({ kind: 'none', solution: null, editorial: null, notice: 'AI solution temporarily unavailable.', similarWithEditorial }));
    await openPanel(stuckResult({ hasSolution: false, editorialAvailable: false }));
    expect(await screen.findByText('AI solution temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watermelon' })).toHaveAttribute('href', '/problems/4/A');
  });

  it('points to the warm-up problems when no similar problem has an editorial either', async () => {
    respondOk('get', PATH, aiSolution({ kind: 'none', solution: null, editorial: null, notice: null }));
    await openPanel(stuckResult({ hasSolution: false, editorialAvailable: false }));
    expect(await screen.findByText('There is no AI solution or editorial for this one yet.')).toBeInTheDocument();
    expect(screen.getByText(/Try the warm-up problems on the right/)).toBeInTheDocument();
  });

  it('shows an error with a retry, then the solution', async () => {
    respondError('get', PATH, 500, 'INTERNAL_ERROR', null, { requestId: 'req-sol' });
    await openPanel();
    expect(await screen.findByRole('heading', { name: "The solution didn't load" })).toBeInTheDocument();
    expect(screen.getByText('req-sol')).toBeInTheDocument();
    server.use(http.get(`*/api/v1${PATH}`, () => HttpResponse.json({ success: true, data: aiSolution() })));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/Written by AI/)).toBeInTheDocument();
  });
});
