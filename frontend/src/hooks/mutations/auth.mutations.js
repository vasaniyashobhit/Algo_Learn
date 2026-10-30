import { useMutation } from '@tanstack/react-query';
import { login, signup } from '../../api/endpoints/auth.api.js';
import { useAuth } from '../useAuth.js';

const useAuthMutation = (request) => {
  const { signIn } = useAuth();
  return useMutation({ mutationFn: request, onSuccess: signIn });
};

/** POST /auth/login; on success the token is stored and the user cached. */
export const useLoginMutation = () => useAuthMutation(login);

/** POST /auth/signup; on success the new account is logged in. */
export const useSignupMutation = () => useAuthMutation(signup);
