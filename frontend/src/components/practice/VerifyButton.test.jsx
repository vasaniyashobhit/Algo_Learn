import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { practiceItem, problem } from '../../test/dashboardFixtures.js';
import { server } from '../../test/msw/server.js';
import { respondError, respondOk, useSyncedAccount } from '../../test/msw/scenarios.js';
import { renderApp } from '../../test/renderWithProviders.jsx';

const item = practiceItem('474/D', { problem: problem('474/D', { title: 'Flowers' }) });

/** A linked account whose practice list holds 474/D; verify answers with `answer`. */
const useVerifyScenario = (answer) => {
  useSyncedAccount();
  let list = [item];
  server.use(
    http.get('*/api/v1/practice', () => HttpResponse.json({ success: true, data: list, meta: { total: list.length } })),
    http.post('*/api/v1/practice/474/D/verify', () => {
      if (answer.verified) list = [answer.item];
      return HttpResponse.json({ success: true, data: answer });
    }),
  );
  renderApp('/practice', { signedIn: true });
};

const verifyButton = () => screen.findByRole('button', { name: 'I solved 474/D: check on Codeforces' });

describe('VerifyButton ("I solved it")', () => {
  it('moves a verified item to solved with a success mark and a toast', async () => {
    useVerifyScenario({ verified: true, item: { ...item, status: 'solved' } });
    await userEvent.click(await verifyButton());
    expect(await screen.findByText('474/D verified as solved on Codeforces.')).toBeInTheDocument();
    const row = screen.getByRole('link', { name: /Flowers/ }).closest('tr');
    expect(within(row).getByText('Solved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to to-do: 474/D' })).toBeInTheDocument();
  });

  it('says when no accepted submission is found yet', async () => {
    useVerifyScenario({ verified: false, reason: 'NOT_SOLVED_YET' });
    await userEvent.click(await verifyButton());
    expect(await screen.findByText(/We don't see an accepted submission yet/)).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /Flowers/ }).closest('tr')).getByText('To do')).toBeInTheDocument();
  });

  it('says when Codeforces is still judging', async () => {
    useVerifyScenario({ verified: false, reason: 'STILL_JUDGING' });
    await userEvent.click(await verifyButton());
    expect(
      await screen.findByText('Codeforces is still judging your submission — try again in a minute.'),
    ).toBeInTheDocument();
  });

  it('counts down from retryAfterSeconds when rate limited, with the button disabled', async () => {
    useVerifyScenario({ verified: false, reason: 'NOT_SOLVED_YET' });
    respondError('post', '/practice/474/D/verify', 429, 'RATE_LIMITED', { retryAfterSeconds: 3 });
    await userEvent.click(await verifyButton());
    expect(await screen.findByText(/Try again in 3 seconds\./)).toBeInTheDocument();
    expect(await verifyButton()).toBeDisabled();
    expect(await screen.findByText(/Try again in 2 seconds\./, {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('shows other failures as a specific toast', async () => {
    useVerifyScenario({ verified: false, reason: 'NOT_SOLVED_YET' });
    respondError('post', '/practice/474/D/verify', 503, 'CF_UNAVAILABLE');
    await userEvent.click(await verifyButton());
    expect(await screen.findByText(/couldn't check your submission/)).toBeInTheDocument();
  });

  it('is hidden without a linked handle', async () => {
    respondOk('get', '/practice', [item], { total: 1 });
    renderApp('/practice', { signedIn: true });
    expect(await screen.findByRole('button', { name: 'Mark solved: 474/D' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: /I solved 474\/D/ })).not.toBeInTheDocument());
  });
});
