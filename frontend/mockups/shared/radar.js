// Draws a topic-strength radar into <svg data-radar='[["dp",0.38],...]'>.
// Classes (radar-ring, radar-spoke, radar-ray, radar-shape, radar-dot, radar-label)
// are styled per direction; the same chart reads as a report figure, a wagon
// wheel or a hand-plotted graph depending on the CSS.
const NS = 'http://www.w3.org/2000/svg';
const CENTER = 160;
const RADIUS = 110;

const make = (tag, attrs) => {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
};

const at = (index, count, radius) => {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
};

const anchorFor = (x) => {
  if (Math.abs(x - CENTER) < 4) return 'middle';
  return x > CENTER ? 'start' : 'end';
};

for (const svg of document.querySelectorAll('svg[data-radar]')) {
  const data = JSON.parse(svg.dataset.radar);
  const count = data.length;
  const ring = (scale) => data.map((_, i) => at(i, count, RADIUS * scale).join(',')).join(' ');
  svg.setAttribute('viewBox', '-60 -10 440 340');

  for (const scale of [0.25, 0.5, 0.75, 1]) svg.append(make('polygon', { class: 'radar-ring', points: ring(scale) }));

  data.forEach(([label, value], i) => {
    const [x, y] = at(i, count, RADIUS);
    const [px, py] = at(i, count, RADIUS * value);
    const [lx, ly] = at(i, count, RADIUS + 18);
    svg.append(make('line', { class: 'radar-spoke', x1: CENTER, y1: CENTER, x2: x, y2: y }));
    svg.append(make('line', { class: 'radar-ray', x1: CENTER, y1: CENTER, x2: px, y2: py, style: `--i:${i}` }));
    const text = make('text', { class: 'radar-label', x: lx, y: ly + 4, 'text-anchor': anchorFor(lx) });
    text.textContent = `${label} ${value.toFixed(2)}`;
    svg.append(text);
  });

  const shape = data.map(([, value], i) => at(i, count, RADIUS * value).join(',')).join(' ');
  svg.append(make('polygon', { class: 'radar-shape', points: shape }));
  data.forEach(([, value], i) => {
    const [x, y] = at(i, count, RADIUS * value);
    svg.append(make('circle', { class: 'radar-dot', cx: x, cy: y, r: 4, style: `--i:${i}` }));
  });
}
