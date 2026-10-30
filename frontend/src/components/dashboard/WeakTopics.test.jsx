import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { syncedSummary } from '../../test/dashboardFixtures.js';
import { respondError, useSyncedAccount } from '../../test/msw/scenarios.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { WeakTopics } from './WeakTopics.jsx';

const renderWeak = () => renderWithProviders(<WeakTopics />, { signedIn: true });

describe('WeakTopics', () => {
  it('shows a skeleton, then the batting card as a table with words next to the numbers', async () => {
    useSyncedAccount();
    renderWeak();
    expect(screen.getByLabelText('Loading weak topics')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Weak topics' });
    expect(screen.getByText('Batting card')).toBeInTheDocument();
    const row = within(table).getByRole('rowheader', { name: 'probabilities' }).closest('tr');
    expect(row).toHaveTextContent('0.18 Weak');
    expect(row).toHaveTextContent('2/6');
    expect(within(table).getByRole('rowheader', { name: 'dsu' }).closest('tr')).toHaveTextContent('0.42 Steady');
  });

  it('explains why nothing is flagged yet', async () => {
    useSyncedAccount({ summary: { ...syncedSummary, data: { ...syncedSummary.data, weakest: [] } } });
    renderWeak();
    expect(await screen.findByText(/Nothing flagged yet\. A topic is judged once you have tried 3 problems/)).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    respondError('get', '/users/me/stats/summary', 500, 'INTERNAL_ERROR', null, { requestId: 'req-weak' });
    renderWeak();
    expect(await screen.findByRole('heading', { name: "Weak topics didn't load" })).toBeInTheDocument();
    expect(screen.getByText('req-weak')).toBeInTheDocument();
  });
});
