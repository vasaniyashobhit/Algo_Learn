/**
 * Background jobs have no `next`, so their errors come here: logged with context, never
 * re-thrown, and the job continues (with the next user). The process must never crash.
 */
export const createJobErrorHandler = (logger) => (err, context = {}) => {
  logger?.error({ err, ...context }, `Background job failed: ${context.job ?? 'unknown job'}`);
};
