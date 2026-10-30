import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from './useAuth.js';

/**
 * Leaves for the landing page first, then clears the session: clearing first would let a
 * protected page redirect to /login before the navigation lands.
 */
export const useLogout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return useCallback(async () => {
    await navigate('/', { replace: true });
    logout();
    toast.success("You're logged out.");
  }, [logout, navigate]);
};
