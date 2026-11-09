import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '../../../src/middlewares/validate.js';
import { createMiniApp } from '../../helpers/testApp.js';

const schemas = {
  params: z.object({ contestId: z.coerce.number().int().positive() }),
  query: z.object({ limit: z.coerce.number().int().max(50).default(10) }),
  body: z.object({ note: z.string().trim().min(1) }),
};

const app = createMiniApp((a) => {
  a.post('/contests/:contestId', validate(schemas), (req, res) =>
    res.json({ params: req.params, query: req.query, body: req.body }));
});

describe('validate middleware', () => {
  it('replaces params, query and body with parsed values', async () => {
    const res = await request(app).post('/contests/42?limit=5').send({ note: '  hi  ', extra: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ params: { contestId: 42 }, query: { limit: 5 }, body: { note: 'hi' } });
  });

  it('applies schema defaults', async () => {
    const res = await request(app).post('/contests/1').send({ note: 'x' });
    expect(res.body.query).toEqual({ limit: 10 });
  });

  it('reports every failing part with prefixed field names', async () => {
    const res = await request(app).post('/contests/abc?limit=99').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details.map((d) => d.field)).toEqual(['params.contestId', 'query.limit', 'body.note']);
  });

  it('supports async refinements', async () => {
    const asyncApp = createMiniApp((a) => {
      const body = z.object({ handle: z.string() }).refine(async ({ handle }) => handle !== 'taken', {
        message: 'Handle taken', path: ['handle'],
      });
      a.post('/h', validate({ body }), (_req, res) => res.json({ ok: true }));
    });
    const res = await request(asyncApp).post('/h').send({ handle: 'taken' });
    expect(res.body.error.details).toEqual([{ field: 'body.handle', message: 'Handle taken' }]);
    expect((await request(asyncApp).post('/h').send({ handle: 'free' })).body).toEqual({ ok: true });
  });

  it('forwards unexpected schema errors to the error handler', async () => {
    const broken = { safeParseAsync: async () => { throw new Error('schema bug'); } };
    const brokenApp = createMiniApp((a) => a.get('/x', validate({ query: broken }), (_q, r) => r.end()));
    const res = await request(brokenApp).get('/x');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('rejects unsupported request parts at setup time', () => {
    expect(() => validate({ headers: z.object({}) })).toThrow(/unsupported parts headers/);
  });
});
