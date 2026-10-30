// Landing copy and the sample scoreboard. Figures are labelled as sample data on the page.
export const SAMPLE_PLAYER = { handle: 'ananya_k', rating: 1487 };

export const SAMPLE_TOPICS = [
  { topic: 'Bitmasks + DP', strength: 0.21, solved: 2, tried: 8, weak: true },
  { topic: 'Combinatorics', strength: 0.29, solved: 4, tried: 14, weak: true },
  { topic: 'Dynamic programming', strength: 0.38, solved: 20, tried: 52, weak: false },
  { topic: 'Greedy', strength: 0.69, solved: 61, tried: 80, weak: false },
];

export const STEPS = [
  { title: 'Link your handle', body: 'We verify it on Codeforces and pull your submissions.' },
  {
    title: 'Read your card',
    body: 'Strength per topic and per pair, with solved and tried counts behind every number.',
  },
  { title: 'Work on the gap', body: 'Next problems sit 100–300 above your comfort rating on that topic.' },
];

export const FEATURES = [
  {
    title: 'Hints, one at a time',
    body: 'Stuck while upsolving? Take one hint, think, take the next. The full solution waits.',
  },
  {
    title: 'The missing concept',
    body: '“Needs DP + combinatorics. Your combinatorics: 0.29.” Then easier problems on exactly that.',
  },
  { title: 'Any input', body: 'Text, link, PDF or screenshot, matched against about 11,700 Codeforces problems.' },
  {
    title: 'Never a blank screen',
    body: 'AI busy? You still get topics, weak areas, similar problems and the editorial.',
  },
];

export const formatStrength = (value) => value.toFixed(2);
