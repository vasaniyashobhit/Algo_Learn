import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { practiceItem, problem } from '../../test/dashboardFixtures.js';
import { server } from '../../test/msw/server.js';
import { respondError } from '../../test/msw/scenarios.js';
import { renderApp } from '../../test/renderWithProviders.jsx';

/** A tiny in-memory practice API so refetches after onSettled agree with the changes. */
const servePractice = () => {
  let list = [practiceItem('474/D', { problem: problem('474/D', { title: 'Flowers' }) })];
  server.use(
    http.get('*/api/v1/practice', () => HttpResponse.json({ success: true, data: list, meta: { total: list.length } })),
    http.patch('*/api/v1/practice/474/D', async ({ request }) => {
      const { status } = await request.json();
      await delay(120);
      list = list.map((item) => ({ ...item, status }));
      return HttpResponse.json({ success: true, data: list[0] });
    }),
    http.delete('*/api/v1/practice/474/D', async () => {
      await delay(120);
      const [removed] = list;
      list = [];
      return HttpResponse.json({ success: true, data: removed });
    }),
  );
};

const row = () => screen.getByRole('link', { name: /Flowers/ }).closest('tr');

describe('StatusActions', () => {
  it('marks solved at once, then confirms with a tick', async () => {
    servePractice();
    renderApp('/practice', { signedIn: true });
    await userEvent.click(await screen.findByRole('button', { name: 'Mark solved: 474/D' }));
    expect(within(row()).getByText('Solved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to to-do: 474/D' })).toBeInTheDocument();
    expect(await screen.findByTestId('success-tick')).toBeInTheDocument();
    expect(within(row()).getByRole('status')).toHaveTextContent('Marked solved');
  });

  it('removes at once', async () => {
    servePractice();
    renderApp('/practice', { signedIn: true });
    await userEvent.click(await screen.findByRole('button', { name: 'Remove 474/D from practice' }));
    expect(screen.queryByRole('link', { name: /Flowers/ })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Nothing queued yet' })).toBeInTheDocument();
  });

  it('puts the row back with a specific toast when the change fails', async () => {
    servePractice();
    respondError('patch', '/practice/474/D', 503, 'DB_UNAVAILABLE', null, { wait: 120 });
    renderApp('/practice', { signedIn: true });
    await userEvent.click(await screen.findByRole('button', { name: 'Skip: 474/D' }));
    expect(within(row()).getByText('Skipped')).toBeInTheDocument();
    expect(await screen.findByText("Couldn't mark 474/D as skipped")).toBeInTheDocument();
    await waitFor(() => expect(within(row()).getByText('To do')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Skip: 474/D' })).toBeInTheDocument();
  });

  it('puts a removed row back when the server refuses', async () => {
    servePractice();
    respondError('delete', '/practice/474/D', 500, 'INTERNAL_ERROR', null, { wait: 120, requestId: 'req-rm' });
    renderApp('/practice', { signedIn: true });
    await userEvent.click(await screen.findByRole('button', { name: 'Remove 474/D from practice' }));
    expect(await screen.findByText("Couldn't remove 474/D from your practice list")).toBeInTheDocument();
    expect(screen.getByText(/Reference: req-rm/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Flowers/ })).toBeInTheDocument();
  });
});
