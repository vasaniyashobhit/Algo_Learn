import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { problem } from '../../test/dashboardFixtures.js';
import { server } from '../../test/msw/server.js';
import { fetchSimilar } from './problems.api.js';

describe('problems endpoint', () => {
  it('fetchSimilar asks for k results and keeps the strategies', async () => {
    let url;
    server.use(
      http.get('*/api/v1/problems/1950/F2/similar', ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({ success: true, data: [problem('1/A')], meta: { strategies: ['primary'] } });
      }),
    );
    const answer = await fetchSimilar('1950/F2', { k: 6 });
    expect(url.searchParams.get('k')).toBe('6');
    expect(answer).toEqual({ data: [problem('1/A')], meta: { strategies: ['primary'] } });
  });
});
