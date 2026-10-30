import { CopyButton } from '../ui/CopyButton.jsx';

/** A solution's code with a copy button. Plain text in a scrollable block (no syntax colours). */
export const CodeBlock = ({ code, label = 'Code' }) => (
  <figure className="m-0">
    <figcaption className="flex items-center justify-between gap-4">
      <span className="label text-ink-soft">{label}</span>
      <CopyButton text={code} />
    </figcaption>
    <pre className="code-block" tabIndex={0} aria-label={label}>
      <code>{code}</code>
    </pre>
  </figure>
);
