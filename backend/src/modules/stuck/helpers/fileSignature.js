const SIGNATURES = {
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  // Text has no magic number: refuse NUL bytes (a binary file renamed .txt).
  'text/plain': (b) => !b.includes(0),
};

/** True when the file's first bytes match its declared mime type (the header can be spoofed). */
export const matchesSignature = (buffer, mimeType) => {
  const check = SIGNATURES[mimeType];
  return Boolean(check && buffer?.length && check(Buffer.from(buffer)));
};
