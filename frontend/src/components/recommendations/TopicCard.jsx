import { cn } from '../../lib/cn.js';
import { formatStrength, solvedText } from '../../lib/strength.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StaggerList } from '../motion/StaggerList.jsx';
import { ProblemCard } from '../problems/ProblemCard.jsx';

const BASIS = { learning_zone: 'In your learning zone', frequent: 'Common at your level' };

const TopicFacts = ({ topic }) =>
  topic.attempted > 0 ? (
    <p className="m-0 flex items-baseline gap-3">
      <span className="fig text-step-3 leading-none">{formatStrength(topic.strength)}</span>
      <span className="text-step--1">strength · {solvedText(topic)}</span>
    </p>
  ) : (
    <p className="m-0 font-display text-step-1 font-bold uppercase">New topic for you</p>
  );

/**
 * One next topic: why it was picked, the target rating range and up to five problems.
 * `lead` puts the first topic on the plate when the screen has no other plate.
 */
export const TopicCard = ({ topic, lead = false }) => (
  <div className="grid gap-px bg-line lg:grid-cols-[19rem_1fr]">
    <div className={cn('grid content-start gap-3 p-5', lead ? 'on-plate bg-plate text-plate-ink' : 'bg-band text-ink')}>
      <div>
        <h3 className="m-0 text-step-2 leading-none">{topic.topic}</h3>
        <p className={cn('label m-0 mt-1 text-[0.8rem] tracking-[0.1em]', !lead && 'text-ink-soft')}>{BASIS[topic.basis]}</p>
      </div>
      <TopicFacts topic={topic} />
      <p className="m-0">{topic.reason}.</p>
      <p className={cn('num m-0 text-step--1', !lead && 'text-ink-soft')}>
        Problems rated {topic.targetRange.min}–{topic.targetRange.max}
      </p>
    </div>
    {topic.problems.length > 0 ? (
      <StaggerList as="ul" aria-label={`Problems for ${topic.topic}`} className="m-0 grid list-none gap-px bg-ground p-0 sm:grid-cols-2 xl:grid-cols-3">
        {topic.problems.map((problem) => (
          <StaggerItem key={problem.id} className="bg-ground">
            <ProblemCard
              problem={problem}
              addedFrom="recommendation"
              verify
              note={problem.pickedBy === 'similar_fallback' ? 'Broader pick' : undefined}
            />
          </StaggerItem>
        ))}
      </StaggerList>
    ) : (
      <p className="m-0 bg-band p-5 text-ink-soft">
        You have solved everything we have in this range. Try the similar search from any problem you liked.
      </p>
    )}
  </div>
);
