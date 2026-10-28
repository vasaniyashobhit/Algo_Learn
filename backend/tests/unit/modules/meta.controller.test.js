import { describe, expect, it, vi } from 'vitest';
import { getTags } from '../../../src/modules/meta/meta.controller.js';
import * as metaService from '../../../src/modules/meta/meta.service.js';
import { metaRouter } from '../../../src/modules/meta/meta.routes.js';

vi.mock('../../../src/modules/meta/meta.service.js', () => ({ getTags: vi.fn() }));

const mockRes = () => ({ json: vi.fn() });

describe('meta.controller', () => {
  it('sends the service result in the success envelope', async () => {
    const data = { topicTags: ['dp'], allTags: ['dp', '*special'] };
    metaService.getTags.mockResolvedValueOnce(data);
    const res = mockRes();
    await getTags({}, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, data });
  });

  it('forwards service errors to next', async () => {
    const err = new Error('boom');
    metaService.getTags.mockRejectedValueOnce(err);
    const next = vi.fn();
    const res = mockRes();
    await getTags({}, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('meta.routes', () => {
  it('registers GET /tags', () => {
    const route = metaRouter.stack.find((layer) => layer.route?.path === '/tags')?.route;
    expect(route?.methods).toEqual({ get: true });
  });
});
