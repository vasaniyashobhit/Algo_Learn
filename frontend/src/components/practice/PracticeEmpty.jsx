import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

const COPY = {
  null: { title: 'Nothing queued yet', body: 'Add problems from your next topics on the dashboard, or from a similar-problems list.' },
  todo: { title: 'Nothing left to do', body: 'Every problem on your list is solved or skipped. Pick a fresh one from your next topics.' },
  solved: { title: 'No solved problems yet', body: 'Mark a problem solved once Codeforces accepts your submission.' },
  skipped: { title: 'Nothing skipped', body: 'Problems you skip land here, so you can come back to them later.' },
};

/** The empty list, worded for the current filter, always with a next step. */
export const PracticeEmpty = ({ status }) => {
  const { title, body } = COPY[status] ?? COPY.null;
  return (
    <EmptyState
      figure="0"
      title={title}
      action={
        <Button variant="outline" to="/dashboard">
          See your next topics
        </Button>
      }
    >
      <p>{body}</p>
    </EmptyState>
  );
};
