import { Problem as ProblemModel } from '../problems/problem.model.js';
import { RECOMMENDATIONS } from '../../config/constants.js';
import { tagCountsPipeline, toTagCounts } from './helpers/topicFrequency.js';

/**
 * In-memory cache of the per-rating tag counts (one aggregation per `ttlMs`, default 1 hour).
 * Concurrent callers share one in-flight aggregation; a failed one is not cached.
 */
export const createTagCountsCache = ({
  Problem = ProblemModel,
  ttlMs = RECOMMENDATIONS.frequencyCacheMs,
  now = () => Date.now(),
} = {}) => {
  let entry = null;

  const load = async () => toTagCounts(await Problem.aggregate(tagCountsPipeline()));

  const get = async () => {
    if (entry && now() - entry.at < ttlMs) return entry.value;
    const at = now();
    const value = load();
    entry = { at, value };
    try {
      return await value;
    } catch (err) {
      if (entry?.value === value) entry = null;
      throw err;
    }
  };

  const clear = () => {
    entry = null;
  };

  return { get, clear };
};
