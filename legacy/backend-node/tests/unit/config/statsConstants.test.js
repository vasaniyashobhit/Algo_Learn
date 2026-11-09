import { describe, expect, it } from 'vitest';
import { STATS, STATS_EMPTY_REASONS, STATS_VIEW } from '../../../src/config/constants.js';
import * as direct from '../../../src/config/statsConstants.js';

describe('stats constants', () => {
  it('match the agreed formula settings', () => {
    expect(STATS).toMatchObject({ halfLifeDays: 90, difficultyScale: 300, prior: 3, priorMean: 0.5, minPairAttempts: 2 });
    expect(STATS).toMatchObject({ comfortWindowDays: 365, comfortTopN: 5, comfortMinSolves: 3 });
    expect(STATS_VIEW).toMatchObject({ topN: 5, minWeakAttempts: 3, activityDays: 30, maxLimit: 630 });
    expect(STATS_EMPTY_REASONS).toEqual({ noHandle: 'NO_HANDLE', notSynced: 'NOT_SYNCED' });
    expect(Object.isFrozen(STATS) && Object.isFrozen(STATS_VIEW)).toBe(true);
  });

  it('are re-exported unchanged by constants.js', () => {
    expect(direct.STATS).toBe(STATS);
    expect(direct.STATS_VIEW).toBe(STATS_VIEW);
  });
});
