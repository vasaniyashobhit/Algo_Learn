import { describe, expect, it, vi } from 'vitest';
import { createStatsController } from '../../../../src/modules/stats/stats.controller.js';

const req = { user: { id: 'u1' }, query: { kind: 'pair', sort: 'strength', limit: 5 } };
const res = () => ({ json: vi.fn() });

describe('stats controller', () => {
  const statsService = { getStats: vi.fn(), getSummary: vi.fn() };
  const { getMyStats, getMySummary } = createStatsController({ statsService });

  it('getMyStats sends items as data plus meta', async () => {
    statsService.getStats.mockResolvedValueOnce({ items: [{ topicKey: 'dp' }], meta: { total: 1 } });
    const response = res();
    await getMyStats(req, response, vi.fn());
    expect(statsService.getStats).toHaveBeenCalledWith('u1', req.query);
    expect(response.json).toHaveBeenCalledWith({ success: true, data: [{ topicKey: 'dp' }], meta: { total: 1 } });
  });

  it('getMySummary sends data plus meta', async () => {
    statsService.getSummary.mockResolvedValueOnce({ data: { totals: {} }, meta: { reason: 'NO_HANDLE' } });
    const response = res();
    await getMySummary(req, response, vi.fn());
    expect(statsService.getSummary).toHaveBeenCalledWith('u1');
    expect(response.json).toHaveBeenCalledWith({ success: true, data: { totals: {} }, meta: { reason: 'NO_HANDLE' } });
  });

  it.each([
    ['getMyStats', getMyStats, 'getStats'],
    ['getMySummary', getMySummary, 'getSummary'],
  ])('%s forwards errors to next', async (_name, handler, method) => {
    const err = new Error('boom');
    statsService[method].mockRejectedValueOnce(err);
    const next = vi.fn();
    const response = res();
    await handler(req, response, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(response.json).not.toHaveBeenCalled();
  });
});
