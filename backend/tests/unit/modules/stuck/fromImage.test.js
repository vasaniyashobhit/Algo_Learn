import { describe, expect, it, vi } from 'vitest';
import { createFromImage } from '../../../../src/modules/stuck/input/fromImage.js';
import { fakeLogger } from '../../../helpers/llm.js';
import { PNG } from '../../../helpers/stuck.js';

const reader = ({ ai = null, ocr = async () => '' } = {}) => {
  const deps = { extractImageText: vi.fn(async () => ai), ocr: vi.fn(ocr), logger: fakeLogger() };
  return { ...deps, fromImage: createFromImage(deps) };
};

describe('fromImage', () => {
  it('uses Gemini first and passes the deadline', async () => {
    const { fromImage, extractImageText, ocr } = reader({ ai: { text: ' A. Theatre Square ', provider: 'gemini', model: 'a' } });
    expect(await fromImage(PNG, 'image/png', { deadline: 123 })).toEqual({ text: 'A. Theatre Square', reader: 'ai' });
    expect(extractImageText).toHaveBeenCalledWith(PNG, 'image/png', { deadline: 123 });
    expect(ocr).not.toHaveBeenCalled();
  });

  it('falls back to tesseract OCR when Gemini returns nothing', async () => {
    const { fromImage, ocr } = reader({ ai: null, ocr: async () => 'OCR text\n\n\n\nmore' });
    expect(await fromImage(PNG, 'image/png')).toEqual({ text: 'OCR text\n\nmore', reader: 'ocr' });
    expect(ocr).toHaveBeenCalledWith(PNG);
  });

  it('treats a blank Gemini transcription like none', async () => {
    const { fromImage } = reader({ ai: { text: '   ' }, ocr: async () => 'from ocr' });
    expect(await fromImage(PNG, 'image/png')).toMatchObject({ reader: 'ocr' });
  });

  it('caps both readers at 20,000 characters', async () => {
    expect((await reader({ ai: { text: 'a'.repeat(30_000) } }).fromImage(PNG, 'image/png')).text).toHaveLength(20_000);
    expect((await reader({ ocr: async () => 'b'.repeat(30_000) }).fromImage(PNG, 'image/png')).text).toHaveLength(20_000);
  });

  it('throws INPUT_UNREADABLE when both are empty', async () => {
    await expect(reader().fromImage(PNG, 'image/png')).rejects.toMatchObject({
      statusCode: 422, code: 'INPUT_UNREADABLE', details: { inputType: 'image' },
    });
  });

  it('logs an OCR crash and keeps it as the cause', async () => {
    const boom = new Error('worker died');
    const { fromImage, logger } = reader({ ocr: async () => { throw boom; } });
    const err = await fromImage(PNG, 'image/png').catch((e) => e);
    expect(err).toMatchObject({ code: 'INPUT_UNREADABLE', cause: boom });
    expect(logger.warn).toHaveBeenCalledWith({ err: { name: 'Error', message: 'worker died' } }, 'OCR failed');
  });
});
