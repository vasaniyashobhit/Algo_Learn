import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { syncedSummary, topicStat } from '../../test/dashboardFixtures.js';
import { useSyncedAccount } from '../../test/msw/scenarios.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { LastResults } from './LastResults.jsx';
import { WeakTopics } from './WeakTopics.jsx';

const results = [
  { problemId: '1/A', solved: false },
  { problemId: '2/A', solved: true },
  { problemId: '3/A', solved: false },
];

describe('LastResults', () => {
  it('draws one mark per attempt and says them in words', () => {
    render(<LastResults results={results} />);
    const marks = screen.getByRole('img', { name: 'Last 3, newest first: not solved, solved, not solved' });
    expect(marks.children).toHaveLength(3);
  });

  it('says when there are no attempts', () => {
    render(<LastResults />);
    expect(screen.getByText('No attempts')).toBeInTheDocument();
  });

  it('shows a Last 5 column on the weak topics table, with a legend', async () => {
    const weakest = [topicStat('probabilities', { strength: 0.18, solved: 2, attempted: 6, lastResults: results })];
    useSyncedAccount({ summary: { ...syncedSummary, data: { ...syncedSummary.data, weakest } } });
    renderWithProviders(<WeakTopics />, { signedIn: true });
    const table = await screen.findByRole('table', { name: 'Weak topics' });
    expect(within(table).getByRole('columnheader', { name: 'Last 5' })).toBeInTheDocument();
    expect(within(table).getByRole('img', { name: /Last 3, newest first: not solved, solved/ })).toBeInTheDocument();
    expect(screen.getByText('Last 5 reads newest first')).toBeInTheDocument();
  });
});
