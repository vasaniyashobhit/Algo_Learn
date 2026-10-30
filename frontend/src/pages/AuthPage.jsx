import { Navigate, useLocation, useNavigate } from 'react-router';
import { AuthLayout } from '../components/auth/AuthLayout.jsx';
import { LoginForm } from '../components/auth/LoginForm.jsx';
import { SignupForm } from '../components/auth/SignupForm.jsx';
import { Notice } from '../components/ui/Notice.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const MODES = {
  login: { title: 'Log in', Form: LoginForm },
  signup: { title: 'Sign up', Form: SignupForm },
};

const DEFAULT_DESTINATION = '/dashboard';

/** /login and /signup. Signed-in visitors skip straight to where they were going. */
export const AuthPage = ({ mode }) => {
  const { title, Form } = MODES[mode] ?? MODES.login;
  usePageTitle(title);
  const { status } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const destination = state?.from ?? DEFAULT_DESTINATION;

  if (status === 'authenticated') return <Navigate to={destination} replace />;

  const notice =
    state?.reason === 'expired' ? (
      <Notice tone="info">
        <p>Your session expired. Log in again to pick up where you left off.</p>
      </Notice>
    ) : null;

  return (
    <AuthLayout title={title} notice={notice}>
      <Form onSuccess={() => navigate(destination, { replace: true })} />
    </AuthLayout>
  );
};
