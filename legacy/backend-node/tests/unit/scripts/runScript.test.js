import { describe, expect, it, vi } from 'vitest';
import { pathToFileURL } from 'node:url';
import { isEntryPoint, runAsMain, runScript } from '../../../src/scripts/runScript.js';

const source = { MONGODB_URI: 'mongodb://localhost:27017/x', LOG_LEVEL: 'silent' };
const fakeDb = () => ({ connect: vi.fn(async () => {}), disconnect: vi.fn(async () => {}) });

describe('isEntryPoint', () => {
  it('matches the module URL against argv[1]', () => {
    const file = process.cwd();
    expect(isEntryPoint(pathToFileURL(file).href, ['node', file])).toBe(true);
    expect(isEntryPoint('file:///other.js', ['node', file])).toBe(false);
    expect(isEntryPoint('file:///other.js', ['node'])).toBe(false);
  });
});

describe('runScript', () => {
  it('connects, runs the task, prints the summary and disconnects', async () => {
    const db = fakeDb();
    const print = vi.fn();
    const task = vi.fn(async ({ env }) => ({ ok: env.MONGODB_URI.length > 0 }));
    expect(await runScript('demo', task, { source, db, print })).toEqual({ ok: true });
    expect(db.connect).toHaveBeenCalledWith(source.MONGODB_URI, expect.any(Object));
    expect(print.mock.calls[0][0]).toContain('demo summary');
    expect(db.disconnect).toHaveBeenCalled();
  });

  it('only requires MONGODB_URI (no API secrets)', async () => {
    await expect(runScript('demo', async () => ({}), { source: {}, db: fakeDb() }))
      .rejects.toThrow('MONGODB_URI: missing');
  });

  it('logs, re-throws and still disconnects when the task fails', async () => {
    const db = fakeDb();
    const error = vi.fn();
    const makeLogger = () => ({ error });
    const failing = async () => { throw new Error('boom'); };
    await expect(runScript('demo', failing, { source, db, makeLogger })).rejects.toThrow('boom');
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Error) }), 'demo failed');
    expect(db.disconnect).toHaveBeenCalled();
  });
});

describe('runAsMain', () => {
  it('exits with code 1 and a message on failure', async () => {
    const exit = vi.fn();
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    await runAsMain('demo', async () => ({}), { source: {}, exit });
    expect(exit).toHaveBeenCalledWith(1);
    expect(stderr.mock.calls[0][0]).toContain('demo failed');
  });

  it('does not exit on success', async () => {
    const exit = vi.fn();
    await runAsMain('demo', async () => ({}), { source, db: fakeDb(), exit, print: () => {} });
    expect(exit).not.toHaveBeenCalled();
  });
});
