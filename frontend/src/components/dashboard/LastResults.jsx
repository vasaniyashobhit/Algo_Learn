import { Mark } from '../ui/Mark.jsx';

const word = ({ solved }) => (solved ? 'solved' : 'not solved');

/**
 * The newest attempted problems in a topic, newest first: ■ solved, □ not solved. The
 * shapes carry the meaning (never colour), and screen readers get the full sentence.
 */
export const LastResults = ({ results = [] }) => {
  if (!results.length) return <span className="text-step--1 text-ink-soft">No attempts</span>;
  const summary = `Last ${results.length}, newest first: ${results.map(word).join(', ')}`;
  return (
    <span role="img" aria-label={summary} title={summary} className="inline-flex items-center gap-[0.3rem]">
      {results.map((result, index) => (
        <Mark key={`${result.problemId}-${index}`} shape={result.solved ? 'solved' : 'open'} />
      ))}
    </span>
  );
};
