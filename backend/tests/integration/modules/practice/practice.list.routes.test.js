import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { PRACTICE, addItem, practiceApp, practiceUser } from '../../../helpers/practice.js';
import { PracticeItem } from '../../../../src/modules/practice/practiceItem.model.js';

useTestDB();

const seeded = async () => {
  await seedProblems([problemAt('1/A'), problemAt('2/A'), problemAt('3/A')]);
  const app = practiceApp();
  const { auth } = await practiceUser(app);
  for (const problemId of ['1/A', '2/A', '3/A']) await addItem(app, auth, { problemId });
  await request(app).patch(`${PRACTICE}/2/A`).set(auth).send({ status: 'solved' });
  return { app, auth };
};

describe('GET /api/v1/practice', () => {
  it('lists the items newest first with meta', async () => {
    const { app, auth } = await seeded();
    const res = await request(app).get(PRACTICE).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.map(({ problemId }) => problemId)).toEqual(['3/A', '2/A', '1/A']);
    expect(res.body.meta).toEqual({ total: 3, status: null });
  });

  it('filters by status', async () => {
    const { app, auth } = await seeded();
    const res = await request(app).get(`${PRACTICE}?status=solved`).set(auth);
    expect(res.body.data.map(({ problemId, status }) => [problemId, status])).toEqual([['2/A', 'solved']]);
    expect(res.body.meta).toEqual({ total: 1, status: 'solved' });
  });

  it("only shows the caller's items, with problem null when the problem is gone", async () => {
    const { app } = await seeded();
    const other = await practiceUser(app);
    expect((await request(app).get(PRACTICE).set(other.auth)).body.data).toEqual([]);
    await PracticeItem.create({ userId: other.user.id, problemId: '77/A' });
    const res = await request(app).get(PRACTICE).set(other.auth);
    expect(res.body.data).toEqual([expect.objectContaining({ problemId: '77/A', problem: null })]);
  });

  it('answers 400 VALIDATION_FAILED for an unknown status', async () => {
    const app = practiceApp();
    const { auth } = await practiceUser(app);
    const res = await request(app).get(`${PRACTICE}?status=done`).set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'query.status' })]);
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await request(practiceApp()).get(PRACTICE), 401, 'AUTH_REQUIRED');
  });
});
