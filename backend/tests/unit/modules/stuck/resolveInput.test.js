import { describe, expect, it, vi } from 'vitest';
import { checkFile, createInputResolver } from '../../../../src/modules/stuck/input/resolveInput.js';
import { PNG, STATEMENT, makePdf } from '../../../helpers/stuck.js';

const file = (buffer, mimetype) => ({ buffer, mimetype, originalname: 'f' });

const resolver = () => {
  const deps = {
    fromUrl: vi.fn(async () => ({ problemId: '1/A' })),
    fromPdf: vi.fn(async () => ({ text: 'pdf text' })),
    fromImage: vi.fn(async () => ({ text: 'image text', reader: 'ocr' })),
  };
  return { ...deps, resolve: createInputResolver(deps) };
};

describe('input resolver', () => {
  it('dispatches each input type to its adapter and records the raw input', async () => {
    const { resolve, fromImage, fromPdf } = resolver();
    expect(await resolve({ inputType: 'text', text: STATEMENT })).toEqual({ text: STATEMENT, rawInput: STATEMENT });
    expect(await resolve({ inputType: 'url', url: 'https://codeforces.com/contest/1/problem/A' }))
      .toEqual({ problemId: '1/A', rawInput: 'https://codeforces.com/contest/1/problem/A' });
    const pdf = makePdf();
    expect(await resolve({ inputType: 'pdf', file: file(pdf, 'application/pdf') })).toEqual({ text: 'pdf text', rawInput: 'pdf text' });
    expect(fromPdf).toHaveBeenCalledWith(pdf);
    expect(await resolve({ inputType: 'image', file: file(PNG, 'image/png'), deadline: 9 }))
      .toEqual({ text: 'image text', reader: 'ocr', rawInput: 'image text' });
    expect(fromImage).toHaveBeenCalledWith(PNG, 'image/png', { deadline: 9 });
  });

  it('reads a .txt upload for the text type', async () => {
    const result = await resolver().resolve({ inputType: 'text', file: file(Buffer.from(STATEMENT), 'text/plain') });
    expect(result.text).toBe(STATEMENT);
  });

  it('requires the field that matches the input type', async () => {
    const { resolve } = resolver();
    const missing = (field) => ({ code: 'VALIDATION_FAILED', details: [expect.objectContaining({ field })] });
    await expect(resolve({ inputType: 'text' })).rejects.toMatchObject(missing('body.text'));
    await expect(resolve({ inputType: 'url' })).rejects.toMatchObject(missing('body.url'));
    await expect(resolve({ inputType: 'pdf' })).rejects.toMatchObject(missing('file'));
    await expect(resolve({ inputType: 'image' })).rejects.toMatchObject(missing('file'));
  });

  it('rejects a file of the wrong type for the input type', async () => {
    const { resolve } = resolver();
    const unsupported = { statusCode: 415, code: 'FILE_TYPE_UNSUPPORTED' };
    await expect(resolve({ inputType: 'pdf', file: file(PNG, 'image/png') })).rejects.toMatchObject(unsupported);
    await expect(resolve({ inputType: 'image', file: file(makePdf(), 'application/pdf') })).rejects.toMatchObject(unsupported);
  });
});

describe('checkFile', () => {
  it('rejects a spoofed mime type (bytes do not match)', () => {
    expect(() => checkFile(file(Buffer.from('<html>'), 'image/png'), 'image')).toThrow(expect.objectContaining({
      code: 'FILE_TYPE_UNSUPPORTED', details: [{ field: 'file', message: 'Allowed for image: image/png, image/jpeg, image/webp' }],
    }));
    expect(() => checkFile(file(Buffer.from([0x41, 0, 0x42]), 'text/plain'), 'text')).toThrow(expect.objectContaining({ code: 'FILE_TYPE_UNSUPPORTED' }));
  });

  it('returns a valid file', () => {
    const png = file(PNG, 'image/png');
    expect(checkFile(png, 'image')).toBe(png);
  });
});
