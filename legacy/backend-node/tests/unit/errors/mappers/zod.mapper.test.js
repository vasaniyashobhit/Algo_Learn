import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formatZodIssues, mapZodError } from '../../../../src/errors/mappers/zod.mapper.js';
import { ValidationError } from '../../../../src/errors/httpErrors.js';

const schema = z.object({ email: z.email(), age: z.number().int(), nested: z.object({ x: z.string() }) });

describe('mapZodError', () => {
  it('maps a ZodError to VALIDATION_FAILED with field details', () => {
    const { error } = schema.safeParse({ email: 'nope', age: 1.5, nested: {} });
    const mapped = mapZodError(error);
    expect(mapped).toBeInstanceOf(ValidationError);
    expect(mapped.statusCode).toBe(400);
    expect(mapped.code).toBe('VALIDATION_FAILED');
    expect(mapped.cause).toBe(error);
    expect(mapped.details.map((d) => d.field)).toEqual(['email', 'age', 'nested.x']);
    mapped.details.forEach((d) => expect(typeof d.message).toBe('string'));
  });

  it('returns null for other errors', () => {
    expect(mapZodError(new Error('x'))).toBeNull();
    expect(mapZodError(undefined)).toBeNull();
  });
});

describe('formatZodIssues', () => {
  it('prefixes fields with the request part', () => {
    const issues = [{ path: ['email'], message: 'bad' }];
    expect(formatZodIssues(issues, 'body')).toEqual([{ field: 'body.email', message: 'bad' }]);
  });

  it('uses (root) when there is no path and no prefix', () => {
    expect(formatZodIssues([{ path: [], message: 'bad' }])).toEqual([{ field: '(root)', message: 'bad' }]);
  });
});
