import { describe, expect, it } from 'vitest';
import { statsQuerySchema } from '../../../../src/modules/stats/stats.schema.js';

describe('statsQuerySchema', () => {
  it('defaults to single topics by strength, 50 per page', () => {
    expect(statsQuerySchema.parse({})).toEqual({ kind: 'single', sort: 'strength', limit: 50 });
    expect(statsQuerySchema.parse({ kind: '', sort: '', limit: '' })).toEqual({ kind: 'single', sort: 'strength', limit: 50 });
  });

  it('accepts pairs, attempted sort and a limit up to 630', () => {
    expect(statsQuerySchema.parse({ kind: 'pair', sort: 'attempted', limit: '630' }))
      .toEqual({ kind: 'pair', sort: 'attempted', limit: 630 });
  });

  it.each([
    [{ kind: 'triple' }], [{ sort: 'name' }], [{ limit: '0' }], [{ limit: '631' }], [{ limit: '2.5' }],
  ])('rejects %j', (query) => {
    expect(statsQuerySchema.safeParse(query).success).toBe(false);
  });
});
