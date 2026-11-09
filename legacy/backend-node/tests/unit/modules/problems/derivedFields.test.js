import { describe, expect, it } from 'vitest';
import { problemDerivedFields } from '../../../../src/modules/problems/helpers/derivedFields.js';

describe('problemDerivedFields', () => {
  it('counts tags and detects a non-blank editorial', () => {
    expect(problemDerivedFields({ tags: ['dp', 'math'], editorial: 'Use prefix sums.' }))
      .toEqual({ tagCount: 2, hasEditorial: true });
  });

  it('treats a blank or missing editorial as none', () => {
    expect(problemDerivedFields({ tags: [], editorial: '   ' })).toEqual({ tagCount: 0, hasEditorial: false });
    expect(problemDerivedFields({ tags: ['dp'] }).hasEditorial).toBe(false);
  });

  it('handles missing input', () => {
    expect(problemDerivedFields()).toEqual({ tagCount: 0, hasEditorial: false });
  });
});
