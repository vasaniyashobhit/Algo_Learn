import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createUpload } from '../../../src/middlewares/upload.js';
import { createMiniApp } from '../../helpers/testApp.js';
import { PNG, makePdf } from '../../helpers/stuck.js';

const app = (options) => createMiniApp((mini) => {
  mini.post('/up', createUpload(options), (req, res) => {
    res.json({ file: req.file && { size: req.file.size, mimetype: req.file.mimetype }, body: req.body });
  });
});

describe('upload middleware (multer, memory storage)', () => {
  it('keeps an allowed file in memory next to the text fields', async () => {
    const res = await request(app()).post('/up').field('inputType', 'pdf')
      .attach('file', makePdf(), { filename: 'p.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ file: { size: makePdf().length, mimetype: 'application/pdf' }, body: { inputType: 'pdf' } });
  });

  it.each(['image/png', 'image/jpeg', 'image/webp', 'text/plain'])('accepts %s', async (contentType) => {
    const res = await request(app()).post('/up').attach('file', PNG, { filename: 'f', contentType });
    expect(res.body.file.mimetype).toBe(contentType);
  });

  it('rejects other types with 415 FILE_TYPE_UNSUPPORTED', async () => {
    const res = await request(app()).post('/up').attach('file', PNG, { filename: 'x.gif', contentType: 'image/gif' });
    expect(res.status).toBe(415);
    expect(res.body.error).toMatchObject({ code: 'FILE_TYPE_UNSUPPORTED', details: [{ field: 'file', message: 'Unsupported type image/gif' }] });
  });

  it('rejects a file over the size limit with 413 FILE_TOO_LARGE (5 MB by default)', async () => {
    const res = await request(app({ maxBytes: 10 })).post('/up').attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    const big = await request(app()).post('/up')
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'b.png', contentType: 'image/png' });
    expect(big.status).toBe(413);
  });

  it('rejects an unexpected file field (415) and a second file (400 file count)', async () => {
    const other = await request(app()).post('/up').attach('picture', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(other.status).toBe(415);
    const two = await request(app()).post('/up')
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })
      .attach('file', PNG, { filename: 'b.png', contentType: 'image/png' });
    expect(two.status).toBe(400);
    expect(two.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('passes JSON requests through untouched', async () => {
    const res = await request(app()).post('/up').send({ inputType: 'text' });
    expect(res.body).toEqual({ body: { inputType: 'text' } });
  });
});
