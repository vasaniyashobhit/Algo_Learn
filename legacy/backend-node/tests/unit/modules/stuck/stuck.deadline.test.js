import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCoachService } from '../../../../src/modules/llm/coach.service.js';
import { createImageTextExtractor } from '../../../../src/modules/llm/imageText.js';
import { createOcr } from '../../../../src/lib/ocr.js';
import { createFromImage } from '../../../../src/modules/stuck/input/fromImage.js';
import { createInputResolver } from '../../../../src/modules/stuck/input/resolveInput.js';
import { createStuckService } from '../../../../src/modules/stuck/stuck.service.js';
import { fakeCache, fakeLogger, fakeProvider } from '../../../helpers/llm.js';
import { PNG, STATEMENT } from '../../../helpers/stuck.js';
import { USER_ID, fakeFindSimilar, fakeRepo } from '../../../helpers/stuckService.js';

// Real chain code with the real limits (50 s request, 20 s image, 15 s OCR, 25 s per call) on
// fake timers; every provider hangs until it is aborted.
const later = (ms, value) => new Promise((resolve) => { setTimeout(() => resolve(value), ms); });
const worker = (recognize) => ({ recognize: vi.fn(recognize), terminate: vi.fn(async () => {}) });

const build = ({ ocrWorker, resolveInput } = {}) => {
  const logger = fakeLogger();
  const providers = [fakeProvider('gemini', 'a', 'hang'), fakeProvider('groq', 'g', 'hang')];
  const shared = { providers, logger };
  const llm = { ...createCoachService({ ...shared, cache: fakeCache() }), ...createImageTextExtractor(shared) };
  const ocr = createOcr({ createWorker: async () => ocrWorker, logger });
  const resolver = resolveInput ?? createInputResolver({
    fromUrl: vi.fn(), fromPdf: vi.fn(), fromImage: createFromImage({ extractImageText: llm.extractImageText, ocr, logger }),
  });
  const getCoachAnswer = vi.fn(llm.getCoachAnswer);
  const service = createStuckService({ resolveInput: resolver, getCoachAnswer, findSimilar: fakeFindSimilar(), repo: fakeRepo() });
  return { service, getCoachAnswer, providers };
};

// Runs the fake clock well past any deadline; `elapsed` is the fake time at which it settled.
const timed = async (promise) => {
  const started = Date.now();
  let settledAt;
  const outcome = (async () => {
    try {
      return { value: await promise };
    } catch (error) {
      return { error };
    } finally {
      settledAt = Date.now();
    }
  })();
  await vi.advanceTimersByTimeAsync(120_000);
  return { ...(await outcome), elapsed: settledAt - started };
};

const image = { inputType: 'image', payload: { file: { buffer: PNG, mimetype: 'image/png' } } };

describe('POST /stuck shared deadline (fake slow providers)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('image (20 s) + OCR (14 s) + coach share 50 s and answer the fallback before 55 s', async () => {
    const { service, getCoachAnswer } = build({ ocrWorker: worker(() => later(14_000, { data: { text: STATEMENT } })) });
    const { value, elapsed } = await timed(service.solve({ userId: USER_ID, ...image }));
    expect(elapsed).toBeLessThan(55_000);
    expect(elapsed).toBeGreaterThanOrEqual(50_000);
    expect(getCoachAnswer).toHaveBeenCalledWith(expect.objectContaining({ deadline: expect.any(Number) }));
    expect(value).toMatchObject({ source: 'fallback', fallbackReason: 'AI_TIMEOUT', inputType: 'image' });
    expect(value.hints.length).toBeGreaterThan(0);
  });

  it('times the OCR out at 15 s and answers INPUT_UNREADABLE after about 35 s', async () => {
    const stuck = worker(() => new Promise(() => {}));
    const { service, getCoachAnswer } = build({ ocrWorker: stuck });
    const { error, elapsed } = await timed(service.solve({ userId: USER_ID, ...image }));
    expect(error).toMatchObject({ code: 'INPUT_UNREADABLE', cause: { name: 'TimeoutError' } });
    expect(elapsed).toBe(35_000);
    expect(stuck.terminate).toHaveBeenCalled();
    expect(getCoachAnswer).not.toHaveBeenCalled();
  });

  it('skips the coach (straight fallback) when less than 10 s are left', async () => {
    const resolveInput = vi.fn(() => later(41_000, { text: STATEMENT, rawInput: STATEMENT }));
    const { service, getCoachAnswer, providers } = build({ resolveInput });
    const { value, elapsed } = await timed(service.solve({ userId: USER_ID, inputType: 'text', payload: {} }));
    expect(getCoachAnswer).not.toHaveBeenCalled();
    expect(providers[0].generateJson).not.toHaveBeenCalled();
    expect(value).toMatchObject({ source: 'fallback', fallbackReason: 'AI_TIMEOUT' });
    expect(elapsed).toBe(41_000);
  });

  it('gives the coach all remaining time when the input was quick', async () => {
    const resolveInput = vi.fn(async () => ({ text: STATEMENT, rawInput: STATEMENT }));
    const { service, providers } = build({ resolveInput });
    const { value, elapsed } = await timed(service.solve({ userId: USER_ID, inputType: 'text', payload: {} }));
    expect(elapsed).toBe(50_000);
    expect(providers[1].generateJson).toHaveBeenCalledTimes(1);
    expect(value.fallbackReason).toBe('AI_TIMEOUT');
  });
});
