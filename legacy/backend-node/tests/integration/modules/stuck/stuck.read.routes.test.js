import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { makeStuckQuery } from '../../../helpers/factories.js';
import { STATEMENT } from '../../../helpers/stuck.js';
import { STUCK_PATH, postStuck, stuckApp, stuckUser } from '../../../helpers/stuckRoutes.js';
import { StuckQuery } from '../../../../src/modules/stuck/stuckQuery.model.js';

useTestDB();

const seedQueries = (userId, count) => StuckQuery.insertMany(Array.from({ length: count }, (_, i) => makeStuckQuery({
  userId, createdAt: new Date(Date.UTC(2026, 9, 1, i)), result: { problem: { title: `Q${i}` } }, gap: [{ topicKey: 'dp', status: 'weak', strength: 0.1 }],
})));

describe('GET /api/v1/stuck/history', () => {
  it('pages the user\'s queries newest first (20 per page)', async () => {
    const app = stuckApp();
    const { auth, user } = await stuckUser(app);
    await seedQueries(user.id, 22);
    await seedQueries(String((await stuckUser(app)).user.id), 1);
    const first = await request(app).get(`${STUCK_PATH}/history`).set(auth);
    expect(first.status).toBe(200);
    expect(first.body.meta).toEqual({ page: 1, limit: 20, total: 22, totalPages: 2 });
    expect(first.body.data[0]).toEqual({
      id: expect.any(String), inputType: 'text', createdAt: '2026-10-01T21:00:00.000Z', source: 'fallback',
      problem: { title: 'Q21' }, gapTopics: ['dp'],
    });
    const second = await request(app).get(`${STUCK_PATH}/history?page=2`).set(auth);
    expect(second.body.data.map(({ problem }) => problem.title)).toEqual(['Q1', 'Q0']);
  });

  it('validates the page and requires auth', async () => {
    const app = stuckApp();
    const { auth } = await stuckUser(app);
    expect((await request(app).get(`${STUCK_PATH}/history?page=0`).set(auth)).status).toBe(400);
    expectErrorShape(await request(app).get(`${STUCK_PATH}/history`), 401, 'AUTH_REQUIRED');
  });
});

describe('GET/DELETE /api/v1/stuck/:id', () => {
  it('returns the saved result without the solution, then deletes it', async () => {
    const app = stuckApp();
    const { auth } = await stuckUser(app);
    const created = (await postStuck(app, auth, { inputType: 'text', text: STATEMENT })).body.data;
    const res = await request(app).get(`${STUCK_PATH}/${created.id}`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(created);
    expect(res.body.data).not.toHaveProperty('rawInput');
    const removed = await request(app).delete(`${STUCK_PATH}/${created.id}`).set(auth);
    expect(removed.body).toEqual({ success: true, data: { id: created.id, deleted: true } });
    expectErrorShape(await request(app).get(`${STUCK_PATH}/${created.id}`).set(auth), 404, 'STUCK_QUERY_NOT_FOUND');
  });

  it('answers STUCK_QUERY_NOT_FOUND for another user\'s id, an unknown id and a malformed id', async () => {
    const app = stuckApp();
    const owner = await stuckUser(app);
    const other = await stuckUser(app);
    const [query] = await seedQueries(owner.user.id, 1);
    for (const id of [String(query._id), 'f'.repeat(24), 'not-an-id']) {
      expectErrorShape(await request(app).get(`${STUCK_PATH}/${id}`).set(other.auth), 404, 'STUCK_QUERY_NOT_FOUND');
      expectErrorShape(await request(app).delete(`${STUCK_PATH}/${id}`).set(other.auth), 404, 'STUCK_QUERY_NOT_FOUND');
      expectErrorShape(await request(app).get(`${STUCK_PATH}/${id}/solution`).set(other.auth), 404, 'STUCK_QUERY_NOT_FOUND');
    }
    expect(await StuckQuery.countDocuments()).toBe(1);
  });

  it('requires auth', async () => {
    const app = stuckApp();
    expectErrorShape(await request(app).get(`${STUCK_PATH}/${'a'.repeat(24)}`), 401, 'AUTH_REQUIRED');
    expectErrorShape(await request(app).delete(`${STUCK_PATH}/${'a'.repeat(24)}`), 401, 'AUTH_REQUIRED');
  });
});
