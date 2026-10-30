// Client-side checks that mirror POST /stuck (docs/API.md), so most mistakes never cost a request.
export const STUCK_LIMITS = Object.freeze({ minText: 40, maxText: 20_000, maxUrl: 2048, maxFileBytes: 5 * 1024 * 1024 });

export const FILE_TYPES = Object.freeze({
  pdf: ['application/pdf'],
  image: ['image/png', 'image/jpeg', 'image/webp'],
});

export const ACCEPT = Object.freeze({ pdf: 'application/pdf,.pdf', image: 'image/png,image/jpeg,image/webp' });

const PRIVATE_HOST = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[::1?\]$)/i;

// Same shape as an ApiError (code + details) so getUserMessage words it like the server would.
const codeIssue = (code, details = null) => ({ code, details });

const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const checkUrl = (raw) => {
  const value = raw.trim();
  if (!value) return { clientMessage: 'Paste a link to the problem page.' };
  const url = value.length <= STUCK_LIMITS.maxUrl ? parseUrl(value) : null;
  if (!url || !['http:', 'https:'].includes(url.protocol)) return codeIssue('URL_NOT_ALLOWED', { reason: 'scheme' });
  if (url.username || url.password) return codeIssue('URL_NOT_ALLOWED', { reason: 'credentials' });
  if (url.port && !['80', '443'].includes(url.port)) return codeIssue('URL_NOT_ALLOWED', { reason: 'port' });
  if (PRIVATE_HOST.test(url.hostname)) return codeIssue('URL_NOT_ALLOWED', { reason: 'private' });
  return null;
};

const checkFile = (file, inputType) => {
  if (!file) return { clientMessage: inputType === 'pdf' ? 'Choose a PDF first.' : 'Choose or paste a screenshot first.' };
  if (file.size > STUCK_LIMITS.maxFileBytes) return codeIssue('FILE_TOO_LARGE');
  if (!FILE_TYPES[inputType].includes(file.type)) return codeIssue('FILE_TYPE_UNSUPPORTED', { inputType });
  return null;
};

/** The first problem with the input (`{ code, details }` worded by getUserMessage, or `{ clientMessage }`), or null when it can be sent. */
export const checkStuckInput = ({ inputType, text = '', url = '', file = null }) => {
  if (inputType === 'text') {
    const length = text.trim().length;
    return length < STUCK_LIMITS.minText
      ? codeIssue('PROBLEM_TEXT_TOO_SHORT', { minLength: STUCK_LIMITS.minText, length })
      : null;
  }
  if (inputType === 'url') return checkUrl(url);
  return checkFile(file, inputType);
};

/** The multipart body for POST /stuck: inputType plus exactly one of text, url or file. */
export const buildStuckForm = ({ inputType, text = '', url = '', file = null }) => {
  const form = new FormData();
  form.append('inputType', inputType);
  if (inputType === 'text') form.append('text', text.trim());
  else if (inputType === 'url') form.append('url', url.trim());
  else form.append('file', file);
  return form;
};

/** "1.4 MB" / "820 KB" for the chosen file. */
export const fileSizeText = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
