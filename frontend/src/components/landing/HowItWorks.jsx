import { STEPS } from '../../lib/landingContent.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StaggerList } from '../motion/StaggerList.jsx';

/** Three steps across one rule; the step figures are the order, so they stay. */
export const HowItWorks = () => (
  <section id="how" className="wrap scroll-mt-16 pt-[4.5rem]" aria-labelledby="how-title">
    <h2 id="how-title" className="text-ink-soft">
      How it works
    </h2>
    <StaggerList as="ol" className="mt-[0.8rem] grid list-none border-t-[3px] border-ink p-0 md:grid-cols-3">
      {STEPS.map(({ title, body }, index) => (
        <StaggerItem
          key={title}
          className="border-line pt-5 pr-6 max-md:border-t max-md:first:border-t-0 md:[&+&]:border-l md:[&+&]:pl-6"
        >
          <span className="fig block text-step-3 leading-none text-plate-text" aria-hidden="true">
            {index + 1}
          </span>
          <h3>{title}</h3>
          <p className="text-ink-soft">{body}</p>
        </StaggerItem>
      ))}
    </StaggerList>
  </section>
);
