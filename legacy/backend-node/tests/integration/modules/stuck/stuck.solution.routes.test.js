import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { STATEMENT, coachAnswer, fakeLlm } from '../../../helpers/stuck.js';
import { STUCK_PATH, postStuck, stuckApp, stuckUser } from '../../../helpers/stuckRoutes.js';
import { STUCK_FALLBACK_NOTICE } from '../../../../src/config/constants.js';

useTestDB();

const solutionOf = async (app, auth, body) => {
  const { id } = (await postStuck(app, auth, body)).body.data;
  return request(app).get(`${STUCK_PATH}/${id}/solution`).set(auth);
};

describe('GET /api/v1/stuck/:id/solution (hints first, solution on request)', () => {
  it('returns the full AI solution and the editorial when both exist', async () => {
    await seedProblems([problemAt('1/A', { title: 'Theatre Square', editorial: '  Ceil both sides.  ' })]);
    const app = stuckApp({ llm: fakeLlm({ coach: { answer: coachAnswer(), source: 'ai' } }) });
    const { auth } = await stuckUser(app);
    const res = await solutionOf(app, auth, { inputType: 'url', url: 'https://codeforces.com/contest/1/problem/A' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: expect.any(String), kind: 'ai', editorial: 'Ceil both sides.', notice: null, similarWithEditorial: [],
      solution: {
        approach: 'Multiply ceil(n/a) by ceil(m/a).', solutionSteps: ['Read input', 'Print the product'],
        complexity: 'O(1)', code: 'int main() {}', pitfalls: ['Use 64-bit integers'],
      },
    });
  });

  it('returns the editorial when the AI was unavailable', async () => {
    await seedProblems([problemAt('1/A', { title: 'Theatre Square', editorial: 'Ceil both sides.' })]);
    const app = stuckApp();
    const { auth } = await stuckUser(app);
    const res = await solutionOf(app, auth, { inputType: 'text', text: STATEMENT });
    expect(res.body.data).toMatchObject({ kind: 'editorial', solution: null, editorial: 'Ceil both sides.', notice: null });
  });

  it('returns kind none with the notice and similar problems that have editorials', async () => {
    await seedProblems([problemAt('7/A', { tags: ['math'], editorial: 'E' }), problemAt('8/A', { tags: ['math'] })]);
    const app = stuckApp({ llm: fakeLlm({ coach: { answer: coachAnswer({ approach: '' }), source: 'ai' } }) });
    const { auth } = await stuckUser(app);
    const res = await solutionOf(app, auth, { inputType: 'text', text: 'Unknown statement about numbers and sums, long enough.' });
    expect(res.body.data).toMatchObject({ kind: 'none', solution: null, editorial: null, notice: STUCK_FALLBACK_NOTICE });
    expect(res.body.data.similarWithEditorial.map(({ id }) => id)).toEqual(['7/A']);
  });

  it('requires auth', async () => {
    expectErrorShape(await request(stuckApp()).get(`${STUCK_PATH}/${'a'.repeat(24)}/solution`), 401, 'AUTH_REQUIRED');
  });
});
