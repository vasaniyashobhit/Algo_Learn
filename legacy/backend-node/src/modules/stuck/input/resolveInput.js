import { PayloadError, ValidationError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';
import { matchesSignature } from '../helpers/fileSignature.js';
import { fromText } from './fromText.js';

const FILE_TYPES = Object.freeze({
  text: ['text/plain'],
  pdf: ['application/pdf'],
  image: ['image/png', 'image/jpeg', 'image/webp'],
});

const required = (field, message) =>
  new ValidationError(codes.VALIDATION_FAILED, 'Request validation failed', [{ field, message }]);

/** The uploaded file must exist, have a mime type allowed for `inputType`, and match its signature. */
export const checkFile = (file, inputType) => {
  if (!file) throw required('file', `Upload a ${inputType === 'pdf' ? 'PDF' : inputType} file`);
  const allowed = FILE_TYPES[inputType];
  if (!allowed.includes(file.mimetype) || !matchesSignature(file.buffer, file.mimetype)) {
    throw new PayloadError(codes.FILE_TYPE_UNSUPPORTED, `This file does not look like a ${allowed.join(' or ')} file`,
      [{ field: 'file', message: `Allowed for ${inputType}: ${allowed.join(', ')}` }]);
  }
  return file;
};

/**
 * Turns `{ inputType, text, url, file }` into `{ text?, problemId?, rawInput, reader? }` with the
 * matching adapter. `text` input also accepts a .txt upload. `deadline` bounds image reading.
 */
export const createInputResolver = ({ fromUrl, fromPdf, fromImage }) => async ({
  inputType, text, url, file, deadline,
}) => {
  if (inputType === 'url') {
    if (!url) throw required('body.url', 'Paste a link to the problem');
    return { ...(await fromUrl(url)), rawInput: url };
  }
  if (inputType === 'text') {
    if (!file && !text) throw required('body.text', 'Paste the problem statement');
    const raw = file ? checkFile(file, 'text').buffer.toString('utf8') : text;
    const resolved = await fromText(raw);
    return { ...resolved, rawInput: resolved.text };
  }
  if (inputType === 'pdf') {
    const resolved = await fromPdf(checkFile(file, 'pdf').buffer);
    return { ...resolved, rawInput: resolved.text };
  }
  const image = checkFile(file, 'image');
  const resolved = await fromImage(image.buffer, image.mimetype, { deadline });
  return { ...resolved, rawInput: resolved.text };
};
