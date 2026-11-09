import { describe, expect, it, vi } from 'vitest';
import { createCoachCache } from '../../../../src/modules/llm/cache.js';
import { LlmCache } from '../../../../src/modules/llm/llmCache.model.js';
import { parseCoachResponse } from '../../../../src/modules/llm/schema/coachResponse.schema.js';
import { useTestDB } from '../../../helpers/db.js';
import { coachJson, fakeLogger } from '../../../helpers/llm.js';

useTestDB();

const answer = parseCoachResponse(coachJson());

describe('coach cache (llmcaches)', () => {
  it('misses, then returns what was set', async () => {
    const cache = createCoachCache({ logger: fakeLogger() });
    expect(await cache.get('problem:1/A')).toBeNull();
    await cache.set('problem:1/A', { answer, provider: 'gemini', model: 'a' });
    expect(await cache.get('problem:1/A')).toEqual({ answer, provider: 'gemini', model: 'a' });
    const doc = await LlmCache.findOne({ key: 'problem:1/A' }).lean();
    expect(doc.createdAt).toBeInstanceOf(Date);
  });

  it('overwrites an existing key instead of failing on the unique index', async () => {
    const cache = createCoachCache({ logger: fakeLogger() });
    await cache.set('text:abc', { answer, provider: 'gemini', model: 'a' });
    await cache.set('text:abc', { answer, provider: 'groq', model: 'g' });
    expect(await LlmCache.countDocuments({ key: 'text:abc' })).toBe(1);
    expect(await cache.get('text:abc')).toMatchObject({ provider: 'groq', model: 'g' });
  });

  it('treats an entry that no longer matches the schema as a miss', async () => {
    await LlmCache.create({ key: 'problem:2/B', provider: 'gemini', model: 'a', response: { tags: ['dp'] } });
    const logger = fakeLogger();
    expect(await createCoachCache({ logger }).get('problem:2/B')).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('logs and continues when the database fails (read = miss, write skipped)', async () => {
    const lean = vi.fn(async () => { throw new Error('db down'); });
    const Model = {
      findOne: () => ({ lean }),
      updateOne: vi.fn(async () => { throw new Error('db down'); }),
    };
    const logger = fakeLogger();
    const cache = createCoachCache({ Model, logger });
    expect(await cache.get('problem:1/A')).toBeNull();
    await expect(cache.set('problem:1/A', { answer, provider: 'gemini', model: 'a' })).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
