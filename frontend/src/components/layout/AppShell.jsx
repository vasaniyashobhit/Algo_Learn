import { Outlet, ScrollRestoration } from 'react-router';
import { PageTransition } from '../motion/PageTransition.jsx';
import { Navbar } from './Navbar.jsx';

/** Score bug on top, the routed page below. */
export const AppShell = () => (
  <>
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-20 focus:bg-plate focus:px-3 focus:py-2 focus:text-plate-ink"
    >
      Skip to content
    </a>
    <Navbar />
    <PageTransition>
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
    </PageTransition>
    <ScrollRestoration />
  </>
);
