import { describe, expect, it } from 'vitest';
import {
  isPending, isStorable, nextCursor, toSubmissionDoc, uniqueById,
} from '../../../../src/modules/sync/helpers/cfSubmissions.js';
import { cfSubmission } from '../../../helpers/codeforces.js';

describe('isPending / isStorable', () => {
  it('treats a missing verdict, TESTING or an unknown verdict as pending', () => {
    expect(isPending(cfSubmission(1, { verdict: undefined }))).toBe(true);
    expect(isPending(cfSubmission(1, { verdict: 'TESTING' }))).toBe(true);
    expect(isPending(cfSubmission(1, { verdict: 'NEW_THING' }))).toBe(true);
    expect(isPending(cfSubmission(1, { verdict: 'WRONG_ANSWER' }))).toBe(false);
  });

  it('stores only judged submissions whose problem has a contestId', () => {
    expect(isStorable(cfSubmission(1))).toBe(true);
    expect(isStorable(cfSubmission(1, { problem: { index: 'A', name: 'acmsguru' } }))).toBe(false);
    expect(isStorable(cfSubmission(1, { verdict: 'TESTING' }))).toBe(false);
    expect(isStorable(null)).toBe(false);
  });
});

describe('toSubmissionDoc', () => {
  it('copies the problem tags and rating from the payload', () => {
    const doc = toSubmissionDoc('u1')(cfSubmission(42, {
      creationTimeSeconds: 1_000,
      problem: { contestId: 1950, index: 'F2', rating: 2100, tags: ['graphs'] },
    }));
    expect(doc).toEqual({
      cfSubmissionId: 42,
      userId: 'u1',
      problemId: '1950/F2',
      contestId: 1950,
      index: 'F2',
      problemRating: 2100,
      problemTags: ['graphs'],
      verdict: 'OK',
      submittedAt: new Date(1_000_000),
    });
  });

  it('defaults a missing rating to null and missing tags to []', () => {
    const doc = toSubmissionDoc('u1')(cfSubmission(1, { problem: { contestId: 5, index: 'A' } }));
    expect(doc).toMatchObject({ problemRating: null, problemTags: [] });
  });
});

describe('nextCursor', () => {
  it('moves to the newest id when everything is judged', () => {
    expect(nextCursor([cfSubmission(9), cfSubmission(7)], 3)).toBe(9);
  });

  it('keeps the previous cursor when nothing was fetched', () => {
    expect(nextCursor([], 5)).toBe(5);
    expect(nextCursor([])).toBeNull();
  });

  it('stops below the oldest pending submission', () => {
    const fetched = [cfSubmission(10), cfSubmission(9, { verdict: 'TESTING' }), cfSubmission(8), cfSubmission(6)];
    expect(nextCursor(fetched, 2)).toBe(8);
  });

  it('keeps the previous cursor when the oldest fetched one is pending', () => {
    expect(nextCursor([cfSubmission(10), cfSubmission(9, { verdict: undefined })], 4)).toBe(4);
  });
});

describe('uniqueById', () => {
  it('drops repeated ids and keeps order', () => {
    expect(uniqueById([cfSubmission(3), cfSubmission(2), cfSubmission(3)]).map(({ id }) => id)).toEqual([3, 2]);
  });
});
