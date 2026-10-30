import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { cn } from '../../lib/cn.js';
import { toMarkdownMath } from '../../lib/latex.js';

const REMARK = [remarkMath];
// A typo in a formula must never break the page: KaTeX shows the source in Miss instead.
const REHYPE = [[rehypeKatex, { throwOnError: false, strict: 'ignore', errorColor: 'var(--miss)' }]];

/**
 * Problem statements, hints, solutions and editorials: markdown with Codeforces LaTeX
 * ($$$x$$$ → $x$) rendered by KaTeX. Raw HTML is never rendered.
 */
export const Markdown = ({ children, className }) => (
  <div className={cn('prose-board', className)}>
    <ReactMarkdown remarkPlugins={REMARK} rehypePlugins={REHYPE}>
      {toMarkdownMath(children)}
    </ReactMarkdown>
  </div>
);
