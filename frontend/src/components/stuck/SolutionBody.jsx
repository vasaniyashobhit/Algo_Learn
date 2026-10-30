import { Link } from 'react-router';
import { problemPath } from '../../lib/problemLinks.js';
import { Markdown } from '../ui/Markdown.jsx';
import { AiSolution } from './AiSolution.jsx';

const Editorial = ({ text, divider }) => (
  <section className={divider ? 'mt-6 border-t border-line pt-5' : undefined}>
    <h3 className="label m-0 mb-2 text-[0.9rem] text-ink-soft">Editorial</h3>
    <Markdown>{text}</Markdown>
  </section>
);

const NothingStored = ({ notice, similar }) => (
  <div>
    <p>
      <b>{notice || 'There is no AI solution or editorial for this one yet.'}</b>
    </p>
    {similar.length > 0 ? (
      <>
        <p className="text-ink-soft">These similar problems have editorials you can learn the idea from:</p>
        <ul className="m-0 grid list-none gap-1 p-0">
          {similar.map((problem) => (
            <li key={problem.id}>
              <Link to={problemPath(problem.id)} className="font-display text-[1.1rem] font-bold uppercase">
                {problem.title}
              </Link>{' '}
              <span className="num text-step--1 text-ink-soft">{problem.id}</span>
            </li>
          ))}
        </ul>
      </>
    ) : (
      <p className="m-0 text-ink-soft">Try the warm-up problems on the right: they practise the same concept.</p>
    )}
  </div>
);

/** GET /stuck/:id/solution by kind: the AI solution (plus editorial), the editorial alone, or what we have instead. */
export const SolutionBody = ({ data }) => {
  if (data.kind === 'ai' && data.solution) {
    return (
      <>
        <AiSolution solution={data.solution} />
        {data.editorial && <Editorial text={data.editorial} divider />}
      </>
    );
  }
  if (data.editorial) return <Editorial text={data.editorial} />;
  return <NothingStored notice={data.notice} similar={data.similarWithEditorial ?? []} />;
};
