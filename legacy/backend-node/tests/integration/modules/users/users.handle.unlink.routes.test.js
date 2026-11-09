import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../../helpers/testApp.js';
import { useTestDB } from '../../../helpers/db.js';
import { bearer, expectErrorShape, signupViaApi } from '../../../helpers/auth.js';
import { cfHistory, cfUser, fakeCfClient } from '../../../helpers/codeforces.js';
import { createServices } from '../../../../src/services.js';
import { Submission } from '../../../../src/modules/sync/submission.model.js';

useTestDB();

const client = fakeCfClient({ users: { tourist: cfUser('tourist') }, submissions: cfHistory(4) });
const app = createTestApp({ services: createServices({ client }) });

describe('DELETE /api/v1/users/me/handle', () => {
  it('unlinks the handle and deletes the synced submissions', async () => {
    const { token } = await signupViaApi(app);
    await request(app).put('/api/v1/users/me/handle').set(bearer(token)).send({ handle: 'tourist' });
    await request(app).post('/api/v1/users/me/sync').set(bearer(token));
    expect(await Submission.countDocuments()).toBe(4);
    const res = await request(app).delete('/api/v1/users/me/handle').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ cfHandle: null, cfRating: null, lastSyncedAt: null });
    expect(await Submission.countDocuments()).toBe(0);
  });

  it('is a no-op success when no handle is linked', async () => {
    const { token } = await signupViaApi(app);
    const res = await request(app).delete('/api/v1/users/me/handle').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.cfHandle).toBeNull();
  });

  it('answers 401 AUTH_REQUIRED without a token', async () => {
    expectErrorShape(await request(app).delete('/api/v1/users/me/handle'), 401, 'AUTH_REQUIRED');
  });
});
