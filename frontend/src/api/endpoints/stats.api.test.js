import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server.js';
import { fetchRecommendations } from './recommendations.api.js';
import { fetchStatsSummary, fetchTopicStats } from './stats.api.js';

describe('stats endpoints', () => {
  it('fetchStatsSummary keeps meta so NO_HANDLE reaches the UI', async () => {
    const answer = await fetchStatsSummary();
    expect(answer.meta.reason).toBe('NO_HANDLE');
    expect(answer.data.activity).toHaveLength(30);
  });

  it('fetchTopicStats sends kind, sort and limit', async () => {
    let params;
    server.use(
      http.get('*/api/v1/users/me/stats', ({ request }) => {
        params = Object.fromEntries(new URL(request.url).searchParams);
        return HttpResponse.json({ success: true, data: [] });
      }),
    );
    await expect(fetchTopicStats({ kind: 'pair', sort: 'attempted', limit: 100 })).resolves.toEqual({ data: [], meta: {} });
    expect(params).toEqual({ kind: 'pair', sort: 'attempted', limit: '100' });
    await fetchTopicStats();
    expect(params).toEqual({ kind: 'single', sort: 'strength', limit: '50' });
  });
});

describe('recommendations endpoint', () => {
  it('returns topics and meta', async () => {
    const answer = await fetchRecommendations();
    expect(answer.data.topics[0].topic).toBe('greedy');
    expect(answer.meta).toMatchObject({ coldStart: true, reason: 'NO_HANDLE' });
  });
});
