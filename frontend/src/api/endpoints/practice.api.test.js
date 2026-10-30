import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { practiceItem } from '../../test/dashboardFixtures.js';
import { server } from '../../test/msw/server.js';
import { addPractice, fetchPractice, practicePath, removePractice, updatePractice } from './practice.api.js';

const capture = (method, path) => {
  const seen = {};
  server.use(
    http[method](`*/api/v1${path}`, async ({ request }) => {
      seen.url = new URL(request.url);
      seen.body = request.method === 'GET' || request.method === 'DELETE' ? null : await request.json();
      return HttpResponse.json({ success: true, data: practiceItem('1950/F2'), meta: { total: 1 } });
    }),
  );
  return seen;
};

describe('practice endpoints', () => {
  it('addresses an item by its contest/index id', () => {
    expect(practicePath('1950/F2')).toBe('/api/v1/practice/1950/F2');
  });

  it('lists with an optional status filter', async () => {
    const seen = capture('get', '/practice');
    await fetchPractice('todo');
    expect(seen.url.searchParams.get('status')).toBe('todo');
    const all = await fetchPractice(null);
    expect(seen.url.search).toBe('');
    expect(all.meta).toEqual({ total: 1 });
  });

  it('adds with addedFrom (manual by default)', async () => {
    const seen = capture('post', '/practice');
    await addPractice({ problemId: '1950/F2', addedFrom: 'similar' });
    expect(seen.body).toEqual({ problemId: '1950/F2', addedFrom: 'similar' });
    await addPractice({ problemId: '1950/F2' });
    expect(seen.body.addedFrom).toBe('manual');
  });

  it('patches the status and deletes by id', async () => {
    const patch = capture('patch', '/practice/1950/F2');
    await expect(updatePractice({ problemId: '1950/F2', status: 'solved' })).resolves.toMatchObject({ problemId: '1950/F2' });
    expect(patch.body).toEqual({ status: 'solved' });
    const del = capture('delete', '/practice/1950/F2');
    await removePractice({ problemId: '1950/F2' });
    expect(del.url.pathname).toBe('/api/v1/practice/1950/F2');
  });
});
