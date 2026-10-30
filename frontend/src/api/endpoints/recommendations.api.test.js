import { describe, expect, it } from 'vitest';
import { respondError } from '../../test/msw/scenarios.js';
import { fetchRecommendations } from './recommendations.api.js';

describe('fetchRecommendations', () => {
  it('turns failures into ApiError', async () => {
    respondError('get', '/recommendations', 500, 'INTERNAL_ERROR', null, { requestId: 'req-rec' });
    await expect(fetchRecommendations()).rejects.toMatchObject({ code: 'INTERNAL_ERROR', requestId: 'req-rec' });
  });
});
