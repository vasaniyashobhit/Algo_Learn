import { useState } from 'react';
import { useVerifyPracticeMutation } from '../../hooks/mutations/verify.mutations.js';
import { useApiErrorToast } from '../../hooks/useApiErrorToast.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { cn } from '../../lib/cn.js';
import { VERIFY_COPY, verifyWaitText } from '../../lib/verifyCopy.js';
import { SuccessTick } from '../motion/SuccessTick.jsx';
import { Button } from '../ui/Button.jsx';

const SMALL = 'px-[0.7rem] py-[0.45rem] text-[0.9rem]';

/**
 * "I solved it": asks Codeforces (through a sync) whether the problem was accepted. Renders a
 * button plus a full-width status line, so place it inside a flex-wrap row. Hidden without a
 * linked handle, because there is nothing to check against.
 */
export const VerifyButton = ({ problemId, onVerified, align = 'left' }) => {
  const { user } = useAuth();
  const verify = useVerifyPracticeMutation();
  const showError = useApiErrorToast();
  const countdown = useCountdown();
  const [outcome, setOutcome] = useState(null);
  if (!user?.cfHandle) return null;

  const check = () => {
    setOutcome(null);
    verify.mutate(
      { problemId },
      {
        onSuccess: (result) => {
          setOutcome(result.verified ? 'verified' : result.reason);
          if (result.verified) onVerified?.();
        },
        onError: (error) => {
          if (error?.code === 'RATE_LIMITED') countdown.start(error.details?.retryAfterSeconds ?? 20);
          else showError(error, 'verify');
        },
      },
    );
  };

  const message = countdown.active ? verifyWaitText(countdown.left) : VERIFY_COPY[outcome];
  const lineClass = cn('m-0 basis-full text-step--1', align === 'right' && 'text-right');
  if (outcome === 'verified') {
    return (
      <p role="status" className="m-0 flex items-center gap-1 text-step--1 font-semibold text-plate-text">
        <SuccessTick /> Solved on Codeforces
      </p>
    );
  }
  return (
    <>
      <Button
        variant="outline"
        className={SMALL}
        loading={verify.isPending}
        disabled={countdown.active}
        aria-label={`I solved ${problemId}: check on Codeforces`}
        onClick={check}
      >
        {verify.isPending ? 'Checking…' : 'I solved it'}
      </Button>
      {message && (
        <p role="status" className={cn(lineClass, outcome === 'STILL_JUDGING' || countdown.active ? 'text-ink' : 'text-ink-soft')}>
          {message}
        </p>
      )}
    </>
  );
};
