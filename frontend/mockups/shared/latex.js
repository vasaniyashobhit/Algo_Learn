// Renders $...$ and $$...$$ inside [data-latex] with KaTeX (loaded from jsDelivr).
// The real app converts Codeforces $$$...$$$ to $...$ before rendering.
addEventListener('DOMContentLoaded', () => {
  if (!globalThis.renderMathInElement) return;
  for (const el of document.querySelectorAll('[data-latex]')) {
    globalThis.renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  }
});
