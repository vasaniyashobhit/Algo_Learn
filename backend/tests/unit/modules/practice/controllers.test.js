import { describe, expect, it, vi } from 'vitest';
import { createPracticeController } from '../../../../src/modules/practice/practice.controller.js';
import { createRecommendationsController } from '../../../../src/modules/recommendations/recommendations.controller.js';

const fakeRes = () => {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
};
const req = (extra = {}) => ({ user: { id: 'u1' }, params: { contestId: '1', index: 'A' }, query: {}, body: {}, ...extra });

describe('practice controller', () => {
  const service = {
    list: vi.fn(async () => ({ items: [], meta: { total: 0 } })),
    add: vi.fn(async () => ({ problemId: '1/A' })),
    update: vi.fn(async () => ({ status: 'solved' })),
    remove: vi.fn(async () => ({ problemId: '1/A' })),
    verify: vi.fn(async () => ({ verified: false })),
  };
  const c = createPracticeController({ practiceService: service });

  it('passes the user id and the "<contestId>/<index>" id to the service', async () => {
    const res = fakeRes();
    await c.updatePractice(req({ body: { status: 'solved' } }), res, vi.fn());
    expect(service.update).toHaveBeenCalledWith('u1', '1/A', { status: 'solved' });
    await c.removePractice(req(), fakeRes(), vi.fn());
    await c.verifyPractice(req(), fakeRes(), vi.fn());
    expect(service.remove).toHaveBeenCalledWith('u1', '1/A');
    expect(service.verify).toHaveBeenCalledWith('u1', '1/A');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { status: 'solved' } });
  });

  it('answers 201 on add and sends meta on list', async () => {
    const res = fakeRes();
    await c.addPractice(req({ body: { problemId: '1/A' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    const listRes = fakeRes();
    await c.listPractice(req(), listRes, vi.fn());
    expect(listRes.json).toHaveBeenCalledWith({ success: true, data: [], meta: { total: 0 } });
  });

  it('forwards every service error to next', async () => {
    const err = new Error('boom');
    const failing = Object.fromEntries(Object.keys(service).map((key) => [key, vi.fn(async () => { throw err; })]));
    const fc = createPracticeController({ practiceService: failing });
    for (const handler of Object.values(fc)) {
      const next = vi.fn();
      await handler(req(), fakeRes(), next);
      expect(next).toHaveBeenCalledWith(err);
    }
  });
});

describe('recommendations controller', () => {
  it('sends data and meta, and forwards errors', async () => {
    const recommendationsService = { getRecommendations: vi.fn(async () => ({ data: { topics: [] }, meta: { coldStart: true } })) };
    const { getRecommendations } = createRecommendationsController({ recommendationsService });
    const res = fakeRes();
    await getRecommendations(req(), res, vi.fn());
    expect(recommendationsService.getRecommendations).toHaveBeenCalledWith('u1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { topics: [] }, meta: { coldStart: true } });
    const err = new Error('x');
    recommendationsService.getRecommendations.mockRejectedValueOnce(err);
    const next = vi.fn();
    await getRecommendations(req(), fakeRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
