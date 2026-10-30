import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server.js';
import { aiSolution, historyItem, STUCK_ID, stuckResult } from '../../test/stuckFixtures.js';
import { verifyPractice } from './practice.api.js';
import { fetchProblem, fetchProblems } from './problems.api.js';
import { deleteStuck, fetchStuck, fetchStuckHistory, fetchStuckSolution, submitStuck } from './stuck.api.js';

const ok = (data, meta) => HttpResponse.json({ success: true, data, ...(meta ? { meta } : {}) });

describe('stuck endpoints', () => {
  it('posts the multipart form and unwraps the result', async () => {
    let type;
    server.use(
      http.post('*/api/v1/stuck', ({ request }) => {
        type = request.headers.get('content-type');
        return ok(stuckResult());
      }),
    );
    const form = new FormData();
    form.append('inputType', 'text');
    expect((await submitStuck(form)).id).toBe(STUCK_ID);
    expect(type).toMatch(/^multipart\/form-data/);
  });

  it('reads one result, its solution, and a history page with meta', async () => {
    let page;
    server.use(
      http.get(`*/api/v1/stuck/${STUCK_ID}`, () => ok(stuckResult())),
      http.get(`*/api/v1/stuck/${STUCK_ID}/solution`, () => ok(aiSolution())),
      http.get('*/api/v1/stuck/history', ({ request }) => {
        page = new URL(request.url).searchParams.get('page');
        return ok([historyItem('a', 'A')], { page: 2, totalPages: 3 });
      }),
    );
    expect((await fetchStuck(STUCK_ID)).source).toBe('ai');
    expect((await fetchStuckSolution(STUCK_ID)).kind).toBe('ai');
    expect(await fetchStuckHistory(2)).toEqual({ data: [historyItem('a', 'A')], meta: { page: 2, totalPages: 3 } });
    expect(page).toBe('2');
  });

  it('deletes by id', async () => {
    server.use(http.delete(`*/api/v1/stuck/${STUCK_ID}`, () => ok({ id: STUCK_ID, deleted: true })));
    expect(await deleteStuck(STUCK_ID)).toEqual({ id: STUCK_ID, deleted: true });
  });
});

describe('problem and verify endpoints', () => {
  it('lists problems with params and reads one problem', async () => {
    let params;
    server.use(
      http.get('*/api/v1/problems', ({ request }) => {
        params = Object.fromEntries(new URL(request.url).searchParams);
        return ok([], { total: 0 });
      }),
      http.get('*/api/v1/problems/1/A', () => ok({ id: '1/A', title: 'Theatre Square' })),
    );
    expect(await fetchProblems({ tags: 'dp', page: 2 })).toEqual({ data: [], meta: { total: 0 } });
    expect(params).toEqual({ tags: 'dp', page: '2' });
    expect((await fetchProblem('1/A')).title).toBe('Theatre Square');
  });

  it('posts "I solved it" to the verify route', async () => {
    server.use(http.post('*/api/v1/practice/474/D/verify', () => ok({ verified: false, reason: 'STILL_JUDGING' })));
    expect(await verifyPractice({ problemId: '474/D' })).toEqual({ verified: false, reason: 'STILL_JUDGING' });
  });
});
