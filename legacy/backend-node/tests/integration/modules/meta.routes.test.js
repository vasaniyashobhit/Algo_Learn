import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../helpers/testApp.js';
import { ALL_TAGS, TOPIC_TAGS } from '../../../src/config/tags.js';

const app = createTestApp();

describe('GET /api/v1/meta/tags', () => {
  it('returns topic tags and all tags', async () => {
    const res = await request(app).get('/api/v1/meta/tags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { topicTags: [...TOPIC_TAGS], allTags: [...ALL_TAGS] },
    });
    expect(res.body.data.topicTags).toHaveLength(36);
    expect(res.body.data.allTags).toHaveLength(37);
  });

  it('returns the error shape for an unknown meta route', async () => {
    const res = await request(app).get('/api/v1/meta/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route GET /api/v1/meta/nope not found',
        details: null,
        requestId: res.headers['x-request-id'],
        stack: expect.any(String),
      },
    });
  });
});
