import { describe, expect, it } from 'vitest';
import { toPracticeItem } from '../../../../src/modules/practice/helpers/practiceView.js';
import { verifyOutcome } from '../../../../src/modules/practice/helpers/verifyOutcome.js';
import { copyIdPrefixes } from '../../../../src/modules/practice/helpers/copyFilter.js';
import { objectId } from '../../../helpers/factories.js';

describe('toPracticeItem', () => {
  const doc = {
    _id: objectId(), userId: objectId(), problemId: '1/A', status: 'todo', addedFrom: 'manual',
    createdAt: new Date(0), updatedAt: new Date(1), __v: 0,
  };

  it('returns the whitelisted fields with the problem summary', () => {
    const item = toPracticeItem(doc, { _id: '1/A', contestId: 1, index: 'A', title: 'T', rating: 800, tags: ['math'] });
    expect(item).toEqual({
      id: String(doc._id), problemId: '1/A', status: 'todo', addedFrom: 'manual',
      createdAt: new Date(0), updatedAt: new Date(1),
      problem: { id: '1/A', contestId: 1, index: 'A', title: 'T', rating: 800, tags: ['math'], hasEditorial: false, source: 'hf' },
    });
  });

  it('sets problem to null when it is gone', () => {
    expect(toPracticeItem(doc).problem).toBeNull();
  });
});

describe('verifyOutcome', () => {
  it('is solved when any submission is OK, even with a newer pending one', () => {
    const outcome = verifyOutcome({
      submissions: [{ cfSubmissionId: 5, verdict: 'WRONG_ANSWER' }, { cfSubmissionId: 6, verdict: 'OK' }],
      pending: [{ cfSubmissionId: 9 }],
    });
    expect(outcome).toEqual({ solved: true });
  });

  it('is STILL_JUDGING when the newest submission is pending', () => {
    const outcome = verifyOutcome({ submissions: [{ cfSubmissionId: 5, verdict: 'WRONG_ANSWER' }], pending: [{ cfSubmissionId: 7 }] });
    expect(outcome).toEqual({ solved: false, reason: 'STILL_JUDGING' });
    expect(verifyOutcome({ pending: [{ cfSubmissionId: 1 }] }).reason).toBe('STILL_JUDGING');
  });

  it('is NOT_SOLVED_YET when a judged submission is newer than the pending one, or nothing exists', () => {
    const outcome = verifyOutcome({ submissions: [{ cfSubmissionId: 8, verdict: 'WRONG_ANSWER' }], pending: [{ cfSubmissionId: 7 }] });
    expect(outcome.reason).toBe('NOT_SOLVED_YET');
    expect(verifyOutcome({})).toEqual({ solved: false, reason: 'NOT_SOLVED_YET' });
  });
});

describe('copyIdPrefixes', () => {
  it('covers contests within ±2, anchored', () => {
    const prefixes = copyIdPrefixes(1900);
    expect(prefixes.map(String)).toEqual(['/^1898\\//', '/^1899\\//', '/^1900\\//', '/^1901\\//', '/^1902\\//']);
    expect(prefixes[0].test('1898/A')).toBe(true);
    expect(prefixes[0].test('11898/A')).toBe(false);
  });

  it('skips contest ids below 1', () => {
    expect(copyIdPrefixes(1).map(String)).toEqual(['/^1\\//', '/^2\\//', '/^3\\//']);
  });
});
