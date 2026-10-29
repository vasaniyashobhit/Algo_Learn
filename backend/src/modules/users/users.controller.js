import * as usersService from './users.service.js';

export const getMe = async (req, res, next) => {
  try {
    const data = await usersService.getProfile(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const data = await usersService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
