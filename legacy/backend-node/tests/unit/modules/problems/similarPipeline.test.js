import { describe, expect, it } from 'vitest';
import { buildSimilarPipeline } from '../../../../src/modules/problems/helpers/similarPipeline.js';

const base = { tags: ['dp', 'greedy'], target: 1500, window: 300, k: 5 };
const matchOf = (pipeline) => pipeline[0].$match;

describe('buildSimilarPipeline', () => {
  it('matches tags with $in and the rating window when asked', () => {
    expect(matchOf(buildSimilarPipeline({ ...base, filterRating: true }))).toEqual({
      tags: { $in: ['dp', 'greedy'] },
      rating: { $gte: 1200, $lte: 1800 },
    });
  });

  it('can drop the tag and rating filters', () => {
    expect(matchOf(buildSimilarPipeline({ ...base, useTags: false }))).toEqual({});
  });

  it('excludes ids and titles only when given', () => {
    const match = matchOf(buildSimilarPipeline({ ...base, excludeIds: ['1/A'], excludeTitles: ['T'] }));
    expect(match._id).toEqual({ $nin: ['1/A'] });
    expect(match.title).toEqual({ $nin: ['T'] });
  });

  it('sorts by score, closeness, distance, then _id and limits to k', () => {
    const pipeline = buildSimilarPipeline(base);
    const sort = pipeline.find((stage) => stage.$sort).$sort;
    expect(Object.entries(sort)).toEqual([['score', -1], ['ratingCloseness', -1], ['_sortDistance', 1], ['_id', 1]]);
    expect(pipeline.find((stage) => stage.$limit).$limit).toBe(5);
  });

  it('projects summary fields plus similarity, never statement text', () => {
    const { $project } = buildSimilarPipeline(base).at(-1);
    expect($project).toMatchObject({ title: 1, rating: 1, tags: 1, similarity: expect.any(Object) });
    expect($project).not.toHaveProperty('description');
    expect($project).not.toHaveProperty('editorial');
  });

  it('uses a null distance when there is no target rating', () => {
    const pipeline = buildSimilarPipeline({ ...base, target: null });
    const distanceStage = pipeline.find((stage) => stage.$addFields?._distance);
    expect(distanceStage.$addFields._distance).toEqual({ $literal: null });
  });
});
