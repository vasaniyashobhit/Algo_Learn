import { parseEnv } from '../../src/config/env.js';
import { connectDB, disconnectDB } from '../../src/db/connect.js';
import { createLogger } from '../../src/lib/logger.js';
import { Problem } from '../../src/modules/problems/problem.model.js';
import { createLlm } from '../../src/modules/llm/llm.module.js';
import { createCoachCache } from '../../src/modules/llm/cache.js';

// One real coach call on problem 1/A. Prints source/provider/model only, never the key.
// `--fresh` skips the cache read (the answer is still written to llmcaches).
// If Atlas is unreachable it uses the built-in 1/A statement and no cache.
const FALLBACK_1A = {
  title: 'Theatre Square',
  description: 'Theatre Square in the capital city of Berland has a rectangular shape with the size n × m meters. '
    + 'On the occasion of the city\'s anniversary, a decision was taken to pave the Square with square granite '
    + 'flagstones. Each flagstone is of the size a × a. What is the least number of flagstones needed to pave '
    + 'the Square? It\'s allowed to cover the surface larger than the Theatre Square, but the Square has to be '
    + 'covered. It\'s not allowed to break the flagstones. The sides of flagstones should be parallel to the sides of the Square.',
  inputFormat: 'The input contains three positive integer numbers in the first line: n, m and a (1 ≤ n, m, a ≤ 10^9).',
  outputFormat: 'Write the needed number of flagstones.',
  tags: ['math'],
};

const env = parseEnv();
const logger = createLogger({ level: 'warn' });
const fresh = process.argv.includes('--fresh');

let problem = FALLBACK_1A;
let cache = { get: async () => null, set: async () => {} };
let connected = false;
try {
  await connectDB(env.MONGODB_URI, { logger, serverSelectionTimeoutMS: 8_000 });
  connected = true;
  problem = (await Problem.findById('1/A').lean()) ?? FALLBACK_1A;
  const dbCache = createCoachCache({ logger });
  cache = fresh ? { ...dbCache, get: async () => null } : dbCache;
} catch (err) {
  console.log(`Atlas unreachable (${err.code ?? err.name}); using the built-in statement, no cache.`);
}

const text = [problem.title, problem.description, problem.inputFormat, problem.outputFormat, problem.note]
  .filter(Boolean).join('\n\n');
const llm = createLlm({ env, logger, cache });
console.log('providers:', llm.providers.map((p) => `${p.name}:${p.model}`).join(', '));

const started = Date.now();
const result = await llm.getCoachAnswer({ problemId: '1/A', text, knownTags: problem.tags ?? [] });
console.log(`source=${result.source} provider=${result.provider ?? '-'} model=${result.model ?? '-'}`
  + `${result.reason ? ` reason=${result.reason}` : ''} took=${Date.now() - started}ms`);
if (result.answer) {
  const { tags, estimatedRating, hints, complexity, code } = result.answer;
  console.log({ tags, estimatedRating, firstHint: hints[0], complexity, codeLines: code.split('\n').length });
}
if (connected) await disconnectDB({ logger });
