import { FEATURES } from '../../lib/landingContent.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StaggerList } from '../motion/StaggerList.jsx';

/** Four features as one ruled table of definitions, not a row of cards. */
export const FeatureGrid = () => (
  <section id="features" className="wrap scroll-mt-16 pt-[4.5rem]" aria-labelledby="features-title">
    <h2 id="features-title" className="text-ink-soft">
      What you get
    </h2>
    <StaggerList as="dl" className="mt-[0.8rem] grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map(({ title, body }) => (
        <StaggerItem as="div" key={title} className="bg-ground px-[1.3rem] pt-5 pb-[1.4rem]">
          <dt className="mb-2 font-display text-step-1 leading-[1.1] font-bold uppercase">{title}</dt>
          <dd className="m-0 text-ink-soft">{body}</dd>
        </StaggerItem>
      ))}
    </StaggerList>
  </section>
);
