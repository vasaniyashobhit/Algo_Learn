import * as problemsService from './problems.service.js';

export const listProblems = async (req, res, next) => {
  try {
    const { items, meta } = await problemsService.list(req.query);
    res.json({ success: true, data: items, meta });
  } catch (err) {
    next(err);
  }
};

export const getProblem = async (req, res, next) => {
  try {
    const data = await problemsService.getById(req.params.contestId, req.params.index);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSimilar = async (req, res, next) => {
  try {
    const id = problemsService.problemId(req.params.contestId, req.params.index);
    const { items, meta } = await problemsService.findSimilarToProblem(id, req.query);
    res.json({ success: true, data: items, meta });
  } catch (err) {
    next(err);
  }
};
