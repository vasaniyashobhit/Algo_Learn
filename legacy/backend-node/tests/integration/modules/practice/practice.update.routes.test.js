import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { PRACTICE, addItem, expectItem, practiceApp, practiceUser } from '../../../helpers/practice.js';
import { PracticeItem } from '../../../../src/modules/practice/practiceItem.model.js';

useTestDB();

const withItem = async () => {
  await seedProblems([problemAt('4/B1')]);
  const app = practiceApp();
  const { auth } = await practiceUser(app);
  await addItem(app, auth, { problemId: '4/B1', addedFrom: 'similar' });
  return { app, auth };
};

describe('PATCH /api/v1/practice/:contestId/:index', () => {
  it('updates the status and returns the full item (index is case-insensitive)', async () => {
    const { app, auth } = await withItem();
    const res = await request(app).patch(`${PRACTICE}/4/b1`).set(auth).send({ status: 'skipped' });
    expect(res.status).toBe(200);
    expectItem(res.body.data, { problemId: '4/B1', status: 'skipped', addedFrom: 'similar' });
  });

  it('answers 404 NOT_FOUND for a problem that is not in the list', async () => {
    const { app, auth } = await withItem();
    expectErrorShape(await request(app).patch(`${PRACTICE}/5/A`).set(auth).send({ status: 'solved' }), 404, 'NOT_FOUND');
  });

  it('answers 400 VALIDATION_FAILED for a bad status, extra fields or bad params', async () => {
    const { app, auth } = await withItem();
    const res = await request(app).patch(`${PRACTICE}/0/a-b`).set(auth).send({ status: 'done', addedFrom: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map(({ field }) => field).toSorted())
      .toEqual(['body', 'body.status', 'params.contestId', 'params.index']);
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await request(practiceApp()).patch(`${PRACTICE}/1/A`).send({ status: 'todo' }), 401, 'AUTH_REQUIRED');
  });
});

describe('DELETE /api/v1/practice/:contestId/:index', () => {
  it('removes the item and returns it', async () => {
    const { app, auth } = await withItem();
    const res = await request(app).delete(`${PRACTICE}/4/B1`).set(auth);
    expect(res.status).toBe(200);
    expectItem(res.body.data, { problemId: '4/B1', addedFrom: 'similar' });
    expect(await PracticeItem.countDocuments()).toBe(0);
  });

  it('answers 404 NOT_FOUND when the item does not exist (e.g. a second delete)', async () => {
    const { app, auth } = await withItem();
    await request(app).delete(`${PRACTICE}/4/B1`).set(auth);
    expectErrorShape(await request(app).delete(`${PRACTICE}/4/B1`).set(auth), 404, 'NOT_FOUND');
  });

  it('answers 400 for bad params and 401 without a token', async () => {
    const { app, auth } = await withItem();
    expect((await request(app).delete(`${PRACTICE}/x/A`).set(auth)).status).toBe(400);
    expectErrorShape(await request(app).delete(`${PRACTICE}/4/B1`), 401, 'AUTH_REQUIRED');
  });
});
