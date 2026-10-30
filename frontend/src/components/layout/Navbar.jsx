import { useAuth } from '../../hooks/useAuth.js';
import { ThemeToggle } from '../theme/ThemeToggle.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { NavItem } from './NavItem.jsx';
import { Wordmark } from './Wordmark.jsx';

/** The score bug: a sticky broadcast strip across the top of every screen (desktop layout). */
export const Navbar = () => {
  const { status } = useAuth();
  const signedIn = status === 'authenticated';

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-band">
      <div className="wrap flex min-h-[52px] items-stretch gap-6">
        <Wordmark to={signedIn ? '/dashboard' : '/'} />
        <nav aria-label="Main" className="mr-auto flex min-w-0 overflow-x-auto">
          {signedIn ? (
            <NavItem to="/dashboard">Dashboard</NavItem>
          ) : (
            <>
              <NavItem href="/#how">How it works</NavItem>
              <NavItem href="/#features">What you get</NavItem>
            </>
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-4 text-step--1 text-ink-soft">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
};
