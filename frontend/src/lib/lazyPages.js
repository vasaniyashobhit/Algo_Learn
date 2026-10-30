import { lazy } from 'react';

/**
 * Page modules loaded on demand (one chunk per route). Each loader is kept so the same chunk
 * can be prefetched (e.g. the dashboard right after login) before React asks for it.
 */
export const pageLoaders = {
  dashboard: () => import('../pages/DashboardPage.jsx'),
  practice: () => import('../pages/PracticePage.jsx'),
  stuck: () => import('../pages/StuckPage.jsx'),
  stuckResult: () => import('../pages/StuckResultPage.jsx'),
  history: () => import('../pages/HistoryPage.jsx'),
  problems: () => import('../pages/ProblemsPage.jsx'),
  problem: () => import('../pages/ProblemPage.jsx'),
  similar: () => import('../pages/SimilarPage.jsx'),
};

/** React.lazy for a named export: `lazyPage('dashboard', 'DashboardPage')`. */
export const lazyPage = (key, exportName) =>
  lazy(async () => ({ default: (await pageLoaders[key]())[exportName] }));
