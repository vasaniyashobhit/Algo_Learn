import { Suspense } from 'react';
import { AppShell } from './components/layout/AppShell.jsx';
import { PageSkeleton } from './components/layout/PageSkeleton.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { RouteError } from './components/layout/RouteError.jsx';
import { RouteFallback } from './components/layout/RouteFallback.jsx';
import { HistorySkeleton } from './components/history/HistorySkeleton.jsx';
import { PracticeSkeleton } from './components/practice/PracticeSkeleton.jsx';
import { ProblemDetailSkeleton } from './components/problems/ProblemDetailSkeleton.jsx';
import { ProblemTableSkeleton } from './components/problems/ProblemTableSkeleton.jsx';
import { RecommendationsSkeleton } from './components/recommendations/RecommendationsSkeleton.jsx';
import { StuckResultSkeleton } from './components/stuck/StuckResultSkeleton.jsx';
import { lazyPage } from './lib/lazyPages.js';
import { AuthPage } from './pages/AuthPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

// The landing, auth and 404 pages ship in the entry chunk (first visit, and RouteError uses the
// 404); every signed-in page,
// with its charts or KaTeX, is its own chunk loaded on first use.
const DashboardPage = lazyPage('dashboard', 'DashboardPage');
const PracticePage = lazyPage('practice', 'PracticePage');
const StuckPage = lazyPage('stuck', 'StuckPage');
const StuckResultPage = lazyPage('stuckResult', 'StuckResultPage');
const HistoryPage = lazyPage('history', 'HistoryPage');
const ProblemsPage = lazyPage('problems', 'ProblemsPage');
const ProblemPage = lazyPage('problem', 'ProblemPage');
const SimilarPage = lazyPage('similar', 'SimilarPage');

/** A lazy page behind Suspense with a skeleton shaped like that page. */
const page = (Page, fallback) => (
  <Suspense fallback={fallback}>
    <Page />
  </Suspense>
);
const inColumn = (skeleton) => <RouteFallback>{skeleton}</RouteFallback>;

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
          { path: 'dashboard', element: page(DashboardPage, <PageSkeleton />) },
          { path: 'practice', element: page(PracticePage, inColumn(<PracticeSkeleton />)) },
          { path: 'stuck', element: page(StuckPage, inColumn(null)) },
          { path: 'stuck/:id', element: page(StuckResultPage, <StuckResultSkeleton />) },
          { path: 'history', element: page(HistoryPage, inColumn(<HistorySkeleton />)) },
          { path: 'problems', element: page(ProblemsPage, inColumn(<ProblemTableSkeleton />)) },
          { path: 'problems/:contestId/:index', element: page(ProblemPage, <ProblemDetailSkeleton />) },
          { path: 'problems/:contestId/:index/similar', element: page(SimilarPage, inColumn(<RecommendationsSkeleton />)) },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
