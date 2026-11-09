import { STUCK } from '../../../config/constants.js';
import { UnprocessableError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';
import { logger as defaultLogger } from '../../../lib/logger.js';
import { tidyText } from '../helpers/extractMainText.js';

const shortError = (err) => ({ name: err?.name, message: String(err?.message ?? err).slice(0, 200) });

/**
 * Image buffer → `{ text, reader }`: Gemini (`extractImageText`, never throws) first, then
 * tesseract OCR. Both draw from the request's shared `deadline`: Gemini gets at most `imageMaxMs`,
 * OCR at most `ocrTimeoutMs` (never past the deadline). An OCR failure or timeout is logged and
 * kept as the cause; no text from either → INPUT_UNREADABLE.
 */
export const createFromImage = ({ extractImageText, ocr, logger = defaultLogger, now = Date.now, limits = STUCK }) =>
  async (buffer, mimeType, { deadline = now() + limits.requestDeadlineMs } = {}) => {
    const ai = await extractImageText(buffer, mimeType, { deadline: Math.min(deadline, now() + limits.imageMaxMs) });
    const aiText = tidyText(ai?.text ?? '');
    if (aiText) return { text: aiText.slice(0, STUCK.maxTextLength), reader: 'ai' };
    let ocrText = '';
    let cause;
    try {
      ocrText = tidyText(await ocr.recognize(buffer, { timeoutMs: Math.min(limits.ocrTimeoutMs, deadline - now()) }));
    } catch (err) {
      cause = err;
      logger.warn({ err: shortError(err) }, 'OCR failed');
    }
    if (ocrText) return { text: ocrText.slice(0, STUCK.maxTextLength), reader: 'ocr' };
    throw new UnprocessableError(codes.INPUT_UNREADABLE,
      'No text could be read from this image. Try a sharper screenshot or paste the text instead.',
      { inputType: 'image' }, { cause });
  };
