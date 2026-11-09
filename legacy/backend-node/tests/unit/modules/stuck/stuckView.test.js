import { describe, expect, it } from 'vitest';
import { HISTORY_PROJECTION, toHistoryItem, toStuckResult } from '../../../../src/modules/stuck/helpers/stuckView.js';
import { objectId } from '../../../helpers/factories.js';

const _id = objectId();
const createdAt = new Date('2026-10-30T10:00:00Z');
const problem = { matchedProblemId: '1/A', title: 'T', tags: ['math'], tagsSource: 'db', rating: 1000 };

describe('stuck views', () => {
  it('spreads the stored result with id, inputType and createdAt', () => {
    expect(toStuckResult({ _id, inputType: 'url', createdAt, result: { source: 'ai', hints: ['h'] }, solution: { code: 'x' } }))
      .toEqual({ id: String(_id), inputType: 'url', createdAt, source: 'ai', hints: ['h'] });
  });

  it('builds a history row from the stored problem and gap', () => {
    const doc = { _id, inputType: 'text', createdAt, source: 'fallback', result: { problem }, gap: [{ topicKey: 'dp' }] };
    expect(toHistoryItem(doc)).toEqual({
      id: String(_id), inputType: 'text', createdAt, source: 'fallback', problem, gapTopics: ['dp'],
    });
  });

  it('rebuilds the problem from top-level fields for rows without a result', () => {
    expect(toHistoryItem({ _id, inputType: 'pdf', createdAt, source: 'ai', matchedProblemId: '2/B', detectedTags: ['dp'], estimatedRating: 1500 }))
      .toMatchObject({
        problem: { matchedProblemId: '2/B', title: null, tags: ['dp'], tagsSource: null, rating: 1500 }, gapTopics: [],
      });
    expect(toHistoryItem({ _id, inputType: 'pdf', createdAt, source: 'ai' }).problem)
      .toEqual({ matchedProblemId: null, title: null, tags: [], tagsSource: null, rating: null });
  });

  it('never projects the raw input or the solution for the history', () => {
    expect(HISTORY_PROJECTION).not.toMatch(/rawInput|solution/);
  });
});
