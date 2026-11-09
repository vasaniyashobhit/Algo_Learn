import { describe, expect, it } from 'vitest';
import { LlmCache } from '../../../src/modules/llm/llmCache.model.js';
import { useTestDB } from '../../helpers/db.js';
import { makeLlmCache } from '../../helpers/factories.js';
import { expectDuplicateKey, indexesByName, invalidPaths } from '../../helpers/assertions.js';

useTestDB();

describe('LlmCache model', () => {
  it('uses the llmcaches collection', () => {
    expect(LlmCache.collection.name).toBe('llmcaches');
  });

  it('requires key, provider, model and response', () => {
    expect(invalidPaths(LlmCache, {}).toSorted()).toEqual(['key', 'model', 'provider', 'response']);
  });

  it('stores a free-form response and sets createdAt only', async () => {
    const saved = await LlmCache.create(makeLlmCache({ response: { solution: 'x', nested: { a: [1] } } }));
    expect(saved.toJSON().response).toEqual({ solution: 'x', nested: { a: [1] } });
    expect(saved.createdAt).toBeInstanceOf(Date);
    expect(saved.updatedAt).toBeUndefined();
    expect(saved.toJSON()).not.toHaveProperty('__v');
  });

  it('rejects a duplicate key (409)', async () => {
    await LlmCache.create(makeLlmCache({ key: '1/A' }));
    await expectDuplicateKey(LlmCache.create(makeLlmCache({ key: '1/A' })), ['key']);
  });

  it('has a 30-day TTL index on createdAt', async () => {
    const { createdAt_1: ttl } = await indexesByName(LlmCache);
    expect(ttl.key).toEqual({ createdAt: 1 });
    expect(ttl.expireAfterSeconds).toBe(30 * 24 * 60 * 60);
  });
});
