import { describe, expect, it } from 'vitest';
import {
  COPY_CONTEST_GAP, PICKED_BY, RECOMMENDATIONS, SYNC, TOPIC_BASES, VERIFY_REASONS,
} from '../../../src/config/constants.js';

describe('recommendation constants', () => {
  it('match the F10 spec', () => {
    expect(RECOMMENDATIONS).toMatchObject({
      topics: 3, problemsPerTopic: 5, minAttempted: 3, minStrength: 0.2, maxStrength: 0.75,
      frequencyWindow: 300, frequencyCacheMs: 3_600_000, defaultRating: 1200,
      targetLow: 100, targetHigh: 300, targetRounding: 100, recentFailed: 10,
    });
    expect(COPY_CONTEST_GAP).toBe(2);
    expect(Object.isFrozen(RECOMMENDATIONS)).toBe(true);
  });

  it('expose the response enums', () => {
    expect(TOPIC_BASES).toEqual({ learningZone: 'learning_zone', frequent: 'frequent' });
    expect(PICKED_BY).toEqual({ targetRange: 'target_range', similar: 'similar_fallback' });
    expect(VERIFY_REASONS).toEqual({ notSolved: 'NOT_SOLVED_YET', judging: 'STILL_JUDGING' });
  });

  it('sets the 20 s sync cooldown', () => {
    expect(SYNC.cooldownMs).toBe(20_000);
  });
});
