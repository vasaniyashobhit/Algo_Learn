/** Controllers for /stuck, bound to an injected stuck feature (solve + history/get/solution/remove). */
export const createStuckController = ({ stuckService }) => ({
  solveStuck: async (req, res, next) => {
    try {
      const { inputType, text, url } = req.body;
      const data = await stuckService.solve({ userId: req.user.id, inputType, payload: { text, url, file: req.file } });
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  listStuckHistory: async (req, res, next) => {
    try {
      const { items, meta } = await stuckService.history(req.user.id, req.query);
      res.json({ success: true, data: items, meta });
    } catch (err) {
      next(err);
    }
  },

  getStuck: async (req, res, next) => {
    try {
      const data = await stuckService.get(req.user.id, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getStuckSolution: async (req, res, next) => {
    try {
      const data = await stuckService.solution(req.user.id, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  removeStuck: async (req, res, next) => {
    try {
      const data = await stuckService.remove(req.user.id, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
});
