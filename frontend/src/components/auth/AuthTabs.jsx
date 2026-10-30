import { NavLink } from 'react-router';

const BASE =
  'flex justify-center p-4 font-display text-step-1 leading-none font-bold uppercase ' +
  'tracking-[0.06em] no-underline transition-colors duration-[160ms]';
// Colour classes live in exactly one of these so they never compete in the stylesheet.
const IDLE = 'bg-band-2 text-ink-soft hover:text-ink';
const ACTIVE = 'bg-band text-ink shadow-[inset_0_4px_0_var(--plate)]';

const segmentClass = ({ isActive }) => `${BASE} ${isActive ? ACTIVE : IDLE}`;

/** Log in / Sign up segments. They are routes, so they are links, not tabs. */
export const AuthTabs = () => (
  <nav aria-label="Account" className="grid grid-cols-2">
    <NavLink to="/login" className={segmentClass}>
      Log in
    </NavLink>
    <NavLink to="/signup" className={segmentClass}>
      Sign up
    </NavLink>
  </nav>
);
