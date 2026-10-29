import { describe, expect, it } from 'vitest';
import { buildSummary } from '../../../../src/modules/stats/helpers/buildSummary.js';

const NOW = new Date('2026-10-29T10:00:00Z');
const stat = (topicKey, strength, attempted, kind = 'single') => ({ topicKey, kind, strength, attempted });
const sub = (problemId, verdict, problemRating = 1400) =>
  ({ problemId, verdict, problemRating, problemTags: ['dp'], submittedAt: new Date('2026-10-28T00:00:00Z') });
const keys = (list) => list.map(({ topicKey }) => topicKey);

describe('buildSummary', () => {
  it('has the full shape with zeros when there is no data', () => {
    const summary = buildSummary({ submissions: [], stats: [], now: NOW });
    expect(summary.totals).toEqual({
      submissions: 0, problemsAttempted: 0, problemsSolved: 0, topicsAttempted: 0, pairsTracked: 0,
    });
    expect(summary).toMatchObject({ strongest: [], weakest: [] });
    expect(summary.solvedByRating.bands).toHaveLength(14);
    expect(summary.activity).toHaveLength(30);
  });

  it('counts submissions, problems, topics and pairs', () => {
    const summary = buildSummary({
      submissions: [sub('1/A', 'WRONG_ANSWER'), sub('1/A', 'OK'), sub('2/B', 'WRONG_ANSWER', null)],
      stats: [stat('dp', 0.6, 2), stat('math', 0.4, 1), stat('dp+math', 0.5, 2, 'pair')],
      now: NOW,
    });
    expect(summary.totals).toEqual({
      submissions: 3, problemsAttempted: 2, problemsSolved: 1, topicsAttempted: 2, pairsTracked: 1,
    });
    expect(summary.solvedByRating.bands.find(({ from }) => from === 1400).solved).toBe(1);
    expect(summary.activity.at(-2)).toEqual({ date: '2026-10-28', submissions: 3, accepted: 1 });
  });

  it('ranks the top 5 strongest and the top 5 weakest with ≥ 3 attempts (singles only)', () => {
    const stats = [
      stat('dp', 0.9, 10), stat('math', 0.8, 1), stat('greedy', 0.8, 5), stat('graphs', 0.2, 2),
      stat('trees', 0.3, 3), stat('strings', 0.35, 4), stat('games', 0.4, 3), stat('dsu', 0.45, 3),
      stat('hashing', 0.5, 3), stat('fft', 0.55, 3), stat('dp+math', 0.99, 9, 'pair'),
    ];
    const summary = buildSummary({ submissions: [], stats, now: NOW });
    expect(keys(summary.strongest)).toEqual(['dp', 'greedy', 'math', 'fft', 'hashing']);
    expect(keys(summary.weakest)).toEqual(['trees', 'strings', 'games', 'dsu', 'hashing']);
    expect(summary.strongest[0]).toMatchObject({ tags: ['dp'], strength: 0.9, attempted: 10 });
  });

  it('breaks strength ties by attempts, then by key', () => {
    const stats = [stat('math', 0.5, 3), stat('dp', 0.5, 3), stat('greedy', 0.5, 4)];
    const summary = buildSummary({ submissions: [], stats, now: NOW });
    expect(keys(summary.strongest)).toEqual(['greedy', 'dp', 'math']);
    expect(keys(summary.weakest)).toEqual(['greedy', 'dp', 'math']);
  });
});
