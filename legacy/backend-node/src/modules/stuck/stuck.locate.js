import { STUCK } from '../../config/constants.js';
import { topicTagsOf } from '../problems/helpers/similarity.js';
import { findExactMatch, searchQuery } from './helpers/problemMatch.js';
import { neighborRating, neighborTags } from './helpers/neighbors.js';

/**
 * Finds the problem in our DB: by id (Codeforces URL), else by an exact title/statement match
 * among the `$text` neighbors of the text. Returns `{ match, neighbors }` (neighbors null when
 * the id matched, so they are only searched if needed later).
 */
export const createLocator = ({ repo }) => {
  const search = (text) => repo.searchProblems(searchQuery(text), STUCK.neighbors);

  const locate = async ({ problemId, text }) => {
    if (problemId) {
      const byId = await repo.findProblem(problemId);
      if (byId) return { match: byId, neighbors: null };
    }
    if (!text) return { match: null, neighbors: [] };
    const neighbors = await search(text);
    return { match: findExactMatch(text, neighbors), neighbors };
  };

  /**
   * Tags in priority order: stored (db) → AI answer (ai) → most common tags of the 5 nearest
   * problems (neighbors) → none. Rating: stored → AI estimate → neighbors' median (last step only).
   */
  const detectTags = async ({ match, answer, neighbors, text }) => {
    const known = match?.rating ?? answer?.estimatedRating ?? null;
    const dbTags = topicTagsOf(match?.tags ?? []);
    if (dbTags.length) return { tags: dbTags, tagsSource: 'db', rating: known };
    if (answer?.tags?.length) return { tags: answer.tags, tagsSource: 'ai', rating: known };
    const found = neighbors ?? (text ? await search(text) : []);
    const near = found.filter(({ _id }) => _id !== match?._id);
    const tags = neighborTags(near);
    return { tags, tagsSource: tags.length ? 'neighbors' : null, rating: known ?? neighborRating(near) };
  };

  return { locate, detectTags };
};
