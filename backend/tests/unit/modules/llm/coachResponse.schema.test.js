import { describe, expect, it } from 'vitest';
import {
  coachResponseSchema, parseCoachResponse, validateCoachResponse,
} from '../../../../src/modules/llm/schema/coachResponse.schema.js';
import { coachJson } from '../../../helpers/llm.js';

const reasonOf = (fn) => {
  try {
    fn();
    return null;
  } catch (err) {
    return err.reason;
  }
};

describe('coach response schema', () => {
  it('parses a valid answer into the sanitized shape', () => {
    const answer = parseCoachResponse(coachJson({ extra: 'dropped' }));
    expect(Object.keys(answer).toSorted()).toEqual([
      'approach', 'code', 'complexity', 'estimatedRating', 'hints', 'pitfalls', 'solutionSteps', 'tags',
    ]);
    expect(answer.estimatedRating).toBe(1000);
  });

  it('tolerates a ```json fence around the object', () => {
    expect(parseCoachResponse(`\n\`\`\`json\n${coachJson()}\n\`\`\``).hints).toHaveLength(3);
  });

  it('defaults optional fields', () => {
    const answer = parseCoachResponse(JSON.stringify({ hints: ['h'], approach: 'a' }));
    expect(answer).toMatchObject({ tags: [], estimatedRating: null, solutionSteps: [], code: '', pitfalls: [] });
  });

  it('rejects text that is not JSON as invalid_json', () => {
    expect(reasonOf(() => parseCoachResponse('Here you go: {"hints": ['))).toBe('invalid_json');
    expect(reasonOf(() => parseCoachResponse(undefined))).toBe('invalid_json');
  });

  it('rejects JSON that misses the schema as invalid_schema', () => {
    expect(reasonOf(() => parseCoachResponse('[]'))).toBe('invalid_schema');
    expect(reasonOf(() => parseCoachResponse(JSON.stringify({ hints: [], approach: 'a' })))).toBe('invalid_schema');
    expect(reasonOf(() => parseCoachResponse(coachJson({ hints: 'one string' })))).toBe('invalid_schema');
  });

  it('rejects answers that become empty after sanitizing', () => {
    expect(reasonOf(() => validateCoachResponse({ hints: ['  '], approach: 'a' }))).toBe('invalid_schema');
    expect(reasonOf(() => validateCoachResponse({ hints: ['h'], approach: '   ' }))).toBe('invalid_schema');
  });

  it('accepts a numeric string or null rating', () => {
    expect(coachResponseSchema.safeParse({ hints: ['h'], approach: 'a', estimatedRating: '1500' }).success).toBe(true);
    expect(coachResponseSchema.safeParse({ hints: ['h'], approach: 'a', estimatedRating: null }).success).toBe(true);
  });
});
