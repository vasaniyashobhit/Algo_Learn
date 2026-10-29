import { describe, expect, it, vi } from 'vitest';
import { getProblem, getSimilar, listProblems } from '../../../../src/modules/problems/problems.controller.js';
import * as problemsService from '../../../../src/modules/problems/problems.service.js';
import { problemsRouter } from '../../../../src/modules/problems/problems.routes.js';

vi.mock('../../../../src/modules/problems/problems.service.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  findSimilarToProblem: vi.fn(),
  problemId: (contestId, index) => `${contestId}/${index}`,
}));

const mockRes = () => ({ json: vi.fn() });
const params = { contestId: '1', index: 'A' };

describe('problems.controller', () => {
  it('listProblems sends items as data plus meta', async () => {
    problemsService.list.mockResolvedValueOnce({ items: [{ id: '1/A' }], meta: { total: 1 } });
    const res = mockRes();
    await listProblems({ query: { page: 1 } }, res, vi.fn());
    expect(problemsService.list).toHaveBeenCalledWith({ page: 1 });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: '1/A' }], meta: { total: 1 } });
  });

  it('getProblem passes contestId and index', async () => {
    problemsService.getById.mockResolvedValueOnce({ id: '1/A' });
    const res = mockRes();
    await getProblem({ params }, res, vi.fn());
    expect(problemsService.getById).toHaveBeenCalledWith('1', 'A');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: '1/A' } });
  });

  it('getSimilar passes the id and query options', async () => {
    problemsService.findSimilarToProblem.mockResolvedValueOnce({ items: [], meta: { strategy: 'primary' } });
    const res = mockRes();
    await getSimilar({ params, query: { k: 5 } }, res, vi.fn());
    expect(problemsService.findSimilarToProblem).toHaveBeenCalledWith('1/A', { k: 5 });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [], meta: { strategy: 'primary' } });
  });

  it.each([
    ['listProblems', listProblems, 'list', { query: {} }],
    ['getProblem', getProblem, 'getById', { params }],
    ['getSimilar', getSimilar, 'findSimilarToProblem', { params, query: {} }],
  ])('%s forwards service errors to next', async (_name, handler, method, req) => {
    const err = new Error('boom');
    problemsService[method].mockRejectedValueOnce(err);
    const next = vi.fn();
    const res = mockRes();
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('problems.routes', () => {
  it('registers the three public GET routes', () => {
    const paths = problemsRouter.stack.map((layer) => layer.route?.path);
    expect(paths).toEqual(['/', '/:contestId/:index', '/:contestId/:index/similar']);
  });
});
