import { Markdown } from '../ui/Markdown.jsx';
import { CodeBlock } from './CodeBlock.jsx';

const Section = ({ title, children }) => (
  <section className="mt-5 first:mt-0">
    <h3 className="label m-0 mb-2 text-[0.9rem] text-ink-soft">{title}</h3>
    {children}
  </section>
);

const Points = ({ as: List = 'ul', items }) => (
  <List className="prose-board m-0 grid gap-2 pl-5">
    {items.map((item, index) => (
      <li key={index}>
        <Markdown>{item}</Markdown>
      </li>
    ))}
  </List>
);

/** The AI solution: approach, steps, complexity, code (copyable) and pitfalls. Any field may be missing. */
export const AiSolution = ({ solution }) => (
  <div>
    <p className="m-0 mb-4 text-step--1 text-ink-soft">Written by AI. Test it on the samples before you trust it.</p>
    {solution.approach && (
      <Section title="Approach">
        <Markdown>{solution.approach}</Markdown>
      </Section>
    )}
    {solution.solutionSteps?.length > 0 && (
      <Section title="Steps">
        <Points as="ol" items={solution.solutionSteps} />
      </Section>
    )}
    {solution.complexity && (
      <Section title="Complexity">
        <Markdown className="num">{solution.complexity}</Markdown>
      </Section>
    )}
    {solution.code && (
      <Section title="Code">
        <CodeBlock code={solution.code} label="Solution code" />
      </Section>
    )}
    {solution.pitfalls?.length > 0 && (
      <Section title="Pitfalls">
        <Points items={solution.pitfalls} />
      </Section>
    )}
  </div>
);
