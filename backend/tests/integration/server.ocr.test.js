import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { startServer } from '../../src/server.js';
import { parseEnv } from '../../src/config/env.js';
import { buildEnv } from '../helpers/envFactory.js';
import { silentLogger } from '../helpers/testApp.js';
import { fakeCfClient } from '../helpers/codeforces.js';
import { fakeOcr } from '../helpers/stuck.js';
import { createServices } from '../../src/services.js';

describe('startServer shutdown and the OCR worker', () => {
  it('terminates the shared OCR worker before closing the DB', async () => {
    const order = [];
    const ocr = fakeOcr();
    ocr.terminate.mockImplementation(async () => { order.push('ocr'); });
    const db = { connect: async () => {}, disconnect: vi.fn(async () => { order.push('db'); }) };
    const services = createServices({ client: fakeCfClient(), ocr });
    expect(services.ocr).toBe(ocr);
    const proc = new EventEmitter();
    const exit = vi.fn();
    await startServer({ env: { ...parseEnv(buildEnv()), PORT: 0 }, logger: silentLogger, proc, exit, db, services });
    proc.emit('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(order).toEqual(['ocr', 'db']);
  });
});
