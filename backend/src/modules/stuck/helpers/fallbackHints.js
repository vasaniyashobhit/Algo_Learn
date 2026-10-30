import { STUCK } from '../../../config/constants.js';
import { topicLabel } from './gapAnalysis.js';

const MAX_PARAGRAPH = 500;
const GENERIC_HINT = 'Start from the constraints: they tell you which time complexity the intended solution needs.';

/** First non-empty paragraph of an editorial (capped), or null. */
export const firstParagraph = (editorial) => {
  const paragraph = String(editorial ?? '').split(/\n\s*\n/).map((part) => part.trim()).find(Boolean);
  if (!paragraph) return null;
  return paragraph.length > MAX_PARAGRAPH ? `${paragraph.slice(0, MAX_PARAGRAPH - 1)}…` : paragraph;
};

/**
 * Hints without AI (never empty): the likely topics, the weakest gap topic to review, and the
 * editorial's first paragraph; a generic hint when none of these is known.
 */
export const fallbackHints = ({ tags = [], gapItems = [], editorial = null }) => {
  const hints = [];
  if (tags.length) hints.push(`This problem most likely uses ${tags.map(topicLabel).join(', ')}.`);
  const weakest = gapItems.find(({ kind }) => kind === 'single');
  if (weakest) hints.push(`Review ${topicLabel(weakest.topicKey)} first. ${weakest.message}`);
  const paragraph = firstParagraph(editorial);
  if (paragraph) hints.push(`From the editorial: ${paragraph}`);
  if (!hints.length) hints.push(GENERIC_HINT);
  return hints.slice(0, STUCK.maxHints);
};
