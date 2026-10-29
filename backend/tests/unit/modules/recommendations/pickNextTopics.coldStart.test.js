import { describe, expect, it } from 'vitest';
import { pickNextTopics } from '../../../../src/modules/recommendations/helpers/pickNextTopics.js';

const freqOf = (shares, rating = 1200) => ({ rating, total: 100, frequency: shares });

describe('pickNextTopics — cold start and fill', () => {
  it('without stats picks the most frequent tags at the rating (ties by name)', () => {
    const picks = pickNextTopics([], freqOf({ math: 0.5, greedy: 0.3, dp: 0.3, graphs: 0.1 }));
    expect(picks.map(({ topic }) => topic)).toEqual(['math', 'dp', 'greedy']);
    expect(picks[0]).toEqual({
      topic: 'math', basis: 'frequent', strength: null, attempted: 0, solved: 0, comfortRating: null,
      frequency: 0.5, priority: null, reason: 'New topic for you: math shows up in 50% of problems at your level',
    });
  });

  it('says "rated around 1200" when the user has no rating', () => {
    const [pick] = pickNextTopics(undefined, freqOf({ dp: 0.25 }), 1, { ratingKnown: false });
    expect(pick.reason).toBe('New topic for you: dp shows up in 25% of problems rated around 1200');
  });

  it('fills missing slots with frequent topics, skipping mastered and picked ones', () => {
    const stats = [
      { topicKey: 'dp', kind: 'single', attempted: 5, solved: 2, strength: 0.4 },
      { topicKey: 'math', kind: 'single', attempted: 9, solved: 9, strength: 0.9 },
      { topicKey: 'greedy', kind: 'single', attempted: 1, solved: 1, strength: 0.6 },
    ];
    const picks = pickNextTopics(stats, freqOf({ math: 0.6, dp: 0.5, greedy: 0.4, graphs: 0.2 }));
    expect(picks.map(({ topic, basis }) => [topic, basis])).toEqual([
      ['dp', 'learning_zone'], ['greedy', 'frequent'], ['graphs', 'frequent'],
    ]);
    expect(picks[1].reason).toBe("You've solved 1 of 1 greedy problems; greedy shows up in 40% of problems at your level");
  });

  it('is never empty, even when no problem is in range', () => {
    const picks = pickNextTopics([], freqOf({}));
    expect(picks).toHaveLength(3);
    expect(picks.every(({ frequency }) => frequency === 0)).toBe(true);
  });

  it('returns exactly n', () => {
    expect(pickNextTopics([], freqOf({ dp: 0.1 }), 5)).toHaveLength(5);
  });
});
