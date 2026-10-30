import { useSyncMutation } from '../../hooks/mutations/sync.mutations.js';
import { useAuth } from '../../hooks/useAuth.js';
import { Wipe } from '../motion/Wipe.jsx';
import { HandleForm } from './HandleForm.jsx';
import { NextSteps } from './NextSteps.jsx';

const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there';

/**
 * The hero of a dashboard with no handle linked (the screen's one plate): why we need the
 * handle, the form, and what happens next. Linking starts the first sync straight away.
 */
export const HandleOnboarding = () => {
  const { user } = useAuth();
  const sync = useSyncMutation();

  return (
    <section aria-labelledby="link-title" className="on-plate bg-plate text-plate-ink">
      <div className="wrap grid gap-x-12 gap-y-10 py-12 lg:grid-cols-[1.15fr_1fr] lg:items-end">
        <Wipe>
          <h1 id="link-title" className="m-0 text-[clamp(2.6rem,5vw,4.6rem)] leading-[0.92]">
            Link your Codeforces handle
          </h1>
          <p className="m-0 mt-4 max-w-[46ch] text-step-1 leading-[1.35]">
            Welcome, {firstName(user?.name)}. Your scoreboard is built from your own Codeforces submissions, so we
            need your handle to read them.
          </p>
          <HandleForm onLinked={() => sync.mutate()} />
          <p className="m-0 mt-3 text-step--1">Public data only. Nothing is ever posted to your account.</p>
        </Wipe>
        <Wipe delay={0.12}>
          <NextSteps current="link" />
        </Wipe>
      </div>
    </section>
  );
};
