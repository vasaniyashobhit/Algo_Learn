import { describe, expect, it } from 'vitest';
import { emptySummary, radarStats, syncedSummary, topicStat } from '../test/dashboardFixtures.js';
import { radarRows, radarSummary, statTiles } from './dashboardData.js';

describe('dashboard data', () => {
  it('keeps at most 8 radar topics in API order', () => {
    const rows = radarRows([...radarStats, topicStat('strings')]);
    expect(rows).toHaveLength(8);
    expect(rows[0]).toEqual({ topic: 'greedy', strength: 0.69, attempted: 60, solved: 6 });
    expect(radarRows()).toEqual([]);
  });

  it('summarises the radar for screen readers with the two weakest topics', () => {
    expect(radarSummary(radarRows(radarStats))).toBe(
      'Strength on your 8 most practised topics, from 0 to 1. Weakest: dp 0.38, graphs 0.41.',
    );
  });

  it('builds the five scoreboard figures', () => {
    const tiles = statTiles(syncedSummary.data, { cfRating: 1487 });
    expect(Object.fromEntries(tiles.map((tile) => [tile.key, tile.value]))).toEqual({
      rating: 1487,
      solved: 412,
      notSolved: 37,
      active: 3,
      topics: 31,
    });
  });

  it('has no rating figure without a rated contest and never a negative count', () => {
    const tiles = statTiles(emptySummary('NOT_SYNCED').data);
    expect(tiles[0].value).toBeNull();
    expect(tiles.find((tile) => tile.key === 'notSolved').value).toBe(0);
  });
});
