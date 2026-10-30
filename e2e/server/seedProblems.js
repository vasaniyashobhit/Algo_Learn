import { Problem } from '../../backend/src/modules/problems/problem.model.js';
import { STUCK_STATEMENT, STUCK_TITLE } from './stuckFixture.js';

// [contestId, title, rating, tags] — a small spread over ratings and topics.
const ROWS = [
  [1500, STUCK_TITLE, 1300, ['greedy', 'strings']],
  [1501, 'Prefix Sums Party', 1000, ['implementation', 'math']],
  [1502, 'Knapsack on a Budget', 1500, ['dp']],
  [1503, 'Shortest Ride Home', 1600, ['graphs', 'shortest paths']],
  [1504, 'Binary Search the Answer', 1400, ['binary search', 'greedy']],
  [1505, 'Bitmask Seating', 1800, ['bitmasks', 'dp']],
  [1506, 'Tree Diameter Walk', 1700, ['dfs and similar', 'trees']],
  [1507, 'Sorting Socks', 900, ['sortings', 'greedy']],
  [1508, 'Counting Pairs', 1200, ['math', 'two pointers']],
  [1509, 'Coloured Strings', 1100, ['strings', 'implementation']],
  [1510, 'Gcd Grid', 1300, ['number theory', 'math']],
  [1511, 'Greedy Coins', 1000, ['greedy']],
  [1512, 'Interval Merge', 1400, ['sortings', 'greedy']],
  [1513, 'Matrix Paths', 1500, ['dp', 'math']],
  [1514, 'Union of Towns', 1600, ['dsu', 'graphs']],
  [1515, 'Palindrome Pieces', 1200, ['strings', 'greedy']],
  [1516, 'Brackets Again', 1400, ['greedy', 'strings', 'data structures']],
  [1517, 'Stack of Plates', 1100, ['data structures', 'implementation']],
  [1518, 'Prime Steps', 1000, ['number theory']],
  [1519, 'Two Arrays', 900, ['constructive algorithms', 'greedy']],
  [1520, 'Even Odd Game', 800, ['games', 'math']],
  [1521, 'Segment Queries', 1900, ['data structures', 'binary search']],
  [1522, 'Grid Flood', 1300, ['dfs and similar', 'graphs']],
  [1523, 'Long Brackets', 1200, ['greedy', 'strings']],
];

const editorialOf = (title) =>
  `Editorial for ${title}. Scan left to right, keep a running balance, and cut whenever it returns to 0.`;

export const problemDocs = () => ROWS.map(([contestId, title, rating, tags], i) => ({
  _id: `${contestId}/A`,
  contestId,
  index: 'A',
  title,
  description: contestId === 1500 ? STUCK_STATEMENT : `${title}: given $$$n$$$ numbers, answer the question.`,
  inputFormat: 'The first line contains $$$n$$$ ($$$1 \\le n \\le 2 \\cdot 10^5$$$).',
  outputFormat: 'Print one integer.',
  editorial: i % 3 === 0 ? editorialOf(title) : undefined,
  rating,
  tags,
  source: 'hf',
}));

/** Inserts the seeded problems through Mongoose (validators and derived fields run). */
export const seedProblems = async () => {
  await Problem.init();
  await Problem.insertMany(problemDocs());
};
