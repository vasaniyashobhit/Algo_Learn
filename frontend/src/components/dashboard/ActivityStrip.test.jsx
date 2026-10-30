import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { activity, syncedSummary } from '../../test/dashboardFixtures.js';
import { respondError, useSyncedAccount } from '../../test/msw/scenarios.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { ActivityStrip } from './ActivityStrip.jsx';

const renderStrip = () => renderWithProviders(<ActivityStrip />, { signedIn: true });

describe('ActivityStrip', () => {
  it('shows a skeleton, then five overs of six balls with a plain summary', async () => {
    useSyncedAccount();
    const { container } = renderStrip();
    expect(screen.getByLabelText('Loading the last 30 days')).toBeInTheDocument();
    expect(await screen.findByText('Ball by ball · 5 overs')).toBeInTheDocument();
    const overs = container.querySelectorAll('ol');
    expect(overs).toHaveLength(5);
    expect(container.querySelectorAll('ol > li')).toHaveLength(30);
    expect(screen.getByTitle('Oct 3: 2 accepted of 3')).toHaveTextContent('2');
    expect(screen.getByTitle('Oct 6: 2 tried, none accepted')).toHaveTextContent('W');
    // The best day is inverted ink, never the plate.
    expect(screen.getByTitle('Oct 10: 5 accepted of 6')).toHaveClass('bg-ink');
    expect(screen.getByText(/7 accepted over 3 active days\. Number = accepted that day, W = tried/)).toBeInTheDocument();
  });

  it('offers the same 30 days as an accessible table', async () => {
    useSyncedAccount();
    renderStrip();
    await userEvent.click(await screen.findByRole('button', { name: 'Show as table' }));
    const table = screen.getByRole('table', { name: 'Submissions per day over the last 30 days, oldest first' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(31);
    const row = within(table).getByRole('rowheader', { name: 'Oct 6' }).closest('tr');
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['2', '0', '2 tried, none accepted']);
  });

  it('never blank: a quiet month gets dots and an encouraging next step', async () => {
    useSyncedAccount({ summary: { ...syncedSummary, data: { ...syncedSummary.data, activity: activity() } } });
    const { container } = renderStrip();
    expect(await screen.findByText(/No submissions in the last 30 days\. A quiet stretch is fine/)).toBeInTheDocument();
    expect(container.querySelectorAll('ol > li')).toHaveLength(30);
  });

  it('shows an error with a retry', async () => {
    respondError('get', '/users/me/stats/summary', 500, 'INTERNAL_ERROR');
    renderStrip();
    expect(await screen.findByRole('heading', { name: "Your last 30 days didn't load" })).toBeInTheDocument();
  });
});
