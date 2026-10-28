import { describe, expect, it } from 'vitest';
import { getTags } from '../../../src/modules/meta/meta.service.js';
import { ALL_TAGS, TOPIC_TAGS } from '../../../src/config/tags.js';

describe('meta.service', () => {
  it('getTags returns the frozen tag lists', async () => {
    expect(await getTags()).toEqual({ topicTags: TOPIC_TAGS, allTags: ALL_TAGS });
  });
});
