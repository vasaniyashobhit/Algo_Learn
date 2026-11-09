import bcrypt from 'bcrypt';
import { User as UserModel } from '../users/user.model.js';
import { toPublicUser } from '../users/helpers/publicUser.js';
import { AuthError, ConflictError } from '../../errors/httpErrors.js';
import { codes } from '../../errors/codes.js';

export const DEFAULT_HASH_ROUNDS = 12;
const DUPLICATE_KEY = 11000;

const invalidCredentials = () =>
  new AuthError(codes.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');

/**
 * signup / login. `tokens` comes from createTokenService; `User` and `hashRounds`
 * are injectable so tests can use a cheap cost factor.
 */
export const createAuthService = ({ tokens, User = UserModel, hashRounds = DEFAULT_HASH_ROUNDS }) => {
  let dummyHash;
  // Compared against when the email is unknown, so both failures take about the same time.
  const getDummyHash = () => {
    dummyHash ??= bcrypt.hash('not-a-real-password-0', hashRounds);
    return dummyHash;
  };

  const issue = (user) => {
    const publicUser = toPublicUser(user);
    return { token: tokens.sign(publicUser), user: publicUser };
  };

  const signup = async ({ email, password, name }) => {
    const passwordHash = await bcrypt.hash(password, hashRounds);
    try {
      const user = await User.create({ email, passwordHash, name });
      return issue(user);
    } catch (err) {
      if (err?.code === DUPLICATE_KEY) {
        throw new ConflictError(codes.AUTH_EMAIL_TAKEN, 'An account with this email already exists',
          null, { cause: err });
      }
      throw err;
    }
  };

  const login = async ({ email, password }) => {
    const user = await User.findOne({ email }).select('+passwordHash').lean();
    const matches = await bcrypt.compare(password, user?.passwordHash ?? await getDummyHash());
    if (!user || !matches) throw invalidCredentials();
    return issue(user);
  };

  return { signup, login };
};
