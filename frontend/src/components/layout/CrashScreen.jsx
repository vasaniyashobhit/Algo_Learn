import { Button } from '../ui/Button.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';

const reload = () => window.location.reload();

/** The friendly recovery screen behind ErrorBoundary and the route errorElement. */
export const CrashScreen = ({ error, onReset }) => (
  <div className="wrap py-12">
    <ErrorState
      title="This screen hit a problem"
      message="AlgoLearn ran into an unexpected error. Your account and progress are safe. Try again, or go back to the start."
      requestId={error?.requestId}
      onRetry={onReset ?? reload}
      action={
        <Button variant="text" to="/">
          Go to the start
        </Button>
      }
    />
  </div>
);
