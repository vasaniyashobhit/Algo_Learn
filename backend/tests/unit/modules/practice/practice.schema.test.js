import { describe, expect, it } from 'vitest';
import {
  addPracticeSchema, practiceListQuerySchema, updatePracticeSchema,
} from '../../../../src/modules/practice/practice.schema.js';

describe('practiceListQuerySchema', () => {
  it('accepts a known status, nothing, or a blank', () => {
    expect(practiceListQuerySchema.parse({ status: 'todo' })).toEqual({ status: 'todo' });
    expect(practiceListQuerySchema.parse({})).toEqual({});
    expect(practiceListQuerySchema.parse({ status: '' })).toEqual({});
  });

  it('rejects an unknown status', () => {
    expect(practiceListQuerySchema.safeParse({ status: 'done' }).success).toBe(false);
  });
});

describe('addPracticeSchema', () => {
  it('upper-cases the index and defaults addedFrom to manual', () => {
    expect(addPracticeSchema.parse({ problemId: ' 4/b1 ' })).toEqual({ problemId: '4/B1', addedFrom: 'manual' });
    expect(addPracticeSchema.parse({ problemId: '1/A', addedFrom: 'stuck' })).toEqual({ problemId: '1/A', addedFrom: 'stuck' });
  });

  it('rejects bad ids, unknown origins and extra fields', () => {
    expect(addPracticeSchema.safeParse({ problemId: '1-A' }).success).toBe(false);
    expect(addPracticeSchema.safeParse({ problemId: '1/ABCD' }).success).toBe(false);
    expect(addPracticeSchema.safeParse({}).success).toBe(false);
    expect(addPracticeSchema.safeParse({ problemId: '1/A', addedFrom: 'friend' }).success).toBe(false);
    expect(addPracticeSchema.safeParse({ problemId: '1/A', status: 'solved' }).success).toBe(false);
  });
});

describe('updatePracticeSchema', () => {
  it('needs a known status and nothing else', () => {
    expect(updatePracticeSchema.parse({ status: 'skipped' })).toEqual({ status: 'skipped' });
    expect(updatePracticeSchema.safeParse({}).success).toBe(false);
    expect(updatePracticeSchema.safeParse({ status: 'done' }).success).toBe(false);
    expect(updatePracticeSchema.safeParse({ status: 'todo', addedFrom: 'manual' }).success).toBe(false);
  });
});
