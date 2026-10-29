import { sha256Hex } from '../../../lib/hash.js';

/** Unicode NFKC, unified line endings, whitespace runs collapsed, trimmed (case is kept). */
export const normalizeProblemText = (text) =>
  String(text ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();

/** `problem:<id>` when the problem is known, else `text:<sha256 of normalized text>`, else null. */
export const coachCacheKey = ({ problemId, text } = {}) => {
  if (problemId) return `problem:${problemId}`;
  const normalized = normalizeProblemText(text);
  return normalized ? `text:${sha256Hex(normalized)}` : null;
};
