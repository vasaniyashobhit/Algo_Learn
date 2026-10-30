import { describe, expect, it, vi } from 'vitest';
import { createStuckFeature } from '../../../../src/modules/stuck/stuck.module.js';
import { createOfflineLlm } from '../../../../src/modules/llm/llm.module.js';
import { fakeLogger } from '../../../helpers/llm.js';
import { PNG, STATEMENT, fakeFetch, fakeLlm } from '../../../helpers/stuck.js';
import { fakeFindSimilar, fakeRepo, USER_ID } from '../../../helpers/stuckService.js';

const feature = (overrides = {}) => createStuckFeature({
  llm: fakeLlm(), ocr: vi.fn(async () => STATEMENT), logger: fakeLogger(),
  fetchImpl: fakeFetch(), findSimilar: fakeFindSimilar(), repo: fakeRepo(), ...overrides,
});

describe('stuck feature wiring', () => {
  it('exposes solve plus the read and delete queries', () => {
    expect(Object.keys(feature()).toSorted()).toEqual(['get', 'history', 'remove', 'solution', 'solve']);
  });

  it('reads an image with the LLM, then OCR, through the wired adapters', async () => {
    const llm = fakeLlm();
    const ocr = vi.fn(async () => STATEMENT);
    const result = await feature({ llm, ocr }).solve({
      userId: USER_ID, inputType: 'image', payload: { file: { buffer: PNG, mimetype: 'image/png' } },
    });
    expect(llm.extractImageText).toHaveBeenCalledWith(PNG, 'image/png', { deadline: expect.any(Number) });
    expect(ocr).toHaveBeenCalledWith(PNG);
    expect(llm.getCoachAnswer).toHaveBeenCalledWith(expect.objectContaining({ text: STATEMENT }));
    expect(result).toMatchObject({ inputType: 'image', source: 'fallback' });
  });

  it('works with the offline LLM (AI_UNAVAILABLE fallback)', async () => {
    const result = await feature({ llm: createOfflineLlm({ logger: fakeLogger() }) })
      .solve({ userId: USER_ID, inputType: 'text', payload: { text: STATEMENT } });
    expect(result).toMatchObject({ source: 'fallback', fallbackReason: 'AI_UNAVAILABLE' });
  });
});
