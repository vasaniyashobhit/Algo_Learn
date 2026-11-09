import * as cheerio from 'cheerio';

const NOISE = 'script, style, noscript, template, nav, header, footer, aside, form, iframe, svg, button';
const BLOCKS = 'p, div, br, li, tr, pre, section, article, h1, h2, h3, h4, h5, h6';
const MAIN = ['.problem-statement', 'main', 'article', '[role="main"]', '#content', 'body'];

/** Collapses whitespace inside lines (incl. non-breaking spaces) and blank-line runs, then trims. */
export const tidyText = (text) => text
  .replace(/\r\n?/g, '\n')
  .split('\n')
  .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

/**
 * Best-effort main text of an HTML page: drops scripts/navigation, picks the first main-content
 * container that has text (problem statement, main, article, … body) and keeps line breaks.
 */
export const extractMainText = (html) => {
  const $ = cheerio.load(html);
  $(NOISE).remove();
  $(BLOCKS).append('\n');
  for (const selector of MAIN) {
    const text = tidyText($(selector).first().text());
    if (text) return text;
  }
  return '';
};
