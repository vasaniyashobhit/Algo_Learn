import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { TEST_CRON_SECRET, createTestApp } from '../../helpers/testApp.js';
import { expectErrorShape } from '../../helpers/auth.js';

const fakeServices = () => ({
  handleService: {},
  syncService: {},
  jobs: { syncAllUsers: { name: 'syncAllUsers', run: vi.fn(() => new Promise(() => {})) } },
});

const trigger = (app) => request(app).post('/api/v1/internal/sync-all');

describe('POST /api/v1/internal/sync-all', () => {
  it('answers 202 at once and starts the job in the background', async () => {
    const services = fakeServices();
    const app = createTestApp({ services });
    const res = await trigger(app).set('x-cron-secret', TEST_CRON_SECRET);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ success: true, data: { started: true, job: 'syncAllUsers' } });
    expect(services.jobs.syncAllUsers.run).toHaveBeenCalledOnce();
  });

  it.each([
    ['missing', undefined],
    ['wrong', 'not-the-secret'],
    ['a prefix of the secret', TEST_CRON_SECRET.slice(0, 5)],
  ])('answers 403 FORBIDDEN when the secret is %s', async (_case, secret) => {
    const services = fakeServices();
    const app = createTestApp({ services });
    const req = trigger(app);
    if (secret) req.set('x-cron-secret', secret);
    expectErrorShape(await req, 403, 'FORBIDDEN');
    expect(services.jobs.syncAllUsers.run).not.toHaveBeenCalled();
  });

  it('answers 403 for every request when no secret is configured', async () => {
    const app = createTestApp({ services: fakeServices(), cronSecret: undefined });
    expectErrorShape(await trigger(app).set('x-cron-secret', ''), 403, 'FORBIDDEN');
  });

  it('does not accept the secret in the query string', async () => {
    const app = createTestApp({ services: fakeServices() });
    const res = await request(app).post(`/api/v1/internal/sync-all?x-cron-secret=${TEST_CRON_SECRET}`);
    expect(res.status).toBe(403);
  });
});
