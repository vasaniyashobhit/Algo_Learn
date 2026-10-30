import { http, HttpResponse } from 'msw';
import { emptySummary, linkedUser, problem, recommendations, recTopic } from '../../dashboardFixtures.js';
import { testUser } from '../../fixtures.js';

const ok = (data, meta) => HttpResponse.json({ success: true, data, ...(meta ? { meta } : {}) });

// A fresh account with no handle: what signup leads to. Tests override with scenarios.js.
export const coldStartTopics = [recTopic('greedy', [problem('1520/E', { title: 'Arranging The Sheep', tags: ['greedy'] })], {
  basis: 'frequent',
  attempted: 0,
  solved: 0,
  strength: 0.5,
  reason: 'New topic for you: greedy shows up in 34% of problems rated around 1200',
})];

export const dashboardHandlers = [
  http.get('*/api/v1/users/me/stats/summary', () => {
    const { data, meta } = emptySummary('NO_HANDLE');
    return ok(data, meta);
  }),
  http.get('*/api/v1/users/me/stats', ({ request }) => {
    const kind = new URL(request.url).searchParams.get('kind') ?? 'single';
    return ok([], { kind, total: 0, lastSyncedAt: null, reason: 'NO_HANDLE' });
  }),
  http.get('*/api/v1/recommendations', () => {
    const { data, meta } = recommendations(coldStartTopics, { userRating: null, coldStart: true, reason: 'NO_HANDLE' });
    return ok(data, meta);
  }),
  http.get('*/api/v1/practice', ({ request }) => ok([], { total: 0, status: new URL(request.url).searchParams.get('status') })),
  http.get('*/api/v1/meta/tags', () => ok({ topicTags: ['dp', 'greedy'], allTags: ['dp', 'greedy', '*special'] })),
  http.put('*/api/v1/users/me/handle', async ({ request }) => {
    const { handle } = await request.json();
    return ok({ ...linkedUser, cfHandle: handle, lastSyncedAt: null });
  }),
  http.delete('*/api/v1/users/me/handle', () => ok(testUser)),
  http.post('*/api/v1/users/me/sync', () =>
    ok({ newSubmissions: 42, totalSubmissions: 1310, lastSyncedAt: new Date().toISOString(), pending: [] }),
  ),
];
