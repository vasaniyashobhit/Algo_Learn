import { User } from './user.model.js';
import { toPublicUser } from './helpers/publicUser.js';
import { AuthError } from '../../errors/httpErrors.js';
import { codes } from '../../errors/codes.js';

// A valid token whose account is gone is treated like a bad token, so the client logs out.
const accountGone = () => new AuthError(codes.AUTH_INVALID_TOKEN, 'This account no longer exists');

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
