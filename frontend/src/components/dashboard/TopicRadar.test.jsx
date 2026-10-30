import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { radarStats, topicStat } from '../../test/dashboardFixtures.js';
import { installMatchMedia } from '../../test/matchMedia.js';
import { respondError, useSyncedAccount } from '../../test/msw/scenarios.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { TopicRadar } from './TopicRadar.jsx';

const renderRadar = () => renderWithProviders(<TopicRadar />, { signedIn: true });

describe('TopicRadar', () => {
  it('shows a skeleton, then the chart as one labelled image', async () => {
    useSyncedAccount();
    renderRadar();
    expect(screen.getByLabelText('Loading topic strength')).toHaveAttribute('aria-busy', 'true');
    const chart = await screen.findByRole('img', { name: /Strength on your 8 most practised topics/ });
    expect(chart).toHaveAccessibleName(
      'Strength on your 8 most practised topics, from 0 to 1. Weakest: dp 0.38, graphs 0.41.',
    );
    expect(screen.getByText('Wagon wheel')).toBeInTheDocument();
  });

  it('has a real data table as the accessible alternative', async () => {
    useSyncedAccount();
    renderRadar();
    const toggle = await screen.findByRole('button', { name: 'Show as table' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await userEvent.click(toggle);
    const table = screen.getByRole('table', { name: 'Topic strength on your 8 most practised topics' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', table.id);
    expect(screen.getByRole('button', { name: 'Show chart' })).toBe(toggle);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['Topic', 'Strength (0–1)', 'Solved', 'Tried']);
    const dpRow = within(table).getByRole('rowheader', { name: 'dp' }).closest('tr');
    expect(dpRow).toHaveTextContent('0.38 Weak');
    expect(within(table).getAllByRole('rowheader')).toHaveLength(8);
  });

  it('with fewer than 3 topics shows only the table (a polygon needs 3 corners)', async () => {
    useSyncedAccount({ single: [topicStat('dp', { strength: 0.42 }), topicStat('math', { strength: 0.7 })] });
    renderRadar();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'math' }).closest('tr')).toHaveTextContent('0.70 Strong');
  });

  it('guides the user when there are no topics yet', async () => {
    useSyncedAccount({ single: [] });
    renderRadar();
    expect(await screen.findByText(/No topics yet\. Attempt a problem on Codeforces and sync/)).toBeInTheDocument();
  });

  it('shows a specific error with a retry', async () => {
    respondError('get', '/users/me/stats', 503, 'DB_UNAVAILABLE');
    renderRadar();
    expect(await screen.findByRole('heading', { name: "Topic strength didn't load" })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("AlgoLearn can't reach its database right now.");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('draws the chart without animation under reduced motion', async () => {
    installMatchMedia({ reducedMotion: true });
    useSyncedAccount({ single: radarStats });
    renderRadar();
    expect(await screen.findByRole('img')).toBeInTheDocument();
  });
});
