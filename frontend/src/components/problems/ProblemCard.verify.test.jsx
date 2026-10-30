import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { practiceItem, problem, recommendations, recTopic } from '../../test/dashboardFixtures.js';
import { server } from '../../test/msw/server.js';
import { useSyncedAccount } from '../../test/msw/scenarios.js';
import { renderWithProviders } from '../../test/renderWithProviders.jsx';
import { RecommendationsSection } from '../recommendations/RecommendationsSection.jsx';

const flowers = problem('474/D', { title: 'Flowers' });

const useRecommendedScenario = () => {
  const calls = { recommendations: 0, stats: 0 };
  useSyncedAccount();
  server.use(
    http.get('*/api/v1/recommendations', () => {
      calls.recommendations += 1;
      const { data, meta } = recommendations([recTopic('dp', [flowers])]);
      return HttpResponse.json({ success: true, data, meta });
    }),
    http.get('*/api/v1/users/me/stats/summary', () => {
      calls.stats += 1;
      return HttpResponse.json({ success: true, data: {}, meta: {} });
    }),
    http.post('*/api/v1/practice/474/D/verify', () =>
      HttpResponse.json({ success: true, data: { verified: true, item: practiceItem('474/D', { status: 'solved', problem: flowers }) } }),
    ),
  );
  return calls;
};

describe('"I solved it" on a recommended problem', () => {
  it('confirms the solve on the card, then refreshes the recommendations after the mark', async () => {
    const calls = useRecommendedScenario();
    const { queryClient } = renderWithProviders(<RecommendationsSection />, { signedIn: true });
    queryClient.setQueryData(['stats', 'summary'], { data: {}, meta: {} });
    await userEvent.click(await screen.findByRole('button', { name: 'I solved 474/D: check on Codeforces' }));
    expect(await screen.findByText('Solved on Codeforces')).toBeInTheDocument();
    expect(screen.getByText('474/D verified as solved on Codeforces.')).toBeInTheDocument();
    expect(calls.recommendations).toBe(1);
    await waitFor(() => expect(calls.recommendations).toBe(2), { timeout: 3000 });
    expect(queryClient.getQueryState(['stats', 'summary']).isInvalidated).toBe(true);
  });
});
