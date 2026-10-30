import { STUCK } from '../../../config/constants.js';
import { topicTagsOf } from '../../problems/helpers/similarity.js';
import { median } from '../../stats/helpers/comfortRating.js';

/**
 * Most common topic tags of the nearest problems: tags shared by at least 2 of them (most
 * frequent first, ties alphabetical), or the single most frequent tag if none is shared.
 */
export const neighborTags = (neighbors, max = STUCK.maxNeighborTags) => {
  const counts = new Map();
  neighbors.forEach(({ tags }) => new Set(topicTagsOf(tags ?? [])).forEach((tag) => {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }));
  const ranked = [...counts].toSorted(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b));
  const shared = ranked.filter(([, count]) => count >= 2);
  return (shared.length ? shared : ranked.slice(0, 1)).slice(0, max).map(([tag]) => tag);
};

/** Median rating of the rated neighbors, rounded to 100 (null when none is rated). */
export const neighborRating = (neighbors) => {
  const ratings = neighbors.map(({ rating }) => rating).filter(Number.isFinite);
  return ratings.length ? Math.round(median(ratings) / 100) * 100 : null;
};
