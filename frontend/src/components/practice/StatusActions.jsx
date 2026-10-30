import { useRemovePracticeMutation, useUpdatePracticeMutation } from '../../hooks/mutations/practice.mutations.js';
import { useFlash } from '../../hooks/useFlash.js';
import { SuccessTick } from '../motion/SuccessTick.jsx';
import { Button } from '../ui/Button.jsx';
import { VerifyButton } from './VerifyButton.jsx';

const SMALL = 'px-[0.7rem] py-[0.4rem] text-[0.9rem]';

// What each status can move to, in button order.
const MOVES = {
  todo: [
    { status: 'solved', label: 'Mark solved' },
    { status: 'skipped', label: 'Skip' },
  ],
  solved: [{ status: 'todo', label: 'Back to to-do' }],
  skipped: [{ status: 'todo', label: 'Back to to-do' }],
};

const DONE_WORDS = { solved: 'Marked solved', skipped: 'Skipped', todo: 'Back on the list' };

/** Change status / remove for one practice item. Every change is optimistic; a tick confirms it. */
export const StatusActions = ({ item }) => {
  const update = useUpdatePracticeMutation();
  const remove = useRemovePracticeMutation();
  const [confirmed, flashConfirmed] = useFlash();
  const { problemId } = item;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span role="status" className="flex items-center gap-1 text-step--1 text-plate-text">
        {confirmed && (
          <>
            <SuccessTick />
            {DONE_WORDS[item.status]}
          </>
        )}
      </span>
      {item.status === 'todo' && !item.optimistic && <VerifyButton problemId={problemId} align="right" />}
      {MOVES[item.status].map((move) => (
        <Button
          key={move.status}
          variant="outline"
          className={SMALL}
          disabled={item.optimistic}
          aria-label={`${move.label}: ${problemId}`}
          onClick={() => update.mutate({ problemId, status: move.status }, { onSuccess: flashConfirmed })}
        >
          {move.label}
        </Button>
      ))}
      <Button
        variant="text"
        disabled={item.optimistic}
        aria-label={`Remove ${problemId} from practice`}
        onClick={() => remove.mutate({ problemId })}
      >
        Remove
      </Button>
    </div>
  );
};
