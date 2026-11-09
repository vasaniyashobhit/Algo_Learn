import { describe, expect, it, vi } from 'vitest';
import { timeoutError, withTimeout } from '../../../src/lib/withTimeout.js';

describe('withTimeout', () => {
  it('returns the value of a fast call and clears its timer', async () => {
    const clear = vi.spyOn(globalThis, 'clearTimeout');
    expect(await withTimeout(async () => 42, 1000)).toBe(42);
    expect(clear).toHaveBeenCalled();
  });

  it('rejects with a TimeoutError and aborts the signal, even if the call ignores it', async () => {
    let seen;
    const err = await withTimeout((signal) => {
      seen = signal;
      return new Promise(() => {});
    }, 10).catch((e) => e);
    expect(err.name).toBe('TimeoutError');
    expect(err.message).toBe('Timed out after 10ms');
    expect(seen.aborted).toBe(true);
    expect(seen.reason).toBe(err);
  });

  it('passes the call error through unchanged', async () => {
    const boom = new Error('boom');
    await expect(withTimeout(async () => { throw boom; }, 1000)).rejects.toBe(boom);
  });

  it('builds a named timeout error', () => {
    expect(timeoutError(5)).toMatchObject({ name: 'TimeoutError', message: 'Timed out after 5ms' });
  });
});
