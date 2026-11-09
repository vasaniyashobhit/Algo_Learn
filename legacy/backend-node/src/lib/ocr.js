import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { STUCK } from '../config/constants.js';
import { logger as defaultLogger } from './logger.js';
import { timeoutError, withTimeout } from './withTimeout.js';

const resolvePackage = createRequire(import.meta.url).resolve;

/** Bundled English data (@tesseract.js-data/eng, LSTM "best_int"): OCR never downloads anything. */
export const ENG_LANG_PATH = join(dirname(resolvePackage('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');

/** Worker options: local gzipped data, no cache files written to the working directory. */
export const workerOptions = (langPath) => ({ langPath, gzip: true, cacheMethod: 'none' });

const loadCreateWorker = async () => (await import('tesseract.js')).default.createWorker;

/**
 * Tesseract OCR with one reused worker (created lazily on first use). `recognize(buffer,
 * { timeoutMs })` → trimmed text; it gets at most min(timeoutMs, maxTimeoutMs) including worker
 * start-up. A timed-out job cannot be cancelled, so that worker is terminated and the next call
 * starts a fresh one. `terminate()` is called on shutdown.
 */
export const createOcr = ({
  language = STUCK.ocrLanguage,
  langPath = ENG_LANG_PATH,
  maxTimeoutMs = STUCK.ocrTimeoutMs,
  createWorker,
  logger = defaultLogger,
} = {}) => {
  let pending = null;

  const start = async () => (createWorker ?? await loadCreateWorker())(language, 1, workerOptions(langPath));

  const worker = async () => {
    pending ??= start();
    try {
      return await pending;
    } catch (err) {
      pending = null;
      throw err;
    }
  };

  const terminate = async () => {
    const current = pending;
    pending = null;
    if (!current) return;
    try {
      await (await current).terminate();
    } catch (err) {
      logger.warn({ err: { name: err?.name, message: String(err?.message ?? err).slice(0, 200) } }, 'OCR worker did not stop cleanly');
    }
  };

  const recognize = async (buffer, { timeoutMs = maxTimeoutMs } = {}) => {
    const limit = Math.min(timeoutMs, maxTimeoutMs);
    if (limit <= 0) throw timeoutError(0);
    try {
      return await withTimeout(async () => {
        const { data } = await (await worker()).recognize(buffer);
        return String(data?.text ?? '').trim();
      }, limit);
    } catch (err) {
      if (err?.name === 'TimeoutError') await terminate();
      throw err;
    }
  };

  return { recognize, terminate };
};
