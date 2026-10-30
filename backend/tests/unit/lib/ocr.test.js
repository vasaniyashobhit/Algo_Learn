import { describe, expect, it, vi } from 'vitest';
import { createOcr } from '../../../src/lib/ocr.js';

vi.mock('tesseract.js', () => ({
  default: { recognize: vi.fn(async () => ({ data: { text: ' from the mocked module \n' } })) },
}));

describe('createOcr', () => {
  it('returns the trimmed text in the configured language', async () => {
    const recognizeImpl = vi.fn(async () => ({ data: { text: '  A. Theatre Square \n' } }));
    const buffer = Buffer.from('img');
    expect(await createOcr({ language: 'eng', recognizeImpl })(buffer)).toBe('A. Theatre Square');
    expect(recognizeImpl).toHaveBeenCalledWith(buffer, 'eng');
  });

  it('returns an empty string when nothing was recognized', async () => {
    expect(await createOcr({ recognizeImpl: async () => ({}) })(Buffer.from('x'))).toBe('');
  });

  it('lazily loads tesseract.js by default', async () => {
    expect(await createOcr()(Buffer.from('x'))).toBe('from the mocked module');
  });

  it('lets recognition errors propagate (the caller logs them)', async () => {
    const ocr = createOcr({ recognizeImpl: async () => { throw new Error('no language data'); } });
    await expect(ocr(Buffer.from('x'))).rejects.toThrow('no language data');
  });
});
