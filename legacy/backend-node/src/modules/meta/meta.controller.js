import * as metaService from './meta.service.js';

export const getTags = async (_req, res, next) => {
  try {
    const data = await metaService.getTags();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
