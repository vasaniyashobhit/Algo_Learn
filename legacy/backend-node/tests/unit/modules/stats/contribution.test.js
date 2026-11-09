import { describe, expect, it } from 'vitest';
import { problemContribution } from '../../../../src/modules/stats/helpers/contribution.js';
import { DAY_MS } from '../../../../src/modules/stats/helpers/decay.js';

const NOW = new Date('2026-10-29T12:00:00Z');
const problem = (overrides) => ({ rating: 1200, solved: true, lastAt: NOW, ...overrides });

describe('problemContribution', () => {
  it('solved at the user rating today: d·(0.5 + 0.5) = 1', () => {
    expect(problemContribution(problem(), 1200, NOW)).toEqual({ solvedScore: 1, failScore: 0 });
  });

  it('a harder solve counts more: 0.5 + sigmoid(1) = 1.2310586', () => {
    expect(problemContribution(problem({ rating: 1500 }), 1200, NOW).solvedScore).toBeCloseTo(1.2310586, 7);
  });

  it('failing an easy problem hurts more than failing a hard one', () => {
    const easy = problemContribution(problem({ rating: 900, solved: false }), 1200, NOW);
    const hard = problemContribution(problem({ rating: 1500, solved: false }), 1200, NOW);
    expect(easy).toEqual({ solvedScore: 0, failScore: expect.closeTo(1.2310586, 7) });
    expect(hard.failScore).toBeCloseTo(0.7689414, 7);
  });

  it('decays with age: solved 90 days ago at the user rating = 0.5', () => {
    const old = problem({ lastAt: new Date(NOW - 90 * DAY_MS) });
    expect(problemContribution(old, 1200, NOW).solvedScore).toBeCloseTo(0.5, 12);
  });

  it('uses the neutral weight for an unrated problem or user', () => {
    expect(problemContribution(problem({ rating: null, solved: false }), 1200, NOW).failScore).toBe(1);
    expect(problemContribution(problem({ rating: 2000 }), null, NOW).solvedScore).toBe(1);
  });
});
