import { useAddPracticeMutation } from '../../hooks/mutations/practice.mutations.js';
import { usePracticeStatuses } from '../../hooks/queries/practice.queries.js';
import { useFlash } from '../../hooks/useFlash.js';
import { SuccessTick } from '../motion/SuccessTick.jsx';
import { Button } from '../ui/Button.jsx';

/**
 * "Add to practice". The card switches to "In practice" at once (optimistic); a tick draws
 * when the server confirms. A failed add rolls the card back and a toast says why.
 */
export const AddToPracticeButton = ({ problem, addedFrom = 'recommendation', variant = 'outline', className }) => {
  const statuses = usePracticeStatuses();
  const add = useAddPracticeMutation();
  const [confirmed, flashConfirmed] = useFlash();
  const status = statuses.get(problem.id);

  if (status) {
    return (
      <Button variant="text" to="/practice" aria-label={`${problem.id} is in your practice list. Open the list`}>
        {confirmed && <SuccessTick className="text-plate-text" />}
        {confirmed ? 'Added' : 'In practice'}
      </Button>
    );
  }
  return (
    <Button
      variant={variant}
      className={className ?? (variant === 'outline' ? 'px-[0.7rem] py-[0.45rem] text-[0.9rem]' : undefined)}
      aria-label={`Add ${problem.id} ${problem.title} to practice`}
      onClick={() => add.mutate({ problemId: problem.id, addedFrom, problem }, { onSuccess: flashConfirmed })}
    >
      Add to practice
    </Button>
  );
};
