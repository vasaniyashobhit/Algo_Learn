import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { getMe, updateMe } from './users.controller.js';
import { linkHandleSchema, updateMeSchema } from './users.schema.js';
import { createHandleController } from './handle.controller.js';
import { createSyncController } from '../sync/sync.controller.js';

/** Every /users route is protected by `requireAuth`. */
export const createUsersRouter = ({ requireAuth, handleService, syncService }) => {
  const { linkHandle, unlinkHandle } = createHandleController({ handleService });
  const { syncMe } = createSyncController({ syncService });
  const router = Router();
  router.use(requireAuth);
  router.get('/me', getMe);
  router.patch('/me', validate({ body: updateMeSchema }), updateMe);
  router.put('/me/handle', validate({ body: linkHandleSchema }), linkHandle);
  router.delete('/me/handle', unlinkHandle);
  router.post('/me/sync', syncMe);
  return router;
};
