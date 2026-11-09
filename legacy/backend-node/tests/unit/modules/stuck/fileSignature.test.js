import { describe, expect, it } from 'vitest';
import { matchesSignature } from '../../../../src/modules/stuck/helpers/fileSignature.js';
import { JPEG, PNG, WEBP, makePdf } from '../../../helpers/stuck.js';

describe('matchesSignature', () => {
  it('accepts files whose bytes match the declared type', () => {
    expect(matchesSignature(makePdf(), 'application/pdf')).toBe(true);
    expect(matchesSignature(PNG, 'image/png')).toBe(true);
    expect(matchesSignature(JPEG, 'image/jpeg')).toBe(true);
    expect(matchesSignature(WEBP, 'image/webp')).toBe(true);
    expect(matchesSignature(Buffer.from('plain text'), 'text/plain')).toBe(true);
  });

  it('rejects spoofed types, binary "text", unknown types and empty files', () => {
    expect(matchesSignature(PNG, 'application/pdf')).toBe(false);
    expect(matchesSignature(makePdf(), 'image/png')).toBe(false);
    expect(matchesSignature(JPEG, 'image/webp')).toBe(false);
    expect(matchesSignature(Buffer.from([0x41, 0, 0x42]), 'text/plain')).toBe(false);
    expect(matchesSignature(PNG, 'image/gif')).toBe(false);
    expect(matchesSignature(Buffer.alloc(0), 'text/plain')).toBe(false);
    expect(matchesSignature(undefined, 'image/png')).toBe(false);
  });
});
