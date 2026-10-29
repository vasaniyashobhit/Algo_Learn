import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { getMe, updateMe } from './users.controller.js';
import { updateMeSchema } from './users.schema.js';

/** Every /users route is protected by `requireAuth`. */
export const createUsersRouter = ({ requireAuth }) => {
  const router = Router();
  router.use(requireAuth);
  router.get('/me', getMe);
  router.patch('/me', validate({ body: updateMeSchema }), updateMe);
  return router;
};
