import { http, HttpResponse } from 'msw';
import { TEST_TOKEN, testUser } from '../../fixtures.js';

// Default happy-path handlers; tests override them with server.use(...).
export const authHandlers = [
  http.post('*/api/v1/auth/login', () => HttpResponse.json({ success: true, data: { token: TEST_TOKEN, user: testUser } })),
  http.post('*/api/v1/auth/signup', async ({ request }) => {
    const body = await request.json();
    const user = { ...testUser, name: body.name, email: body.email };
    return HttpResponse.json({ success: true, data: { token: TEST_TOKEN, user } }, { status: 201 });
  }),
  http.get('*/api/v1/auth/me', () => HttpResponse.json({ success: true, data: testUser })),
];
