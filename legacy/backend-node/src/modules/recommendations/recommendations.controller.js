/** Controller for GET /recommendations, bound to an injected recommendations service. */
export const createRecommendationsController = ({ recommendationsService }) => ({
  getRecommendations: async (req, res, next) => {
    try {
      const { data, meta } = await recommendationsService.getRecommendations(req.user.id);
      res.json({ success: true, data, meta });
    } catch (err) {
      next(err);
    }
  },
});
