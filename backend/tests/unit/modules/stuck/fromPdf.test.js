import { describe, expect, it, vi } from 'vitest';
import { createFromPdf } from '../../../../src/modules/stuck/input/fromPdf.js';
import { makePdf } from '../../../helpers/stuck.js';

const unreadable = { statusCode: 422, code: 'INPUT_UNREADABLE', details: { inputType: 'pdf' } };

describe('fromPdf', () => {
  it('reads a real PDF with unpdf', async () => {
    expect(await createFromPdf()(makePdf('Theatre Square in Berland'))).toEqual({ text: 'Theatre Square in Berland' });
  });

  it('merges pages and tidies the text', async () => {
    const extractText = vi.fn(async () => ({ totalPages: 2, text: '  Page one  \n\n\n\nPage two ' }));
    expect(await createFromPdf({ extractText })(Buffer.from('%PDF-'))).toEqual({ text: 'Page one\n\nPage two' });
    expect(extractText).toHaveBeenCalledWith(expect.any(Uint8Array), { mergePages: true });
  });

  it('caps the text at 20,000 characters', async () => {
    const extractText = async () => ({ text: 'y'.repeat(30_000) });
    expect((await createFromPdf({ extractText })(Buffer.from('%PDF-'))).text).toHaveLength(20_000);
  });

  it('maps an empty PDF (e.g. a scan) to INPUT_UNREADABLE', async () => {
    await expect(createFromPdf({ extractText: async () => ({ text: ' \n ' }) })(Buffer.from('%PDF-'))).rejects.toMatchObject(unreadable);
    await expect(createFromPdf({ extractText: async () => ({}) })(Buffer.from('%PDF-'))).rejects.toMatchObject(unreadable);
  });

  it('maps a broken PDF to INPUT_UNREADABLE with the cause', async () => {
    const err = await createFromPdf()(Buffer.from('%PDF-1.4 garbage')).catch((e) => e);
    expect(err).toMatchObject(unreadable);
    expect(err.cause).toBeInstanceOf(Error);
  });
});
