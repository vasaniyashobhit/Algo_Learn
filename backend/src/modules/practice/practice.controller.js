import { problemId } from '../problems/problems.service.js';

const idOf = (req) => problemId(req.params.contestId, req.params.index);

/** Controllers for /practice, bound to an injected practice service (CRUD + verify). */
export const createPracticeController = ({ practiceService }) => ({
  listPractice: async (req, res, next) => {
    try {
      const { items, meta } = await practiceService.list(req.user.id, req.query);
      res.json({ success: true, data: items, meta });
    } catch (err) {
      next(err);
    }
  },

  addPractice: async (req, res, next) => {
    try {
      const data = await practiceService.add(req.user.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  updatePractice: async (req, res, next) => {
    try {
      const data = await practiceService.update(req.user.id, idOf(req), req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  removePractice: async (req, res, next) => {
    try {
      const data = await practiceService.remove(req.user.id, idOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  verifyPractice: async (req, res, next) => {
    try {
      const data = await practiceService.verify(req.user.id, idOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
});
