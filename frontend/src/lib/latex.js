// Codeforces writes inline maths as $$$x$$$ and display maths as $$$$$$x$$$$$$.
// remark-math expects $x$ inline and a $$ block on its own lines for display maths.
const DISPLAY = /\${6}([\s\S]+?)\${6}/g;
const INLINE = /\${3}([\s\S]+?)\${3}/g;

/** Codeforces statement text → markdown that remark-math + rehype-katex can render. */
export const toMarkdownMath = (text) =>
  String(text ?? '')
    .replaceAll(DISPLAY, (_, math) => `\n\n$$\n${math.trim()}\n$$\n\n`)
    .replaceAll(INLINE, (_, math) => `$${math}$`);
