import { describe, expect, it } from 'vitest';
import { extractMainText, tidyText } from '../../../../src/modules/stuck/helpers/extractMainText.js';
import { html } from '../../../helpers/stuck.js';

describe('tidyText', () => {
  it('collapses spaces per line, blank-line runs and CRLF, then trims', () => {
    expect(tidyText('  a \t  b \r\n\r\n\r\n\n c  \n')).toBe('a b\n\nc');
  });
});

describe('extractMainText', () => {
  it('prefers the Codeforces problem statement and drops scripts and navigation', () => {
    const page = html(`
      <nav>Home | Contests</nav>
      <div class="problem-statement"><div class="title">A. Theatre Square</div><p>Find   the number.</p></div>
      <footer>Copyright</footer>`);
    expect(extractMainText(page)).toBe('A. Theatre Square\nFind the number.');
  });

  it('falls back to main, article, then body', () => {
    expect(extractMainText(html('<header>x</header><main><p>In main</p></main><p>outside</p>'))).toBe('In main');
    expect(extractMainText(html('<article><h1>T</h1><p>Body</p></article>'))).toBe('T\nBody');
    expect(extractMainText(html('<p>Just body</p><style>p{}</style>'))).toBe('Just body');
  });

  it('skips an empty main container', () => {
    expect(extractMainText(html('<main>  </main><div>rest</div>'))).toBe('rest');
  });

  it('returns an empty string for a page without text', () => {
    expect(extractMainText('<html><body><script>1</script></body></html>')).toBe('');
  });
});
