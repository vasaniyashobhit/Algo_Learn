/** Controller for POST /users/me/sync, bound to an injected sync service. */
export const createSyncController = ({ syncService }) => ({
  syncMe: async (req, res, next) => {
    try {
      const data = await syncService.syncUser(req.user.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
});
