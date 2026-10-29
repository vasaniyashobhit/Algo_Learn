import { User } from './user.model.js';
import { toPublicUser } from './helpers/publicUser.js';
import { accountGone } from './helpers/accountGone.js';

export const getProfile = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) throw accountGone();
  return toPublicUser(user);
};

export const updateProfile = async (userId, { name }) => {
  const user = await User.findByIdAndUpdate(userId, { $set: { name } }, { new: true, runValidators: true })
    .lean();
  if (!user) throw accountGone();
  return toPublicUser(user);
};
