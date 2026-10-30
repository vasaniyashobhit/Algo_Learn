/**
 * Tesseract OCR: `recognize(buffer)` → text ('' when nothing is found). tesseract.js is imported
 * lazily (it is large and downloads its language data on first use); `recognizeImpl` is injectable.
 */
export const createOcr = ({ language = 'eng', recognizeImpl } = {}) => async (buffer) => {
  const recognize = recognizeImpl ?? (await import('tesseract.js')).default.recognize;
  const { data } = await recognize(buffer, language);
  return String(data?.text ?? '').trim();
};
