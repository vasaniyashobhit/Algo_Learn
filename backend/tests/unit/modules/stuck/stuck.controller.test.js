import { describe, expect, it, vi } from 'vitest';
import { createStuckController } from '../../../../src/modules/stuck/stuck.controller.js';

const fakeRes = () => {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
};
const req = (extra = {}) => ({ user: { id: 'u1' }, params: { id: 'q1' }, query: { page: 2 }, body: {}, ...extra });

describe('stuck controller', () => {
  const service = {
    solve: vi.fn(async () => ({ id: 'q1' })),
    history: vi.fn(async () => ({ items: [], meta: { page: 2 } })),
    get: vi.fn(async () => ({ id: 'q1' })),
    solution: vi.fn(async () => ({ kind: 'ai' })),
    remove: vi.fn(async () => ({ id: 'q1', deleted: true })),
  };
  const c = createStuckController({ stuckService: service });

  it('passes the body fields and the uploaded file to solve and answers 201', async () => {
    const res = fakeRes();
    const file = { buffer: Buffer.from('x'), mimetype: 'image/png' };
    await c.solveStuck(req({ body: { inputType: 'image', text: undefined, url: undefined }, file }), res, vi.fn());
    expect(service.solve).toHaveBeenCalledWith({ userId: 'u1', inputType: 'image', payload: { text: undefined, url: undefined, file } });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'q1' } });
  });

  it('sends the history with meta and the other reads with the user id', async () => {
    const res = fakeRes();
    await c.listStuckHistory(req(), res, vi.fn());
    expect(service.history).toHaveBeenCalledWith('u1', { page: 2 });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [], meta: { page: 2 } });
    await c.getStuck(req(), fakeRes(), vi.fn());
    await c.getStuckSolution(req(), fakeRes(), vi.fn());
    await c.removeStuck(req(), fakeRes(), vi.fn());
    ['get', 'solution', 'remove'].forEach((name) => expect(service[name]).toHaveBeenCalledWith('u1', 'q1'));
  });

  it.each(['solveStuck', 'listStuckHistory', 'getStuck', 'getStuckSolution', 'removeStuck'])(
    '%s forwards errors to next()',
    async (name) => {
      const err = new Error('boom');
      const broken = Object.fromEntries(Object.keys(service).map((key) => [key, vi.fn(async () => { throw err; })]));
      const next = vi.fn();
      await createStuckController({ stuckService: broken })[name](req(), fakeRes(), next);
      expect(next).toHaveBeenCalledWith(err);
    },
  );
});
