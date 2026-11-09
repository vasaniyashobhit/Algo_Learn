import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { PRACTICE, addItem, expectItem, practiceApp, practiceUser } from '../../../helpers/practice.js';

useTestDB();

describe('POST /api/v1/practice', () => {
  it('adds an item (201) and returns the full item with its problem', async () => {
    await seedProblems([problemAt('4/B1')]);
    const app = practiceApp();
    const { auth } = await practiceUser(app);
    const res = await addItem(app, auth, { problemId: '4/b1', addedFrom: 'recommendation' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expectItem(res.body.data, { problemId: '4/B1', addedFrom: 'recommendation' });
    expect(res.body.data.problem.title).toBe('Title 4/B1');
  });

  it('defaults addedFrom to manual', async () => {
    await seedProblems([problemAt('1/A')]);
    const app = practiceApp();
    const { auth } = await practiceUser(app);
    expectItem((await addItem(app, auth, { problemId: '1/A' })).body.data, { problemId: '1/A' });
  });

  it('answers 409 PRACTICE_ITEM_EXISTS for a second add of the same problem', async () => {
    await seedProblems([problemAt('1/A')]);
    const app = practiceApp();
    const { auth } = await practiceUser(app);
    await addItem(app, auth, { problemId: '1/A' });
    expectErrorShape(await addItem(app, auth, { problemId: '1/A' }), 409, 'PRACTICE_ITEM_EXISTS', { problemId: '1/A' });
  });

  it('lets two users add the same problem', async () => {
    await seedProblems([problemAt('1/A')]);
    const app = practiceApp();
    const first = await practiceUser(app);
    const second = await practiceUser(app);
    expect((await addItem(app, first.auth, { problemId: '1/A' })).status).toBe(201);
    expect((await addItem(app, second.auth, { problemId: '1/A' })).status).toBe(201);
  });

  it('answers 404 PROBLEM_NOT_FOUND for an unknown problem', async () => {
    const app = practiceApp();
    const { auth } = await practiceUser(app);
    expectErrorShape(await addItem(app, auth, { problemId: '99/Z' }), 404, 'PROBLEM_NOT_FOUND');
  });

  it('answers 400 VALIDATION_FAILED for a bad id, origin or extra field', async () => {
    const app = practiceApp();
    const { auth } = await practiceUser(app);
    const res = await addItem(app, auth, { problemId: 'nope', addedFrom: 'friend', status: 'solved' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details.map(({ field }) => field).toSorted()).toEqual(['body', 'body.addedFrom', 'body.problemId']);
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await request(practiceApp()).post(PRACTICE).send({ problemId: '1/A' }), 401, 'AUTH_REQUIRED');
  });
});
