import { Router } from 'express';
import { createRecommendationsController } from './recommendations.controller.js';

/** GET /recommendations (protected). */
export const createRecommendationsRouter = ({ requireAuth, recommendationsService }) => {
  const { getRecommendations } = createRecommendationsController({ recommendationsService });
  const router = Router();
  router.use(requireAuth);
  router.get('/', getRecommendations);
  return router;
};
