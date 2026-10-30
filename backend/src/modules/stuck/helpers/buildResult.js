import { STUCK_FALLBACK_NOTICE } from '../../../config/constants.js';
import { fallbackHints } from './fallbackHints.js';

const SOLUTION_FIELDS = ['approach', 'solutionSteps', 'complexity', 'code', 'pitfalls'];

/** The full AI solution kept for GET /stuck/:id/solution (null without an AI answer). */
export const solutionOf = (answer) =>
  (answer?.approach ? Object.fromEntries(SOLUTION_FIELDS.map((field) => [field, answer[field] ?? null])) : null);

/**
 * Public stuck result (pure): hints and gap first, the full solution only on request.
 * On `source: "fallback"` the notice is set and hints come from the gap and the editorial.
 */
export const buildResult = ({ coach, problem, editorial, gap, similar }) => {
  const isFallback = coach.source === 'fallback';
  const aiHints = coach.answer?.hints ?? [];
  return {
    source: coach.source,
    notice: isFallback ? STUCK_FALLBACK_NOTICE : null,
    fallbackReason: isFallback ? coach.reason : null,
    problem,
    hints: aiHints.length ? aiHints : fallbackHints({ tags: problem.tags, gapItems: gap.items, editorial }),
    hasSolution: Boolean(solutionOf(coach.answer)),
    editorialAvailable: Boolean(String(editorial ?? '').trim()),
    gap,
    similar,
  };
};
