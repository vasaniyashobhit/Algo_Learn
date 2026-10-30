import { useActiveIntoView } from '../../hooks/useActiveIntoView.js';
import { useAuth } from '../../hooks/useAuth.js';
import { ThemeToggle } from '../theme/ThemeToggle.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { NavItem } from './NavItem.jsx';
import { Wordmark } from './Wordmark.jsx';

/**
 * The score bug: a sticky broadcast strip across the top of every screen. Below 860px the links
 * drop to their own full-width row (scrollable sideways), so nothing pushes the page wider.
 */
export const Navbar = () => {
  const { status } = useAuth();
  const signedIn = status === 'authenticated';
  const navRef = useActiveIntoView();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-band">
      <div className="wrap flex min-h-[52px] flex-wrap items-stretch gap-x-6 max-[860px]:gap-x-3">
        <Wordmark to={signedIn ? '/dashboard' : '/'} />
        <nav ref={navRef} aria-label="Main" className="nav-strip mr-auto flex min-w-0 overflow-x-auto max-[860px]:order-last max-[860px]:-mx-[0.9rem] max-[860px]:min-h-11 max-[860px]:basis-[calc(100%+1.8rem)] max-[860px]:border-t max-[860px]:border-line">
          {signedIn ? (
            <>
              <NavItem to="/dashboard">Dashboard</NavItem>
              <NavItem to="/stuck">I'm stuck</NavItem>
              <NavItem to="/problems">Problems</NavItem>
              <NavItem to="/practice">Practice</NavItem>
              <NavItem to="/history">History</NavItem>
            </>
          ) : (
            <>
              <NavItem href="/#how">How it works</NavItem>
              <NavItem href="/#features">What you get</NavItem>
            </>
          )}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-4 text-step--1 text-ink-soft">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
};
