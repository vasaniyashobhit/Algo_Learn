import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseThemeTokens } from './contrast.js';

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
const themes = parseThemeTokens(css);

// [foreground, background, minimum ratio, where it is used]
const PAIRS = [
  ['ink', 'ground', 4.5, 'body text'],
  ['ink', 'band', 4.5, 'text on panels and the score bug'],
  ['ink', 'band-2', 4.5, 'input text, tags'],
  ['ink-soft', 'ground', 4.5, 'secondary text'],
  ['ink-soft', 'band', 4.5, 'labels, nav links, captions on panels'],
  ['ink-soft', 'band-2', 4.5, 'placeholders, inactive auth segment'],
  ['ground', 'ink', 4.5, 'hovered outline and plate buttons'],
  ['plate-ink', 'plate', 4.5, 'plate buttons, the wordmark, the notice strap and its on-plate button'],
  ['plate', 'plate-ink', 4.5, 'on-plate button when hovered (the stuck-fallback warning)'],
  ['plate-text', 'ground', 4.5, 'yellow text on the ground (step figures, auth figure)'],
  ['plate-text', 'band', 4.5, 'yellow text on panels'],
  ['miss', 'ground', 4.5, 'weak topics and alerts'],
  ['miss', 'band', 4.5, 'field errors inside the auth panel'],
  ['miss', 'band-2', 4.5, 'gap tags on band 2'],
  ['chalk-ink', 'chalk', 4.5, 'scoreboard text'],
  ['chalk-miss', 'chalk', 4.5, 'weak rows on the scoreboard'],
  ['figure', 'ground', 3, 'big decorative figures (auth 630)'],
  ['focus', 'ground', 3, 'focus ring (non-text)'],
  ['focus', 'band', 3, 'focus ring on panels (non-text)'],
];

describe.each(['dark', 'light'])('%s theme contrast (measured from tokens.css)', (themeName) => {
  const tokens = themes[themeName];

  it.each(PAIRS)('%s on %s ≥ %s:1 (%s)', (fg, bg, minimum) => {
    expect(tokens[fg], `--${fg} missing`).toBeDefined();
    expect(tokens[bg], `--${bg} missing`).toBeDefined();
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    expect(ratio, `${fg} ${tokens[fg]} on ${bg} ${tokens[bg]} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(minimum);
  });
});

describe('contrast maths', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#fff', '#fff')).toBeCloseTo(1, 5);
  });

  it('keeps the plate the same yellow in both themes', () => {
    expect(themes.light.plate).toBe(themes.dark.plate);
    expect(themes.light['plate-ink']).toBe(themes.dark['plate-ink']);
  });
});
