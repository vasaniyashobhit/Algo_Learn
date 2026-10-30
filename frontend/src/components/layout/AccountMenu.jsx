import { useAuth } from '../../hooks/useAuth.js';
import { useLogout } from '../../hooks/useLogout.js';
import { Button } from '../ui/Button.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

/** Right side of the score bug: log in, or the user's name and log out. */
export const AccountMenu = () => {
  const { status, user } = useAuth();
  const logout = useLogout();

  if (status === 'loading') {
    return <Skeleton className="h-5 w-28" />;
  }
  if (status === 'authenticated') {
    return (
      <div className="flex items-center gap-4">
        <span className="max-w-[16ch] truncate font-display max-[520px]:hidden text-base font-bold tracking-[0.04em] text-ink">
          {user.name}
        </span>
        <Button variant="text" onClick={logout}>
          Log out
        </Button>
      </div>
    );
  }
  return (
    <Button variant="outline" to="/login">
      Log in
    </Button>
  );
};
