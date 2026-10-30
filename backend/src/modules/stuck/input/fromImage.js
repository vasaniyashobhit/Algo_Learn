import { STUCK } from '../../../config/constants.js';
import { UnprocessableError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';
import { logger as defaultLogger } from '../../../lib/logger.js';
import { tidyText } from '../helpers/extractMainText.js';

const shortError = (err) => ({ name: err?.name, message: String(err?.message ?? err).slice(0, 200) });

/**
 * Image buffer → `{ text, reader }`: Gemini (`extractImageText`, never throws) first, then
 * tesseract OCR. An OCR crash is logged and kept as the cause; both empty → INPUT_UNREADABLE.
 */
export const createFromImage = ({ extractImageText, ocr, logger = defaultLogger }) =>
  async (buffer, mimeType, { deadline } = {}) => {
    const ai = await extractImageText(buffer, mimeType, { deadline });
    const aiText = tidyText(ai?.text ?? '');
    if (aiText) return { text: aiText.slice(0, STUCK.maxTextLength), reader: 'ai' };
    let ocrText = '';
    let cause;
    try {
      ocrText = tidyText(await ocr(buffer));
    } catch (err) {
      cause = err;
      logger.warn({ err: shortError(err) }, 'OCR failed');
    }
    if (ocrText) return { text: ocrText.slice(0, STUCK.maxTextLength), reader: 'ocr' };
    throw new UnprocessableError(codes.INPUT_UNREADABLE,
      'No text could be read from this image. Try a sharper screenshot or paste the text instead.',
      { inputType: 'image' }, { cause });
  };
