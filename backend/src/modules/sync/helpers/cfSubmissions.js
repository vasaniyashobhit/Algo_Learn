import { CF_VERDICTS } from '../../../config/constants.js';

const FINAL_VERDICTS = new Set(CF_VERDICTS.filter((verdict) => verdict !== 'TESTING'));

/** Still being judged: no verdict yet, or TESTING. Its final verdict arrives on a later sync. */
export const isPending = (submission) => !FINAL_VERDICTS.has(submission?.verdict);

/** Worth storing: a judged submission to a problem that belongs to a contest. */
export const isStorable = (submission) =>
  Number.isInteger(submission?.problem?.contestId) && !isPending(submission);

/** Maps a CF API Submission object to a `submissions` document of `userId`. */
export const toSubmissionDoc = (userId) => ({ id, problem, verdict, creationTimeSeconds }) => ({
  cfSubmissionId: id,
  userId,
  problemId: `${problem.contestId}/${problem.index}`,
  contestId: problem.contestId,
  index: problem.index,
  problemRating: problem.rating ?? null,
  problemTags: problem.tags ?? [],
  verdict,
  submittedAt: new Date(creationTimeSeconds * 1000),
});

const maxId = (submissions) => Math.max(...submissions.map(({ id }) => id));

/**
 * The next `lastSubmissionId`. It never moves past a pending submission, so the next sync
 * fetches it again once it is judged (already-stored newer ones are ignored as duplicates).
 */
export const nextCursor = (fetched, previous = null) => {
  const pendingIds = fetched.filter(isPending).map(({ id }) => id);
  const lowestPending = pendingIds.length ? Math.min(...pendingIds) : Infinity;
  const safe = fetched.filter(({ id }) => id < lowestPending);
  if (!safe.length) return previous;
  return Math.max(previous ?? 0, maxId(safe));
};

/** Drops repeats (pages can overlap when new submissions arrive mid-sync). */
export const uniqueById = (submissions) => [...new Map(submissions.map((s) => [s.id, s])).values()];
