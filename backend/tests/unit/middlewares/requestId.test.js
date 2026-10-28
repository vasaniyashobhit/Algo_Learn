import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createMiniApp } from '../../helpers/testApp.js';

const app = createMiniApp((a) => a.get('/id', (req, res) => res.json({ id: req.id })));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('requestId middleware', () => {
  it('generates a UUID and echoes it in X-Request-Id', async () => {
    const res = await request(app).get('/id');
    expect(res.body.id).toMatch(UUID);
    expect(res.headers['x-request-id']).toBe(res.body.id);
  });

  it('generates a different id per request', async () => {
    const [a, b] = await Promise.all([request(app).get('/id'), request(app).get('/id')]);
    expect(a.body.id).not.toBe(b.body.id);
  });

  it('reuses a safe incoming id', async () => {
    const res = await request(app).get('/id').set('X-Request-Id', 'proxy-abc.123');
    expect(res.body.id).toBe('proxy-abc.123');
  });

  it('replaces unsafe or oversized incoming ids', async () => {
    const unsafe = await request(app).get('/id').set('X-Request-Id', '<script>');
    expect(unsafe.body.id).toMatch(UUID);
    const long = await request(app).get('/id').set('X-Request-Id', 'a'.repeat(65));
    expect(long.body.id).toMatch(UUID);
  });
});
