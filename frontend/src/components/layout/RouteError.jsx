import { isRouteErrorResponse, useRouteError } from 'react-router';
import { NotFoundPage } from '../../pages/NotFoundPage.jsx';
import { CrashScreen } from './CrashScreen.jsx';

/** The router's errorElement: a 404 response shows the not-found page, anything else recovers. */
export const RouteError = () => {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  console.error('AlgoLearn route error', error);
  return <CrashScreen error={error} />;
};
