import { getMe } from '../users/users.controller.js';

/** Handlers bound to an auth service built by createAuthService. */
export const createAuthController = ({ authService }) => ({
  signup: async (req, res, next) => {
    try {
      const data = await authService.signup(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      const data = await authService.login(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // GET /auth/me and GET /users/me return the same profile.
  me: getMe,
});
