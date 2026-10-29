import { TopicStat } from '../../src/modules/stats/topicStat.model.js';
import { PracticeItem } from '../../src/modules/practice/practiceItem.model.js';
import { createRecommendationsService } from '../../src/modules/recommendations/recommendations.service.js';
import { createTagCountsCache } from '../../src/modules/recommendations/tagCounts.cache.js';

/** A fresh service (and so a fresh, empty tag-frequency cache) per call. */
export const createTestRecommendationsService = (options = {}) =>
  createRecommendationsService({ tagCounts: createTagCountsCache(), ...options });

/** Single-topic stats of `userId`: each spec is `[topic, attempted, strength, comfortRating?]`. */
export const insertTopicStats = (userId, specs) =>
  TopicStat.insertMany(specs.map(([topicKey, attempted, strength, comfortRating = null]) => ({
    userId, topicKey, kind: 'single', attempted, solved: Math.round(attempted * strength), strength, comfortRating,
  })));

export const addToPractice = (userId, problemIds) =>
  PracticeItem.insertMany(problemIds.map((problemId) => ({ userId, problemId })));

export const topicOf = (data, topic) => data.topics.find((entry) => entry.topic === topic);

export const problemIds = (entry) => entry.problems.map(({ id }) => id);
