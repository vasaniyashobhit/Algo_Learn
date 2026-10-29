/** Controllers for GET /users/me/stats and /users/me/stats/summary, bound to a stats service. */
export const createStatsController = ({ statsService }) => ({
  getMyStats: async (req, res, next) => {
    try {
      const { items, meta } = await statsService.getStats(req.user.id, req.query);
      res.json({ success: true, data: items, meta });
    } catch (err) {
      next(err);
    }
  },

  getMySummary: async (req, res, next) => {
    try {
      const { data, meta } = await statsService.getSummary(req.user.id);
      res.json({ success: true, data, meta });
    } catch (err) {
      next(err);
    }
  },
});
