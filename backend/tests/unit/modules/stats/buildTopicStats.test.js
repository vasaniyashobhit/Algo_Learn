import { describe, expect, it } from 'vitest';
import { buildTopicStats } from '../../../../src/modules/stats/helpers/buildTopicStats.js';

const NOW = new Date('2026-10-29T00:00:00Z');
const problem = (tags, rating, solved) => ({ problemId: `${tags}/${rating}`, tags, rating, solved, attempts: 1, lastAt: NOW });
const byKey = (stats) => Object.fromEntries(stats.map((stat) => [stat.topicKey, stat]));

describe('buildTopicStats', () => {
  it('computes hand-checked strengths (user 1200, everything today)', () => {
    const stats = byKey(buildTopicStats([
      problem(['dp', 'greedy'], 1200, true), // solvedScore 1 for dp, greedy
      problem(['dp'], 1500, false), // failScore 1.5 − sigmoid(1) = 0.7689414 for dp
    ], 1200, NOW));
    expect(stats.dp).toMatchObject({ attempted: 2, solved: 1, failed: 1, kind: 'single' });
    expect(stats.dp.strength).toBeCloseTo(0.5242254, 6); // 2.5 / 4.7689414
    expect(stats.greedy.strength).toBe(0.625); // (1 + 1.5) / (1 + 3)
  });

  it('a topic with one solve never reaches 1.0, even for a very hard problem', () => {
    const [stat] = buildTopicStats([problem(['dp'], 3500, true)], 800, NOW);
    expect(stat.strength).toBeLessThan(2 / 3);
    expect(stat.strength).toBeGreaterThan(0.666);
  });

  it('keeps a pair only when attempted on at least 2 problems', () => {
    const once = buildTopicStats([problem(['dp', 'greedy'], 1200, true)], 1200, NOW);
    expect(once.map(({ topicKey }) => topicKey)).toEqual(['dp', 'greedy']);
    const twice = byKey(buildTopicStats([
      problem(['dp', 'greedy'], 1200, true),
      problem(['greedy', 'dp', 'math'], 1300, false),
    ], 1200, NOW));
    expect(twice['dp+greedy']).toMatchObject({ kind: 'pair', attempted: 2, solved: 1, failed: 1 });
    expect(twice['dp+math']).toBeUndefined();
    expect(twice.math).toMatchObject({ attempted: 1 });
  });

  it('excludes "*special" (alone it adds nothing; with tags only the topic tags count)', () => {
    const stats = buildTopicStats([
      problem(['*special'], 1500, true),
      problem(['*special', 'dp'], 1500, true),
      problem(['*special', 'dp'], 1600, false),
    ], 1200, NOW);
    expect(stats.map(({ topicKey }) => topicKey)).toEqual(['dp']);
    expect(stats[0]).toMatchObject({ attempted: 2, solved: 1, maxSolvedRating: 1500 });
  });

  it('returns nothing for no problems or untagged problems', () => {
    expect(buildTopicStats([], 1200, NOW)).toEqual([]);
    expect(buildTopicStats([problem([], 1200, true)], 1200, NOW)).toEqual([]);
  });
});
