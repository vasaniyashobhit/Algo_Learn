import { afterAll, describe, expect, it } from 'vitest';
import { createOcr } from '../../../src/lib/ocr.js';
import { textPng } from '../../../scripts/checks/stuck/png.js';

// Real tesseract.js with the bundled eng data: proves OCR needs no download at runtime.
const ocr = createOcr();
afterAll(() => ocr.terminate());

describe('OCR with the bundled language data (real tesseract)', () => {
  it('reads a generated screenshot, then reuses the worker', { timeout: 30_000 }, async () => {
    const png = textPng(['A. Theatre Square', 'Find the least number of flagstones.']);
    expect(await ocr.recognize(png)).toMatch(/THEATRE SQUARE/);
    const started = Date.now();
    expect(await ocr.recognize(png)).toMatch(/FIND THE LEAST/);
    expect(Date.now() - started).toBeLessThan(5_000);
  });
});
