import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { getProblem, getSimilar, listProblems } from './problems.controller.js';
import { listQuerySchema, problemParamsSchema, similarQuerySchema } from './problems.schema.js';

/** Public routes: browsing and similar search need no account. */
export const problemsRouter = Router();

problemsRouter.get('/', validate({ query: listQuerySchema }), listProblems);
problemsRouter.get('/:contestId/:index', validate({ params: problemParamsSchema }), getProblem);
problemsRouter.get(
  '/:contestId/:index/similar',
  validate({ params: problemParamsSchema, query: similarQuerySchema }),
  getSimilar,
);
