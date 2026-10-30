import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

/** Any unknown address. Always offers a way back. */
export const NotFoundPage = () => {
  usePageTitle('Page not found');
  const { status } = useAuth();
  const home = status === 'authenticated' ? '/dashboard' : '/';
  return (
    <div className="wrap py-12">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        figure="404"
        title="That page isn't here"
        action={
          <Button variant="plate" to={home}>
            {status === 'authenticated' ? 'Go to your dashboard' : 'Go to the start'}
          </Button>
        }
      >
        <p>The address may be mistyped, or the page may have moved. Check the link, or start again from here.</p>
      </EmptyState>
    </div>
  );
};
