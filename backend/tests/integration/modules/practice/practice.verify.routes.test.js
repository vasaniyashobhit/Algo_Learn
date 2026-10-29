import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { problemAt, seedProblems } from '../../../helpers/problems.js';
import { cfSubmission, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { PRACTICE, expectItem, practiceApp, practiceUser } from '../../../helpers/practice.js';

useTestDB();

const users = { tourist: cfUser('tourist') };
const on = (id, verdict) => cfSubmission(id, { verdict, problem: { contestId: 50, index: 'B', tags: ['dp'], rating: 1500 } });
const VERIFY = `${PRACTICE}/50/b/verify`;

const linked = async (submissions) => {
  await seedProblems([problemAt('50/B')]);
  const app = practiceApp(fakeCfClient({ users, submissions }));
  const { auth } = await practiceUser(app);
  await request(app).put('/api/v1/users/me/handle').set(auth).send({ handle: 'tourist' });
  return { app, auth };
};

describe('POST /api/v1/practice/:contestId/:index/verify', () => {
  it('syncs, finds the OK and returns { verified: true, item }', async () => {
    const { app, auth } = await linked([on(1, 'OK')]);
    const res = await request(app).post(VERIFY).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.verified).toBe(true);
    expectItem(res.body.data.item, { problemId: '50/B', status: 'solved', addedFrom: 'recommendation' });
    const list = await request(app).get(`${PRACTICE}?status=solved`).set(auth);
    expect(list.body.data.map(({ problemId }) => problemId)).toEqual(['50/B']);
  });

  it('answers 200 { verified: false, reason } when not solved or still judging', async () => {
    const { app, auth } = await linked([on(2, 'TESTING'), on(1, 'WRONG_ANSWER')]);
    const res = await request(app).post(VERIFY).set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { verified: false, reason: 'STILL_JUDGING' } });
  });

  it('answers 429 RATE_LIMITED for a second check inside the cooldown when not solved', async () => {
    const { app, auth } = await linked([on(1, 'WRONG_ANSWER')]);
    expect((await request(app).post(VERIFY).set(auth)).body.data.reason).toBe('NOT_SOLVED_YET');
    const res = await request(app).post(VERIFY).set(auth);
    expect(res.status).toBe(429);
    expect(res.body.error).toMatchObject({ code: 'RATE_LIMITED', details: { retryAfterSeconds: expect.any(Number) } });
  });

  it('answers 404 PROBLEM_NOT_FOUND, 400 for bad params, 400 CF_HANDLE_NOT_LINKED', async () => {
    await seedProblems([problemAt('50/B')]);
    const app = practiceApp();
    const { auth } = await practiceUser(app);
    expectErrorShape(await request(app).post(`${PRACTICE}/99/Z/verify`).set(auth), 404, 'PROBLEM_NOT_FOUND');
    expect((await request(app).post(`${PRACTICE}/0/B/verify`).set(auth)).status).toBe(400);
    expectErrorShape(await request(app).post(VERIFY).set(auth), 400, 'CF_HANDLE_NOT_LINKED');
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await request(practiceApp()).post(VERIFY), 401, 'AUTH_REQUIRED');
  });
});
