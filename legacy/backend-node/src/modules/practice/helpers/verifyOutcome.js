import { VERIFY_REASONS } from '../../../config/constants.js';

const newestId = (rows) => Math.max(0, ...rows.map(({ cfSubmissionId }) => cfSubmissionId));

/**
 * Result of an "I solved it" check over the stored submissions and the still-pending ones
 * (both already limited to the problem and its Div1/Div2 copies). Any OK → solved. Otherwise
 * STILL_JUDGING when the newest submission is a pending one, else NOT_SOLVED_YET.
 */
export const verifyOutcome = ({ submissions = [], pending = [] }) => {
  if (submissions.some(({ verdict }) => verdict === 'OK')) return { solved: true };
  const judging = newestId(pending) > newestId(submissions);
  return { solved: false, reason: judging ? VERIFY_REASONS.judging : VERIFY_REASONS.notSolved };
};
