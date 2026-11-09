import { describe, expect, it } from 'vitest';
import { callCf } from '../../../../src/modules/codeforces/helpers/callCf.js';
import { NotFoundError } from '../../../../src/errors/httpErrors.js';
import { cfDown } from '../../../helpers/codeforces.js';

describe('callCf', () => {
  it('returns the result of the call', async () => {
    expect(await callCf(async () => [1, 2])).toEqual([1, 2]);
  });

  it('passes typed errors through unchanged', async () => {
    const notFound = new NotFoundError('CF_HANDLE_NOT_FOUND', 'nope');
    await expect(callCf(async () => { throw notFound; })).rejects.toBe(notFound);
    const down = cfDown();
    await expect(callCf(async () => { throw down; })).rejects.toBe(down);
  });

  it('turns unknown failures into 503 CF_UNAVAILABLE with the cause', async () => {
    const cause = new TypeError('fetch failed');
    const err = await callCf(async () => { throw cause; }).catch((e) => e);
    expect(err).toMatchObject({ statusCode: 503, code: 'CF_UNAVAILABLE', cause });
  });
});
