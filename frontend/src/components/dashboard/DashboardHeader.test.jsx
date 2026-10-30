import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { linkedUser, syncedSummary } from '../../test/dashboardFixtures.js';
import { installMatchMedia } from '../../test/matchMedia.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { DashboardHeader } from './DashboardHeader.jsx';
import { DashboardHeaderSkeleton } from './DashboardHeaderSkeleton.jsx';
import { LastSynced } from './LastSynced.jsx';

const tileValue = (key) => within(screen.getByTestId(`tile-${key}`)).getByRole('definition');

describe('DashboardHeader', () => {
  it('shows the handle, rank, sync time and five figures with plain labels', () => {
    installMatchMedia({ reducedMotion: true });
    renderWithProviders(<DashboardHeader summary={syncedSummary} />);
    expect(screen.getByRole('heading', { level: 1, name: 'ananya_k' })).toBeInTheDocument();
    expect(screen.getByText(/Specialist ·/)).toBeInTheDocument();
    const figures = screen.getByLabelText('Your numbers');
    expect(within(figures).getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Rating',
      'Solved',
      'Tried, not solved',
      'Active days · 30 d',
      'Topics tried',
    ]);
    expect(tileValue('rating')).toHaveTextContent('1487');
    expect(tileValue('solved')).toHaveTextContent('412');
    expect(tileValue('notSolved')).toHaveTextContent('37');
  });

  it('says so when there is no rating yet, and can hide the figures', () => {
    const summary = { ...syncedSummary, meta: { ...syncedSummary.meta, cfRating: null } };
    const { unmount } = renderWithProviders(<DashboardHeader summary={summary} />);
    expect(screen.getByText('No rating yet')).toBeInTheDocument();
    expect(screen.getByText(/No rated contest yet ·/)).toBeInTheDocument();
    unmount();
    renderWithProviders(<DashboardHeader summary={syncedSummary} showTiles={false} />);
    expect(screen.queryByLabelText('Your numbers')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument();
  });

  it('has a matching skeleton', () => {
    renderWithProviders(<DashboardHeaderSkeleton />);
    const skeleton = screen.getByLabelText('Loading your scoreboard');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(within(skeleton).getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(12);
  });
});

describe('LastSynced', () => {
  it('shows a relative time with the exact time on hover, or "Not synced yet"', () => {
    const { container, unmount } = renderWithProviders(<LastSynced at={linkedUser.lastSyncedAt} />);
    const time = container.querySelector('time');
    expect(time).toHaveAttribute('dateTime', linkedUser.lastSyncedAt);
    expect(time.title).not.toBe('');
    unmount();
    renderWithProviders(<LastSynced at={null} />);
    expect(screen.getByText('Not synced yet')).toBeInTheDocument();
  });
});
