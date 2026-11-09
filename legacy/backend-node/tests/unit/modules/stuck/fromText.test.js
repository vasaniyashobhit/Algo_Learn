import { describe, expect, it } from 'vitest';
import { assertLongEnough, fromText } from '../../../../src/modules/stuck/input/fromText.js';
import { STATEMENT } from '../../../helpers/stuck.js';

describe('fromText', () => {
  it('returns the tidied text', async () => {
    expect(await fromText(`  ${STATEMENT}\r\n\r\n\r\n`)).toEqual({ text: STATEMENT });
  });

  it('caps the text at 20,000 characters', async () => {
    expect((await fromText('x'.repeat(25_000))).text).toHaveLength(20_000);
  });

  it('rejects text under 40 characters (after trimming) with PROBLEM_TEXT_TOO_SHORT', async () => {
    await expect(fromText(`   ${'a'.repeat(39)}   `)).rejects.toMatchObject({
      statusCode: 400, code: 'PROBLEM_TEXT_TOO_SHORT', details: { minLength: 40, length: 39 },
    });
    await expect(fromText(undefined)).rejects.toMatchObject({ code: 'PROBLEM_TEXT_TOO_SHORT' });
  });

  it('accepts exactly the minimum and takes a custom minimum', () => {
    expect(assertLongEnough('a'.repeat(40))).toHaveLength(40);
    expect(() => assertLongEnough('abc', 5)).toThrow(/at least 5/);
  });
});
