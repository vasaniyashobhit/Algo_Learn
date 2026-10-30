import { Navigate, Outlet, useLocation } from 'react-router';
import { getUserMessage, isUnexpectedError } from '../../errors/getUserMessage.js';
import { useAuth } from '../../hooks/useAuth.js';
import { ErrorState } from '../ui/ErrorState.jsx';
import { PageSkeleton } from './PageSkeleton.jsx';

/** Logged-in pages only: anonymous visitors go to /login and come back afterwards. */
export const ProtectedRoute = ({ children }) => {
  const { status, error, retry } = useAuth();
  const location = useLocation();

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (status === 'loading') return <PageSkeleton />;
  if (status === 'error') {
    return (
      <div className="wrap py-6">
        <ErrorState
          title="We couldn't load your account"
          message={getUserMessage(error, 'me')}
          requestId={isUnexpectedError(error) ? error?.requestId : undefined}
          onRetry={retry}
        />
      </div>
    );
  }
  return children ?? <Outlet />;
};
