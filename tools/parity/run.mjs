import { readFileSync } from 'node:fs';
import path from 'node:path';
import { send } from './client.mjs';
import { compare, record } from './compare.mjs';
import { EXPECTED_VALUES } from './expected.mjs';
import { writeReport } from './report.mjs';
import { SPRING_PORT, root, startSpring } from './servers.mjs';
import { accountSteps } from './steps/account.mjs';
import { beforeLinkSteps, syncSteps } from './steps/codeforces.mjs';
import { miscSteps } from './steps/misc.mjs';
import { practiceSteps } from './steps/practice.mjs';
import { problemSteps } from './steps/problems.mjs';
import { stuckSteps } from './steps/stuck.mjs';

// npm run parity: the request sequence against the Spring e2e backend (4000), compared step by step with the
// legacy backend's answers (tools/parity/legacy-snapshot.json, recorded live from its E2E server on 2026-11-10,
// ids, tokens and timestamps masked); writes docs/PARITY.md. --no-start uses an already running e2e backend.
const STEPS = [...accountSteps, ...beforeLinkSteps, ...problemSteps, ...syncSteps, ...practiceSteps,
  ...stuckSteps, ...miscSteps];
const SNAPSHOT = path.join(root, 'tools/parity/legacy-snapshot.json');
const BASE = `http://localhost:${SPRING_PORT}/api/v1`;

const request = (step, ctx) => {
  const auth = step.auth === 'none' ? {} : { Authorization: `Bearer ${ctx.token}` };
  const pathOf = typeof step.path === 'function' ? step.path(ctx) : step.path;
  return { ...step, path: pathOf, headers: { ...auth, ...step.headers } };
};

/** Runs every step in order, keeping the context (token, stuck id) between steps. */
const runSteps = async () => {
  const ctx = {};
  const results = [];
  for (const step of STEPS) {
    if (step.waitMs) await new Promise((resolve) => setTimeout(resolve, step.waitMs));
    const answer = await send(BASE, request(step, ctx));
    step.save?.(answer.body, ctx);
    results.push(record(step.name, answer));
  }
  return results;
};

const legacy = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const running = process.argv.includes('--no-start') ? null : await startSpring();
try {
  const spring = await runSteps();
  const rows = legacy.map((a, i) => compare(a, spring[i], EXPECTED_VALUES));
  const failed = writeReport(rows, { source: 'legacy snapshot recorded live from its E2E server on 2026-11-10' });
  console.log(failed ? `FAIL: ${failed} of ${rows.length} steps differ (see docs/PARITY.md)`
    : `PASS: all ${rows.length} steps match (docs/PARITY.md)`);
  process.exitCode = failed ? 1 : 0;
} finally {
  running?.stop();
}
