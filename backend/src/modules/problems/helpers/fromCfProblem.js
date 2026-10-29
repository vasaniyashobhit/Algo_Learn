import { cleanTags, cleanText, toNumberOrNull } from './cleanProblem.js';
import { problemDerivedFields } from './derivedFields.js';
import { ALL_TAGS } from '../../../config/tags.js';

const KNOWN_TAGS = new Set(ALL_TAGS);

/**
 * Maps a Codeforces API Problem object (`problemset.problems`) to a `problems` document.
 * The API has no statements, so text fields stay empty (schema defaults) and source is "cf_api".
 * Tags CF adds in the future are dropped instead of rejecting the whole problem.
 */
export const fromCfProblem = (cfProblem) => {
  const contestId = toNumberOrNull(cfProblem?.contestId);
  const index = cleanText(cfProblem?.index);
  const tags = cleanTags(cfProblem?.tags).filter((tag) => KNOWN_TAGS.has(tag));
  return {
    _id: `${contestId}/${index}`,
    contestId,
    index,
    title: cleanText(cfProblem?.name),
    rating: toNumberOrNull(cfProblem?.rating),
    tags,
    ...problemDerivedFields({ tags }),
    source: 'cf_api',
  };
};
