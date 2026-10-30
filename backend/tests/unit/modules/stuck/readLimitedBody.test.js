import { describe, expect, it, vi } from 'vitest';
import { BodyTooLargeError, readLimitedBody } from '../../../../src/modules/stuck/helpers/readLimitedBody.js';

const streamOf = (...chunks) => new ReadableStream({
  start(controller) {
    chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk)));
    controller.close();
  },
});

describe('readLimitedBody', () => {
  it('reads a body under the limit as UTF-8', async () => {
    expect(await readLimitedBody(new Response(streamOf('héllo ', 'world')), 100)).toBe('héllo world');
  });

  it('rejects a declared content-length over the limit without reading', async () => {
    const response = new Response('x', { headers: { 'content-length': '5000' } });
    await expect(readLimitedBody(response, 10)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it('stops and cancels the stream once the limit is passed', async () => {
    const cancel = vi.fn();
    let pulls = 0;
    const endless = new ReadableStream({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(4));
      },
      cancel,
    });
    await expect(readLimitedBody(new Response(endless), 10)).rejects.toThrow('larger than 10 bytes');
    expect(cancel).toHaveBeenCalled();
    expect(pulls).toBeLessThan(10);
  });

  it('returns an empty string for a response without a body', async () => {
    expect(await readLimitedBody(new Response(null), 10)).toBe('');
  });
});
