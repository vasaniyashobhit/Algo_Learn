import { describe, expect, it } from 'vitest';
import { addProblem, emptyTotals, lastResults, toTopicStatDoc } from '../../../../src/modules/stats/helpers/topicTotals.js';

const NOW = new Date('2026-10-29T00:00:00Z');
const at = (day) => new Date(`2026-10-${String(day).padStart(2, '0')}T00:00:00Z`);

describe('topic totals', () => {
  it('starts empty', () => {
    expect(emptyTotals('dp', 'single')).toEqual({
      topicKey: 'dp', kind: 'single', attempted: 0, solved: 0, solvedScore: 0, failScore: 0, solves: [], results: [], lastActivityAt: null,
    });
  });

  it('adds problems and keeps the latest activity', () => {
    const totals = emptyTotals('dp', 'single');
    addProblem(totals, { solved: true, rating: 1400, lastAt: at(5) }, { solvedScore: 1, failScore: 0 });
    addProblem(totals, { solved: false, rating: 1600, lastAt: at(2) }, { solvedScore: 0, failScore: 0.5 });
    addProblem(totals, { solved: true, rating: null, lastAt: at(3) }, { solvedScore: 0.75, failScore: 0 });
    expect(totals).toMatchObject({
      attempted: 3, solved: 2, solvedScore: 1.75, failScore: 0.5, lastActivityAt: at(5), solves: [{ rating: 1400, at: at(5) }],
    });
  });

  it('builds the document fields', () => {
    const totals = emptyTotals('dp+math', 'pair');
    addProblem(totals, { problemId: '1/A', solved: true, rating: 1400, lastAt: at(5) }, { solvedScore: 1, failScore: 0 });
    addProblem(totals, { problemId: '2/B', solved: true, rating: 1601, lastAt: at(6) }, { solvedScore: 1, failScore: 0 });
    addProblem(totals, { problemId: '3/C', solved: false, rating: 1800, lastAt: at(7) }, { solvedScore: 0, failScore: 1 });
    expect(toTopicStatDoc(totals, 1500, NOW)).toEqual({
      topicKey: 'dp+math',
      kind: 'pair',
      attempted: 3,
      solved: 2,
      failed: 1,
      avgSolvedRating: 1501, // (1400 + 1601) / 2 = 1500.5 → 1501
      maxSolvedRating: 1601,
      comfortRating: 1500, // 2 solves → min(1500, 1601)
      strength: 3.5 / 6, // (2 + 1.5) / (2 + 1 + 3)
      lastActivityAt: at(7),
      lastResults: [{ problemId: '3/C', solved: false }, { problemId: '2/B', solved: true }, { problemId: '1/A', solved: true }],
    });
  });

  it('uses nulls when nothing rated was solved', () => {
    const totals = addProblem(emptyTotals('dp', 'single'), { solved: false, rating: 1400, lastAt: at(1) },
      { solvedScore: 0, failScore: 1 });
    expect(toTopicStatDoc(totals, null, NOW)).toMatchObject({
      avgSolvedRating: null, maxSolvedRating: null, comfortRating: null, strength: 0.375,
    });
  });

  it('keeps the 5 newest attempts, newest first, ties by id', () => {
    const results = [8, 3, 9, 1, 9, 5, 7].map((day, i) => ({ problemId: `${i}/A`, solved: i % 2 === 0, at: at(day) }));
    expect(lastResults(results)).toEqual([
      { problemId: '2/A', solved: true },
      { problemId: '4/A', solved: true },
      { problemId: '0/A', solved: true },
      { problemId: '6/A', solved: true },
      { problemId: '5/A', solved: false },
    ]);
    expect(lastResults(results, 2)).toHaveLength(2);
    expect(lastResults([])).toEqual([]);
  });
});
