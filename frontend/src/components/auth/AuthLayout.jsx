import { Wipe } from '../motion/Wipe.jsx';
import { AuthTabs } from './AuthTabs.jsx';

/** A big scoreboard figure on the left, the account panel on the right (stacks when narrow). */
export const AuthLayout = ({ title, notice, children }) => (
  <div className="wrap grid min-h-[calc(100vh-53px)] items-center gap-12 py-12 md:grid-cols-[1fr_minmax(320px,440px)]">
    <aside className="hidden md:block" aria-hidden="true">
      <p className="fig m-0 text-[clamp(6rem,16vw,13rem)] leading-[0.85] text-figure">630</p>
      <p className="max-w-[14ch] font-display text-step-2 leading-[1.05] font-bold uppercase">
        topic pairs scored from your own submissions.
      </p>
    </aside>

    <Wipe as="section" className="bg-band pb-[1.4rem] shadow-panel" aria-labelledby="auth-title">
      <h1 id="auth-title" className="sr-only">
        {title}
      </h1>
      <AuthTabs />
      {notice && <div className="px-[1.6rem] pt-[1.6rem]">{notice}</div>}
      {children}
      <p className="mt-[0.6rem] mb-0 px-[1.6rem] text-step--1 text-ink-soft">
        For practice and upsolving. Please don&apos;t use AlgoLearn during live rated contests or placement tests.
      </p>
    </Wipe>
  </div>
);
