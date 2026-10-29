import { describe, expect, it } from 'vitest';
import { fromCfProblem } from '../../../../src/modules/problems/helpers/fromCfProblem.js';

describe('fromCfProblem', () => {
  it('maps a CF API problem to a cf_api document without statement text', () => {
    const doc = fromCfProblem({
      contestId: 2050, index: 'G', name: ' Tree Destruction ', type: 'PROGRAMMING',
      rating: 1900, tags: ['dfs and similar', 'dp', 'trees'],
    });
    expect(doc).toEqual({
      _id: '2050/G',
      contestId: 2050,
      index: 'G',
      title: 'Tree Destruction',
      rating: 1900,
      tags: ['dfs and similar', 'dp', 'trees'],
      tagCount: 3,
      hasEditorial: false,
      source: 'cf_api',
    });
    expect(doc).not.toHaveProperty('description');
  });

  it('keeps a missing rating as null and dedupes tags', () => {
    expect(fromCfProblem({ contestId: 1, index: 'A', name: 'X', tags: ['dp', 'dp'] }))
      .toMatchObject({ rating: null, tags: ['dp'], tagCount: 1 });
  });

  it('drops tags that are not in the known 37 instead of rejecting the problem', () => {
    expect(fromCfProblem({ contestId: 1, index: 'A', name: 'X', tags: ['dp', 'quantum'] }).tags).toEqual(['dp']);
  });

  it('produces an invalid id (later rejected) when contestId is missing', () => {
    expect(fromCfProblem({ index: 'A', name: 'X' })._id).toBe('null/A');
    expect(fromCfProblem(undefined)).toMatchObject({ _id: 'null/', tags: [] });
  });
});
