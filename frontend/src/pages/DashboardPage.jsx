import { FadeIn } from '../components/motion/FadeIn.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

/** Signed-in home. The topic card, handle linking and sync arrive in the dashboard session. */
export const DashboardPage = () => {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  return (
    <div className="wrap pt-6 pb-16">
      <FadeIn>
        <h1>Dashboard</h1>
        <p className="text-ink-soft">
          Signed in as <span className="text-ink">{user?.name}</span> ({user?.email}).
        </p>
      </FadeIn>
      <EmptyState
        figure="0"
        title="Your topic card will appear here"
        className="mt-6"
        action={
          <Button variant="outline" to="/">
            Back to the start
          </Button>
        }
      >
        <p>
          Linking a Codeforces handle and syncing your submissions are being built next. Once they are ready, this
          page shows your strength per topic and the next problems to solve.
        </p>
      </EmptyState>
    </div>
  );
};
