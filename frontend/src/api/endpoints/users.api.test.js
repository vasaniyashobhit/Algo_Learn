import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { linkedUser } from '../../test/dashboardFixtures.js';
import { testUser } from '../../test/fixtures.js';
import { server } from '../../test/msw/server.js';
import { respondError } from '../../test/msw/scenarios.js';
import { linkHandle, syncNow, unlinkHandle, updateMe } from './users.api.js';

describe('users endpoints', () => {
  it('linkHandle PUTs the handle and returns the linked user', async () => {
    let body;
    server.use(
      http.put('*/api/v1/users/me/handle', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ success: true, data: linkedUser });
      }),
    );
    await expect(linkHandle('ananya_k')).resolves.toEqual(linkedUser);
    expect(body).toEqual({ handle: 'ananya_k' });
  });

  it('linkHandle rejects with the typed ApiError', async () => {
    respondError('put', '/users/me/handle', 404, 'CF_HANDLE_NOT_FOUND');
    await expect(linkHandle('nobody')).rejects.toMatchObject({ code: 'CF_HANDLE_NOT_FOUND', status: 404 });
  });

  it('unlinkHandle DELETEs and returns the user without a handle', async () => {
    await expect(unlinkHandle()).resolves.toEqual(testUser);
  });

  it('syncNow POSTs and returns the sync result', async () => {
    await expect(syncNow()).resolves.toMatchObject({ newSubmissions: 42, pending: [] });
  });

  it('updateMe PATCHes the name', async () => {
    server.use(
      http.patch('*/api/v1/users/me', async ({ request }) =>
        HttpResponse.json({ success: true, data: { ...testUser, ...(await request.json()) } }),
      ),
    );
    await expect(updateMe({ name: 'Ananya Kapoor' })).resolves.toMatchObject({ name: 'Ananya Kapoor' });
  });
});
