import { STUCK } from '../../../config/constants.js';
import { ValidationError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';
import { tidyText } from '../helpers/extractMainText.js';

/** Checks that text (pasted, or read from a file or page) is long enough to analyse. */
export const assertLongEnough = (text, minLength = STUCK.minTextLength) => {
  if (text.length >= minLength) return text;
  throw new ValidationError(
    codes.PROBLEM_TEXT_TOO_SHORT,
    `Please paste at least ${minLength} characters of the problem statement`,
    { minLength, length: text.length },
  );
};

/** Pasted text → `{ text }` (tidied, capped at STUCK.maxTextLength), or PROBLEM_TEXT_TOO_SHORT. */
export const fromText = async (raw) => ({
  text: assertLongEnough(tidyText(String(raw ?? ''))).slice(0, STUCK.maxTextLength),
});
