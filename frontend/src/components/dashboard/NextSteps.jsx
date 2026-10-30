import { cn } from '../../lib/cn.js';
import { Mark } from '../ui/Mark.jsx';

export const ONBOARDING_STEPS = [
  { key: 'link', title: 'Link your handle', detail: 'We check it exists on Codeforces.' },
  { key: 'sync', title: 'First sync, about 1 minute', detail: 'We read your public submissions.' },
  { key: 'board', title: 'Your topic scoreboard', detail: 'Strength per topic and pair, and what to solve next.' },
];

const stateOf = (index, currentIndex) => {
  if (index < currentIndex) return 'done';
  return index === currentIndex ? 'now' : 'later';
};

const STATE_WORDS = { done: 'Done', now: 'Now', later: 'Next' };

/** "What happens next": link → first sync → scoreboard, drawn on the plate. `current` is a step key. */
export const NextSteps = ({ current = 'link' }) => {
  const currentIndex = ONBOARDING_STEPS.findIndex((step) => step.key === current);
  return (
    <section aria-labelledby="next-steps-title">
      <h2 id="next-steps-title" className="label m-0 mb-3 text-[0.9rem]">
        What happens next
      </h2>
      <ol className="m-0 grid list-none gap-px border-t-2 border-plate-ink p-0 sm:grid-cols-3">
        {ONBOARDING_STEPS.map((step, index) => {
          const state = stateOf(index, currentIndex);
          return (
            <li
              key={step.key}
              aria-current={state === 'now' ? 'step' : undefined}
              className={cn('pt-3 pr-5', state === 'later' && 'opacity-70')}
            >
              <p className="m-0 flex items-center gap-2 font-display text-[0.8rem] font-semibold uppercase tracking-[0.1em]">
                <Mark shape={state === 'done' ? 'solved' : 'open'} />
                <span className="num">{index + 1}</span> · {STATE_WORDS[state]}
              </p>
              <h3 className="m-0 mt-1 text-step-1 leading-[1.05]">{step.title}</h3>
              <p className="m-0 mt-1 text-step--1">{step.detail}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
