import { extractText as unpdfExtractText } from 'unpdf';
import { STUCK } from '../../../config/constants.js';
import { UnprocessableError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';
import { tidyText } from '../helpers/extractMainText.js';

const unreadable = (cause) => new UnprocessableError(codes.INPUT_UNREADABLE,
  'No text could be read from this PDF. If it is a scan, upload a screenshot or paste the text instead.',
  { inputType: 'pdf' }, { cause });

/** PDF buffer → `{ text }` with unpdf (all pages merged); empty or broken PDFs → INPUT_UNREADABLE. */
export const createFromPdf = ({ extractText = unpdfExtractText } = {}) => async (buffer) => {
  let text;
  try {
    ({ text } = await extractText(new Uint8Array(buffer), { mergePages: true }));
  } catch (err) {
    throw unreadable(err);
  }
  const clean = tidyText(String(text ?? ''));
  if (!clean) throw unreadable();
  return { text: clean.slice(0, STUCK.maxTextLength) };
};
