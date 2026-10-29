import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { problemParamsSchema } from '../problems/problems.schema.js';
import { addPracticeSchema, practiceListQuerySchema, updatePracticeSchema } from './practice.schema.js';
import { createPracticeController } from './practice.controller.js';

/** Every /practice route is protected. A problem id "1/A" is addressed as /practice/1/A. */
export const createPracticeRouter = ({ requireAuth, practiceService }) => {
  const c = createPracticeController({ practiceService });
  const params = { params: problemParamsSchema };
  const router = Router();
  router.use(requireAuth);
  router.get('/', validate({ query: practiceListQuerySchema }), c.listPractice);
  router.post('/', validate({ body: addPracticeSchema }), c.addPractice);
  router.patch('/:contestId/:index', validate({ ...params, body: updatePracticeSchema }), c.updatePractice);
  router.delete('/:contestId/:index', validate(params), c.removePractice);
  router.post('/:contestId/:index/verify', validate(params), c.verifyPractice);
  return router;
};
