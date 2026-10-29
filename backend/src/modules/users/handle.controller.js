/** Controllers for PUT/DELETE /users/me/handle, bound to an injected handle service. */
export const createHandleController = ({ handleService }) => ({
  linkHandle: async (req, res, next) => {
    try {
      const data = await handleService.linkHandle(req.user.id, req.body.handle);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  unlinkHandle: async (req, res, next) => {
    try {
      const data = await handleService.unlinkHandle(req.user.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
});
