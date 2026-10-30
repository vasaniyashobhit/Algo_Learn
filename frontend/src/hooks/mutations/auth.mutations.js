import { useMutation } from '@tanstack/react-query';
import { login, signup } from '../../api/endpoints/auth.api.js';
import { useAuth } from '../useAuth.js';
import { usePrefetchDashboard } from '../usePrefetchDashboard.js';

const useAuthMutation = (request) => {
  const { signIn } = useAuth();
  const prefetchDashboard = usePrefetchDashboard();
  return useMutation({
    mutationFn: request,
    onSuccess: (session) => {
      signIn(session);
      prefetchDashboard(); // after signIn, so the requests carry the new token
    },
  });
};

/** POST /auth/login; on success the token is stored, the user cached and the dashboard prefetched. */
export const useLoginMutation = () => useAuthMutation(login);

/** POST /auth/signup; on success the new account is logged in and the dashboard prefetched. */
export const useSignupMutation = () => useAuthMutation(signup);
