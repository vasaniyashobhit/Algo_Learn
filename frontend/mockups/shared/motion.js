// Motion intent shared by all three directions. Each direction's CSS decides
// how the entrance, press and reveal look; this file only wires the triggers.
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');

// Staggered entrance: every child of [data-stagger] gets its index as --i.
for (const list of document.querySelectorAll('[data-stagger]')) {
  [...list.children].forEach((child, index) => child.style.setProperty('--i', index));
}

// Content is visible without JS; the entrance only plays once this class lands.
requestAnimationFrame(() => document.documentElement.classList.add('is-ready'));

// Parallax: [data-depth] layers move at their own rate while the page scrolls.
const layers = [...document.querySelectorAll('[data-depth]')];
let frameRequested = false;

const placeLayers = () => {
  const offset = reduceQuery.matches ? 0 : scrollY;
  for (const layer of layers) {
    const depth = Number(layer.dataset.depth);
    layer.style.translate = `0 ${(offset * depth).toFixed(1)}px`;
  }
  frameRequested = false;
};

if (layers.length) {
  addEventListener('scroll', () => {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(placeLayers);
  }, { passive: true });
  reduceQuery.addEventListener('change', placeLayers);
}

// Count-up for stat numbers, skipped under reduced motion.
const countUp = (el) => {
  const target = Number(el.dataset.count);
  if (reduceQuery.matches || !Number.isFinite(target)) return;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 900);
    el.textContent = Math.round(target * (1 - (1 - t) ** 3)).toLocaleString('en-IN');
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

document.querySelectorAll('[data-count]').forEach(countUp);
