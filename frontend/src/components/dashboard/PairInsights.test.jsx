import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { topicStat } from '../../test/dashboardFixtures.js';
import { respondError, useSyncedAccount } from '../../test/msw/scenarios.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { PairInsights } from './PairInsights.jsx';

const renderPairs = () => renderWithProviders(<PairInsights />, { signedIn: true });

describe('PairInsights', () => {
  it('shows a skeleton, then the pairs that struggle and hold up together', async () => {
    useSyncedAccount();
    renderPairs();
    expect(screen.getByLabelText('Loading topic pairs')).toBeInTheDocument();
    const weak = await screen.findByRole('list', { name: 'Struggle together' });
    expect(within(weak).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'bitmasks + dp0.212 of 8 solved',
      'dsu + graphs0.302 of 5 solved',
    ]);
    const strong = screen.getByRole('list', { name: 'Hold up together' });
    expect(within(strong).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText(/dp \+ graphs/)).not.toBeInTheDocument();
  });

  it('hides a group that has no pairs', async () => {
    useSyncedAccount({ pairs: [topicStat('dp+math', { strength: 0.7, attempted: 4 })] });
    renderPairs();
    expect(await screen.findByRole('list', { name: 'Hold up together' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Struggle together' })).not.toBeInTheDocument();
  });

  it('explains what counts as a pair when there are none yet', async () => {
    useSyncedAccount({ pairs: [topicStat('dp+graphs', { attempted: 2 })] });
    renderPairs();
    expect(await screen.findByText(/No pairs yet\. A pair such as dp \+ bitmasks counts once you have tried 3/)).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    respondError('get', '/users/me/stats', 500, 'INTERNAL_ERROR');
    renderPairs();
    expect(await screen.findByRole('heading', { name: "Topic pairs didn't load" })).toBeInTheDocument();
  });
});
