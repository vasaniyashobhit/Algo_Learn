import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { useTestDB } from '../../../helpers/db.js';
import { expectErrorShape } from '../../../helpers/auth.js';
import { JPEG, PNG, STATEMENT, fakeLlm, makePdf } from '../../../helpers/stuck.js';
import { STUCK_PATH, stuckApp, stuckUser, uploadStuck } from '../../../helpers/stuckRoutes.js';

useTestDB();

describe('POST /api/v1/stuck (files)', () => {
  it('reads a PDF with unpdf', async () => {
    const llm = fakeLlm();
    const app = stuckApp({ llm });
    const { auth } = await stuckUser(app);
    const res = await uploadStuck(app, auth, 'pdf', makePdf('Count the paths in a tree with n vertices'), 'application/pdf', 'p.pdf');
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ inputType: 'pdf', source: 'fallback' });
    expect(llm.getCoachAnswer).toHaveBeenCalledWith(expect.objectContaining({ text: 'Count the paths in a tree with n vertices' }));
  });

  it('reads a screenshot with Gemini, or with OCR when Gemini returns nothing', async () => {
    const gemini = fakeLlm({ image: { text: STATEMENT, provider: 'gemini', model: 'a' } });
    const app = stuckApp({ llm: gemini });
    const { auth } = await stuckUser(app);
    expect((await uploadStuck(app, auth, 'image', PNG, 'image/png', 's.png')).status).toBe(201);
    const ocr = vi.fn(async () => STATEMENT);
    const ocrApp = stuckApp({ ocr });
    const second = await stuckUser(ocrApp);
    expect((await uploadStuck(ocrApp, second.auth, 'image', JPEG, 'image/jpeg', 's.jpg')).status).toBe(201);
    expect(ocr).toHaveBeenCalled();
  });

  it('accepts a .txt file for the text type', async () => {
    const app = stuckApp();
    const { auth } = await stuckUser(app);
    expect((await uploadStuck(app, auth, 'text', Buffer.from(STATEMENT), 'text/plain', 'p.txt')).status).toBe(201);
  });

  it('answers 422 INPUT_UNREADABLE when neither Gemini nor OCR finds text', async () => {
    const app = stuckApp();
    const { auth } = await stuckUser(app);
    expectErrorShape(await uploadStuck(app, auth, 'image', PNG, 'image/png'), 422, 'INPUT_UNREADABLE', { inputType: 'image' });
  });

  it('answers 415 for a type multer refuses, a spoofed file and a file for the wrong input type', async () => {
    const app = stuckApp();
    const { auth } = await stuckUser(app);
    expect((await uploadStuck(app, auth, 'image', PNG, 'image/gif', 'a.gif')).status).toBe(415);
    const spoofed = await uploadStuck(app, auth, 'pdf', Buffer.from('<html>hi</html>'), 'application/pdf', 'a.pdf');
    expect(spoofed.body.error.code).toBe('FILE_TYPE_UNSUPPORTED');
    expect((await uploadStuck(app, auth, 'pdf', PNG, 'image/png')).status).toBe(415);
  });

  it('answers 413 FILE_TOO_LARGE above 5 MB', async () => {
    const app = stuckApp();
    const { auth } = await stuckUser(app);
    const res = await uploadStuck(app, auth, 'image', Buffer.alloc(5 * 1024 * 1024 + 10), 'image/png', 'big.png');
    expectErrorShape(res, 413, 'FILE_TOO_LARGE');
  });

  it('requires a file for pdf and image', async () => {
    const app = stuckApp();
    const { auth } = await stuckUser(app);
    const res = await request(app).post(STUCK_PATH).set(auth).field('inputType', 'pdf');
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'file', message: 'Upload a PDF file' }]);
  });
});
