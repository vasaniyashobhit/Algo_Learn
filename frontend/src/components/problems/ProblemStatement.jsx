import { codeforcesUrl } from '../../lib/problemLinks.js';
import { AddToPracticeButton } from '../practice/AddToPracticeButton.jsx';
import { Button } from '../ui/Button.jsx';
import { Markdown } from '../ui/Markdown.jsx';
import { Notice } from '../ui/Notice.jsx';
import { ProblemEditorial } from './ProblemEditorial.jsx';

const SECTIONS = [
  { key: 'inputFormat', title: 'Input' },
  { key: 'outputFormat', title: 'Output' },
  { key: 'note', title: 'Note' },
];

const Actions = ({ problem }) => (
  <div className="mb-[1.4rem] flex flex-wrap items-center gap-3 border-b border-line pb-5">
    <AddToPracticeButton problem={problem} addedFrom="manual" variant="plate" className="px-[1.1rem] py-[0.6rem]" />
    <Button variant="outline" to="/stuck" state={{ url: codeforcesUrl(problem) }}>
      I'm stuck on this
    </Button>
  </div>
);

/** The statement (description, input, output, note) with LaTeX, plus the practice actions. */
export const ProblemStatement = ({ problem }) => (
  <article aria-label="Statement" className="min-w-0 bg-band px-[1.6rem] py-[1.4rem] text-[1.06rem]">
    <Actions problem={problem} />
    {problem.hasStatement ? (
      <>
        <Markdown>{problem.description}</Markdown>
        {SECTIONS.filter(({ key }) => problem[key]?.trim()).map(({ key, title }) => (
          <section key={key} aria-label={title}>
            <h2 className="mt-[1.6rem] text-ink-soft">{title}</h2>
            <Markdown>{problem[key]}</Markdown>
          </section>
        ))}
      </>
    ) : (
      <Notice>
        <p>
          We only store the topics and rating for this problem, not its statement. Read it on Codeforces; the similar
          problems still work.
        </p>
      </Notice>
    )}
    {problem.editorial?.trim() && <ProblemEditorial text={problem.editorial} />}
  </article>
);
