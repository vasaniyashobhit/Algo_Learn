import { StaggerList } from '../motion/StaggerList.jsx';
import { GapCard } from './GapCard.jsx';

/** What this problem needs that you are weak on or have never practised, weakest first. */
export const ConceptGap = ({ gap }) => {
  const items = gap?.items ?? [];
  return (
    <section aria-labelledby="gap-title" className="bg-band px-[1.2rem] pt-[1.1rem] pb-[1.3rem] shadow-[inset_0_3px_0_var(--miss)]">
      <h2 id="gap-title" className="text-ink-soft">
        Concept gap
      </h2>
      {gap?.message && <p>{gap.message}</p>}
      {items.length > 0 ? (
        <StaggerList as="ul" aria-label="Gap topics" className="m-0 mt-3 grid list-none grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-px bg-line p-0">
          {items.map((item) => (
            <GapCard key={item.topicKey} item={item} />
          ))}
        </StaggerList>
      ) : (
        <p className="m-0 text-ink-soft">
          No gap found: you are steady on every topic this problem uses. The hints should be enough.
        </p>
      )}
    </section>
  );
};
