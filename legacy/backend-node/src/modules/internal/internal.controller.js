/**
 * POST /internal/sync-all: answers 202 at once and runs the job in the background.
 * `job.run()` never rejects (failures go to jobErrorHandler), so nothing is left unhandled.
 */
export const createInternalController = ({ syncAllUsersJob }) => ({
  syncAll: async (_req, res, next) => {
    try {
      syncAllUsersJob.run();
      res.status(202).json({ success: true, data: { started: true, job: syncAllUsersJob.name } });
    } catch (err) {
      next(err);
    }
  },
});
