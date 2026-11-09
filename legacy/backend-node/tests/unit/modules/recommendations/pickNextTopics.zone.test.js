import { describe, expect, it } from 'vitest';
import {
  inLearningZone, pickNextTopics, topicPriority,
} from '../../../../src/modules/recommendations/helpers/pickNextTopics.js';

const freqOf = (shares, rating = 1500) => ({ rating, total: 100, frequency: shares });
const stat = (topicKey, attempted, strength, extra = {}) =>
  ({ topicKey, kind: 'single', attempted, solved: Math.round(attempted * strength), strength, comfortRating: 1400, ...extra });

describe('inLearningZone', () => {
  it('needs at least 3 attempted problems', () => {
    expect(inLearningZone({ attempted: 2, strength: 0.5 })).toBe(false);
    expect(inLearningZone({ attempted: 3, strength: 0.5 })).toBe(true);
  });

  it('includes both strength bounds 0.2 and 0.75 and nothing outside', () => {
    expect(inLearningZone({ attempted: 5, strength: 0.2 })).toBe(true);
    expect(inLearningZone({ attempted: 5, strength: 0.75 })).toBe(true);
    expect(inLearningZone({ attempted: 5, strength: 0.199 })).toBe(false);
    expect(inLearningZone({ attempted: 5, strength: 0.751 })).toBe(false);
  });
});

describe('topicPriority', () => {
  it('is (1 − strength) · log(1 + share)', () => {
    expect(topicPriority(0.4, 0.5)).toBeCloseTo(0.6 * Math.log(1.5));
    expect(topicPriority(0.4, 0)).toBe(0);
  });
});

describe('pickNextTopics — learning zone', () => {
  const freq = freqOf({ dp: 0.4, greedy: 0.4, math: 0.1, graphs: 0.5, trees: 0.3 });

  it('ranks zone topics by priority and skips weak, mastered and barely tried ones', () => {
    const stats = [
      stat('dp', 11, 0.4), stat('greedy', 6, 0.6), stat('math', 8, 0.3),
      stat('graphs', 10, 0.1), stat('trees', 2, 0.5), stat('strings', 9, 0.9),
    ];
    const picks = pickNextTopics(stats, freq);
    expect(picks.map(({ topic }) => topic)).toEqual(['dp', 'greedy', 'math']);
    expect(picks[0]).toMatchObject({
      basis: 'learning_zone', strength: 0.4, attempted: 11, comfortRating: 1400, frequency: 0.4,
      priority: Number((0.6 * Math.log(1.4)).toFixed(4)),
    });
  });

  it('breaks priority ties by lower strength, then name', () => {
    const tie = freqOf({ dp: 0.2, greedy: 0.2, math: 0.2 });
    const picks = pickNextTopics([stat('math', 5, 0.5), stat('greedy', 5, 0.4), stat('dp', 5, 0.5)], tie, 2);
    expect(picks.map(({ topic }) => topic)).toEqual(['greedy', 'dp']);
  });

  it('builds the reason from the stat and the share', () => {
    const [pick] = pickNextTopics([stat('dp', 11, 0.4, { solved: 4 })], freqOf({ dp: 0.22 }), 1);
    expect(pick.reason).toBe("You've solved 4 of 11 dp problems; dp shows up in 22% of problems at your level");
  });

  it('ignores pair stats and unknown keys', () => {
    const stats = [{ ...stat('dp+greedy', 9, 0.5), kind: 'pair' }, stat('*special', 9, 0.5), stat('dp', 9, 0.5)];
    const picks = pickNextTopics(stats, freqOf({ dp: 0.3 }), 1);
    expect(picks.map(({ topic }) => topic)).toEqual(['dp']);
  });
});
