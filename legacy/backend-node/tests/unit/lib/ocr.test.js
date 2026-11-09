import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ENG_LANG_PATH, createOcr, workerOptions } from '../../../src/lib/ocr.js';
import { fakeLogger } from '../../helpers/llm.js';

const fakeWorker = (recognize = async () => ({ data: { text: ' A. Theatre Square \n' } })) => ({
  recognize: vi.fn(recognize),
  terminate: vi.fn(async () => {}),
});
const factory = (...workers) => vi.fn(async () => workers.shift() ?? fakeWorker());
const hang = () => new Promise(() => {});

describe('createOcr (local data)', () => {
  it('points langPath at the bundled eng data, never a URL, and writes no cache', () => {
    expect(ENG_LANG_PATH).not.toMatch(/^https?:/);
    expect(existsSync(join(ENG_LANG_PATH, 'eng.traineddata.gz'))).toBe(true);
    expect(workerOptions(ENG_LANG_PATH)).toEqual({ langPath: ENG_LANG_PATH, gzip: true, cacheMethod: 'none' });
  });

  it('creates the worker with the language, LSTM engine and local options', async () => {
    const createWorker = factory();
    await createOcr({ createWorker }).recognize(Buffer.from('img'));
    expect(createWorker).toHaveBeenCalledWith('eng', 1, { langPath: ENG_LANG_PATH, gzip: true, cacheMethod: 'none' });
  });
});

describe('createOcr (worker reuse)', () => {
  it('reuses one worker across calls (also concurrent ones) and trims the text', async () => {
    const worker = fakeWorker();
    const createWorker = factory(worker);
    const ocr = createOcr({ createWorker });
    const results = await Promise.all([ocr.recognize(Buffer.from('a')), ocr.recognize(Buffer.from('b'))]);
    await ocr.recognize(Buffer.from('c'));
    expect(results).toEqual(['A. Theatre Square', 'A. Theatre Square']);
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(worker.recognize).toHaveBeenCalledTimes(3);
  });

  it('terminates the worker on shutdown and starts a new one afterwards', async () => {
    const first = fakeWorker();
    const createWorker = factory(first, fakeWorker());
    const ocr = createOcr({ createWorker });
    await ocr.recognize(Buffer.from('a'));
    await ocr.terminate();
    expect(first.terminate).toHaveBeenCalledTimes(1);
    await ocr.terminate();
    await ocr.recognize(Buffer.from('b'));
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it('retries the start-up after a failed worker creation', async () => {
    const createWorker = vi.fn().mockRejectedValueOnce(new Error('wasm missing')).mockResolvedValueOnce(fakeWorker());
    const ocr = createOcr({ createWorker });
    await expect(ocr.recognize(Buffer.from('a'))).rejects.toThrow('wasm missing');
    expect(await ocr.recognize(Buffer.from('a'))).toBe('A. Theatre Square');
  });

  it('logs (but does not throw) when terminate fails', async () => {
    const worker = { recognize: async () => ({ data: {} }), terminate: async () => { throw new Error('gone'); } };
    const logger = fakeLogger();
    const ocr = createOcr({ createWorker: factory(worker), logger });
    expect(await ocr.recognize(Buffer.from('a'))).toBe('');
    await ocr.terminate();
    expect(logger.warn).toHaveBeenCalledWith({ err: { name: 'Error', message: 'gone' } }, expect.stringMatching(/worker/));
  });
});

describe('createOcr (timeout)', () => {
  it('times out a stuck job, terminates that worker and uses a fresh one next time', async () => {
    const stuck = fakeWorker(hang);
    const createWorker = factory(stuck, fakeWorker());
    const ocr = createOcr({ createWorker, maxTimeoutMs: 20 });
    await expect(ocr.recognize(Buffer.from('a'))).rejects.toMatchObject({ name: 'TimeoutError', message: 'Timed out after 20ms' });
    expect(stuck.terminate).toHaveBeenCalled();
    expect(await ocr.recognize(Buffer.from('a'))).toBe('A. Theatre Square');
  });

  it('never waits longer than the 15 s cap, and uses a shorter caller timeout', async () => {
    const ocr = createOcr({ createWorker: factory(fakeWorker(hang), fakeWorker(hang)), maxTimeoutMs: 30 });
    await expect(ocr.recognize(Buffer.from('a'), { timeoutMs: 10 })).rejects.toThrow('Timed out after 10ms');
    await expect(ocr.recognize(Buffer.from('a'), { timeoutMs: 60_000 })).rejects.toThrow('Timed out after 30ms');
    expect(createOcr().recognize).toBeTypeOf('function');
  });

  it('fails at once when no time is left (never past the deadline)', async () => {
    const createWorker = factory();
    await expect(createOcr({ createWorker }).recognize(Buffer.from('a'), { timeoutMs: -5 })).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(createWorker).not.toHaveBeenCalled();
  });
});
