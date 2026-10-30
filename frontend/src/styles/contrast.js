// WCAG 2.x contrast maths, used by the token tests to measure every text/background pair.
const channel = (value) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const parseHex = (hex) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean;
  return [0, 2, 4].map((start) => Number.parseInt(full.slice(start, start + 2), 16));
};

export const luminance = (hex) => {
  const [r, g, b] = parseHex(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (foreground, background) => {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
};

/** { dark: { ground: '#0a1322', ... }, light: {...} } from tokens.css (light inherits dark). */
export const parseThemeTokens = (css) => {
  const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
  const read = (body) =>
    Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)].map(([, name, value]) => [name, value]));
  const dark = read(blocks.find(([, selector]) => selector.includes("[data-theme='dark']"))[2]);
  const light = { ...dark, ...read(blocks.find(([, selector]) => selector.includes("[data-theme='light']"))[2]) };
  return { dark, light };
};
