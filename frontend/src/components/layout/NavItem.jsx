import { NavLink } from 'react-router';

const BASE =
  'flex items-center whitespace-nowrap px-[0.9rem] font-display text-base leading-none font-semibold uppercase tracking-[0.06em] ' +
  'no-underline transition-colors duration-[160ms]';
// Colour classes live in exactly one of these so they never compete in the stylesheet.
const IDLE = 'text-ink-soft hover:text-ink';
const ACTIVE = 'text-ink shadow-[inset_0_-3px_0_var(--plate)]';

/** A score-bug link: Ink Soft, turning Ink with a plate underline when it is the current page. */
export const NavItem = ({ to, href, children }) => {
  if (href) {
    return (
      <a href={href} className={`${BASE} ${IDLE}`}>
        {children}
      </a>
    );
  }
  return (
    <NavLink to={to} className={({ isActive }) => `${BASE} ${isActive ? ACTIVE : IDLE}`}>
      {children}
    </NavLink>
  );
};
