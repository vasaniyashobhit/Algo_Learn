import { describe, expect, it } from 'vitest';
import { stuckBodySchema, stuckHistoryQuerySchema } from '../../../../src/modules/stuck/stuck.schema.js';

describe('stuck schemas', () => {
  it('accepts every input type and treats blank fields as missing', () => {
    expect(stuckBodySchema.parse({ inputType: 'text', text: 'abc', url: '' })).toEqual({ inputType: 'text', text: 'abc' });
    expect(stuckBodySchema.parse({ inputType: 'url', url: '  https://x.io  ' })).toEqual({ inputType: 'url', url: 'https://x.io' });
    expect(stuckBodySchema.parse({ inputType: 'pdf' })).toEqual({ inputType: 'pdf' });
    expect(stuckBodySchema.parse({ inputType: 'image' })).toEqual({ inputType: 'image' });
  });

  it('rejects unknown types, unknown fields and oversized text or URLs', () => {
    expect(stuckBodySchema.safeParse({ inputType: 'video' }).success).toBe(false);
    expect(stuckBodySchema.safeParse({}).success).toBe(false);
    expect(stuckBodySchema.safeParse({ inputType: 'text', extra: 1 }).success).toBe(false);
    expect(stuckBodySchema.safeParse({ inputType: 'text', text: 'x'.repeat(20_001) }).success).toBe(false);
    expect(stuckBodySchema.safeParse({ inputType: 'url', url: `https://x.io/${'a'.repeat(2_048)}` }).success).toBe(false);
  });

  it('pages the history from 1', () => {
    expect(stuckHistoryQuerySchema.parse({})).toEqual({ page: 1 });
    expect(stuckHistoryQuerySchema.parse({ page: '3' })).toEqual({ page: 3 });
    expect(stuckHistoryQuerySchema.parse({ page: '' })).toEqual({ page: 1 });
    expect(stuckHistoryQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });
});
