import { AppShell } from './components/layout/AppShell.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { RouteError } from './components/layout/RouteError.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { PracticePage } from './pages/PracticePage.jsx';
import { SimilarPage } from './pages/SimilarPage.jsx';

/** Route objects, shared by the browser router and the tests' memory router. */
export const routes = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <AuthPage mode="login" /> },
      { path: 'signup', element: <AuthPage mode="signup" /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'practice', element: <PracticePage /> },
          { path: 'problems/:contestId/:index/similar', element: <SimilarPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
