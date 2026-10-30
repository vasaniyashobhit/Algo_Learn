import { describe, expect, it } from 'vitest';
import { fetchTags } from './meta.api.js';

describe('meta endpoint', () => {
  it('fetchTags returns both tag lists', async () => {
    await expect(fetchTags()).resolves.toEqual({ topicTags: ['dp', 'greedy'], allTags: ['dp', 'greedy', '*special'] });
  });
});
