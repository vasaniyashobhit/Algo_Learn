import { describe, expect, it, vi } from 'vitest';
import { createFromImage } from '../../../../src/modules/stuck/input/fromImage.js';
import { fakeLogger } from '../../../helpers/llm.js';
import { PNG } from '../../../helpers/stuck.js';

const reader = ({ ai = null, ocr = async () => '', now = () => 0 } = {}) => {
  const deps = { extractImageText: vi.fn(async () => ai), ocr: { recognize: vi.fn(ocr) }, logger: fakeLogger(), now };
  return { ...deps, fromImage: createFromImage(deps) };
};

describe('fromImage', () => {
  it('uses Gemini first, capped at 20 s of the shared deadline', async () => {
    const { fromImage, extractImageText, ocr } = reader({ ai: { text: ' A. Theatre Square ', provider: 'gemini', model: 'a' } });
    expect(await fromImage(PNG, 'image/png', { deadline: 50_000 })).toEqual({ text: 'A. Theatre Square', reader: 'ai' });
    expect(extractImageText).toHaveBeenCalledWith(PNG, 'image/png', { deadline: 20_000 });
    expect(ocr.recognize).not.toHaveBeenCalled();
  });

  it('gives Gemini only the time left when the deadline is closer than 20 s', async () => {
    const { fromImage, extractImageText } = reader({ ai: { text: 'x' } });
    await fromImage(PNG, 'image/png', { deadline: 7_000 });
    expect(extractImageText).toHaveBeenCalledWith(PNG, 'image/png', { deadline: 7_000 });
  });

  it('falls back to OCR with at most 15 s, never past the deadline', async () => {
    let clock = 0;
    const { fromImage, ocr } = reader({ ocr: async () => 'OCR text\n\n\n\nmore', now: () => clock });
    expect(await fromImage(PNG, 'image/png', { deadline: 50_000 })).toEqual({ text: 'OCR text\n\nmore', reader: 'ocr' });
    expect(ocr.recognize).toHaveBeenLastCalledWith(PNG, { timeoutMs: 15_000 });
    clock = 44_000;
    await fromImage(PNG, 'image/png', { deadline: 50_000 });
    expect(ocr.recognize).toHaveBeenLastCalledWith(PNG, { timeoutMs: 6_000 });
  });

  it('defaults to a 50 s request deadline', async () => {
    const { fromImage, extractImageText } = reader({ ai: { text: 'x' }, now: () => 100 });
    await fromImage(PNG, 'image/png');
    expect(extractImageText).toHaveBeenCalledWith(PNG, 'image/png', { deadline: 20_100 });
  });

  it('treats a blank Gemini transcription like none and caps both readers at 20,000 chars', async () => {
    expect(await reader({ ai: { text: '   ' }, ocr: async () => 'from ocr' }).fromImage(PNG, 'image/png')).toMatchObject({ reader: 'ocr' });
    expect((await reader({ ai: { text: 'a'.repeat(30_000) } }).fromImage(PNG, 'image/png')).text).toHaveLength(20_000);
    expect((await reader({ ocr: async () => 'b'.repeat(30_000) }).fromImage(PNG, 'image/png')).text).toHaveLength(20_000);
  });

  it('throws INPUT_UNREADABLE when both are empty', async () => {
    await expect(reader().fromImage(PNG, 'image/png')).rejects.toMatchObject({
      statusCode: 422, code: 'INPUT_UNREADABLE', details: { inputType: 'image' },
    });
  });

  it('logs an OCR failure or timeout and keeps it as the cause', async () => {
    const timeout = Object.assign(new Error('Timed out after 15000ms'), { name: 'TimeoutError' });
    const { fromImage, logger } = reader({ ocr: async () => { throw timeout; } });
    const err = await fromImage(PNG, 'image/png').catch((e) => e);
    expect(err).toMatchObject({ code: 'INPUT_UNREADABLE', cause: timeout });
    expect(logger.warn).toHaveBeenCalledWith({ err: { name: 'TimeoutError', message: 'Timed out after 15000ms' } }, 'OCR failed');
  });
});
