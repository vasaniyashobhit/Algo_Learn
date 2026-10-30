import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useMeQuery } from '../../hooks/queries/auth.queries.js';
import { authStore } from '../../lib/authStore.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { AuthContext } from './AuthContext.js';

const statusOf = (token, me) => {
  if (!token) return 'anonymous';
  if (me.data) return 'authenticated';
  return me.isError ? 'error' : 'loading';
};

/** Token from the auth store plus GET /auth/me on load. */
export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(authStore.subscribe, authStore.getToken);
  const me = useMeQuery({ enabled: Boolean(token) });

  // A cleared token (logout, expiry) drops every cached query of the old session.
  useEffect(() => {
    if (!token) queryClient.removeQueries();
  }, [token, queryClient]);

  const signIn = useCallback(
    ({ token: nextToken, user }) => {
      queryClient.setQueryData(queryKeys.auth.me(), user);
      authStore.setToken(nextToken);
    },
    [queryClient],
  );

  const logout = useCallback(() => authStore.clear(), []);

  const status = statusOf(token, me);
  const { data, error, refetch } = me;
  const value = useMemo(
    () => ({ status, user: token ? (data ?? null) : null, error: error ?? null, retry: refetch, signIn, logout }),
    [status, token, data, error, refetch, signIn, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
