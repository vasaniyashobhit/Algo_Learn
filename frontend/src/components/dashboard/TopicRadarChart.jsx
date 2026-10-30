import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe.js';
import { formatStrength, solvedText } from '../../lib/strength.js';
import { shortTopic } from '../../lib/topicNames.js';

// Used until the container is measured (and in tests, where nothing has a size).
const INITIAL_SIZE = { width: 360, height: 313 };

const RadarTooltip = ({ active, payload }) => {
  const row = active ? payload?.[0]?.payload : null;
  if (!row) return null;
  return (
    <div className="radar-tooltip">
      <p className="label m-0">{row.topic}</p>
      <p className="m-0">
        <span className="fig text-step-1">{formatStrength(row.strength)}</span>{' '}
        <span className="text-step--1 text-ink-soft">{solvedText(row)}</span>
      </p>
    </div>
  );
};

/**
 * The wagon wheel: one series, strength 0–1 on each of the 8 most practised topics.
 * Colours come from dashboard.css (tokens), so both themes work. The figure is one image
 * for screen readers; TopicTable carries the numbers.
 */
export const TopicRadarChart = ({ rows, label, hidden }) => {
  const reduced = useReducedMotionSafe();
  return (
    <figure className="radar m-0" role="img" aria-label={label} hidden={hidden}>
      <ResponsiveContainer width="100%" aspect={1.15} minWidth={240} initialDimension={INITIAL_SIZE}>
        <RadarChart data={rows} outerRadius="70%" margin={{ top: 8, right: 56, bottom: 8, left: 56 }}>
          <PolarGrid gridType="polygon" />
          <PolarAngleAxis dataKey="topic" tickFormatter={shortTopic} />
          <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} tickCount={5} />
          <Radar
            dataKey="strength"
            className="radar-area"
            dot={{ r: 4, className: 'radar-dot' }}
            activeDot={{ r: 6, className: 'radar-dot' }}
            isAnimationActive={!reduced}
            animationDuration={600}
          />
          <Tooltip content={<RadarTooltip />} cursor={false} isAnimationActive={false} />
        </RadarChart>
      </ResponsiveContainer>
    </figure>
  );
};
