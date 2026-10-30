import { useRecommendationsQuery } from '../../hooks/queries/recommendations.queries.js';
import { StaggerItem } from '../motion/StaggerItem.jsx';
import { StaggerList } from '../motion/StaggerList.jsx';
import { PanelHeading } from '../ui/PanelHeading.jsx';
import { QueryState } from '../ui/QueryState.jsx';
import { RecommendationsSkeleton } from './RecommendationsSkeleton.jsx';
import { TopicCard } from './TopicCard.jsx';

const intro = (meta) =>
  meta.coldStart
    ? `Until we have read your submissions, these are the topics that show up most around ${meta.userRating ?? 1200}.`
    : 'Picked from your strengths and the problems you have not solved yet. Practice and upsolving only.';

/**
 * "Next topics": up to three topics, each with its problems, wiping on one after another.
 * `plateLead` gives the first topic the plate (only when nothing else on the screen has it).
 */
export const RecommendationsSection = ({ plateLead = false }) => {
  const query = useRecommendationsQuery();
  return (
    <section aria-labelledby="next-title" className="mt-12">
      <PanelHeading id="next-title" title="Next topics" caption="Next in" className="mb-1" />
      <QueryState
        query={query}
        skeleton={<RecommendationsSkeleton />}
        errorTitle="Your next topics didn't load"
        isEmpty={(answer) => answer.data.topics.length === 0}
        empty={<p className="text-ink-soft">No topics to suggest right now. Sync again after your next practice session.</p>}
      >
        {(answer) => (
          <>
            <p className="mb-5 text-ink-soft">{intro(answer.meta)}</p>
            <StaggerList as="ol" className="m-0 grid list-none gap-6 p-0">
              {answer.data.topics.map((topic, index) => (
                <StaggerItem key={topic.topic}>
                  <TopicCard topic={topic} lead={plateLead && index === 0} />
                </StaggerItem>
              ))}
            </StaggerList>
          </>
        )}
      </QueryState>
    </section>
  );
};
