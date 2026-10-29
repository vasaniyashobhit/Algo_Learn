import { createHash } from 'node:crypto';

/** Hex sha256 of a UTF-8 string. */
export const sha256Hex = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
