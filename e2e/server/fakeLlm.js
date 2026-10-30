import { createLlm } from '../../backend/src/modules/llm/llm.module.js';
import { AI_OUTAGE_MARKER } from './stuckFixture.js';

const ANSWER = JSON.stringify({
  tags: ['greedy', 'strings'],
  estimatedRating: 1300,
  hints: [
    'Walk the string once and track how many brackets are still open.',
    'A part can end exactly where that running balance returns to zero.',
    'Cut at every zero; if the balance ever drops below zero or ends above it, the answer is -1.',
  ],
  approach: 'Greedy: every time the prefix balance hits 0, close the current part.',
  solutionSteps: ['Read s', 'Keep a balance counter', 'Count the zeros; check it never goes negative'],
  complexity: 'O(n) time, O(1) memory',
  code: '#include <bits/stdc++.h>\nint main() { std::string s; std::cin >> s; }',
  pitfalls: ['A string that ends with a positive balance has no valid split'],
});

class FakeProviderError extends Error {
  constructor() {
    super('Fake AI outage (E2E)');
    this.status = 400;
  }
}

/** One fake provider with the real interface: answers instantly, fails on the outage marker. */
export const fakeProvider = {
  name: 'fake',
  model: 'e2e-coach',
  generateJson: async ({ prompt }) => {
    if (prompt.includes(AI_OUTAGE_MARKER)) throw new FakeProviderError();
    return ANSWER;
  },
  extractTextFromImage: async () => '',
};

const memoryCache = () => {
  const store = new Map();
  return { get: async (key) => store.get(key) ?? null, set: async (key, value) => store.set(key, value) };
};

/** The real coach chain (budget, breaker, schema check) around the fake provider. */
export const createFakeLlm = ({ logger }) =>
  createLlm({ env: { GEMINI_MODELS: [] }, ai: {}, providers: [fakeProvider], cache: memoryCache(), logger });
