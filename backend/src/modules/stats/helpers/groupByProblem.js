const ACCEPTED = 'OK';

const fromSubmission = (sub) => ({
  problemId: sub.problemId,
  rating: sub.problemRating ?? null,
  tags: [...(sub.problemTags ?? [])],
  solved: sub.verdict === ACCEPTED,
  attempts: 1,
  lastAt: new Date(sub.submittedAt),
});

/**
 * One entry per problem: `{ problemId, rating, tags, solved, attempts, lastAt }`.
 * `solved` = any verdict OK. Rating and tags come from the newest submission that has them
 * (Codeforces can retag a problem after it was first attempted), so submissions are read
 * oldest first and a later one only overrides what it actually carries.
 */
export const groupByProblem = (submissions) => {
  const byId = new Map();
  const oldestFirst = submissions.map(fromSubmission).toSorted((a, b) => a.lastAt - b.lastAt);
  for (const next of oldestFirst) {
    const current = byId.get(next.problemId);
    if (!current) {
      byId.set(next.problemId, next);
      continue;
    }
    current.attempts += 1;
    current.solved ||= next.solved;
    current.lastAt = next.lastAt;
    current.rating = next.rating ?? current.rating;
    if (next.tags.length) current.tags = next.tags;
  }
  return [...byId.values()];
};
