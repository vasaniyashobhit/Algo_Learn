/** Thrown when a body is larger than allowed (the caller maps it to its own error). */
export class BodyTooLargeError extends Error {
  constructor(maxBytes) {
    super(`The response is larger than ${maxBytes} bytes`);
    this.name = 'BodyTooLargeError';
  }
}

/**
 * Reads a fetch Response body as UTF-8 text, stopping (and cancelling the stream) as soon as it
 * passes `maxBytes`, so a huge page is never fully downloaded. A declared length is checked first.
 */
export const readLimitedBody = async (response, maxBytes) => {
  if (Number(response.headers.get('content-length')) > maxBytes) throw new BodyTooLargeError(maxBytes);
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new BodyTooLargeError(maxBytes);
    }
    chunks.push(value);
  }
  return new TextDecoder('utf-8').decode(Buffer.concat(chunks));
};
