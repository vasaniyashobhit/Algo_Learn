import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { send } from './client.mjs';
import { compare, record } from './compare.mjs';
import { EXPECTED_VALUES } from './expected.mjs';
import { writeReport } from './report.mjs';
import { LEGACY_PORT, SPRING_PORT, legacyAvailable, root, startServers } from './servers.mjs';
import { accountSteps } from './steps/account.mjs';
import { beforeLinkSteps, syncSteps } from './steps/codeforces.mjs';
import { miscSteps } from './steps/misc.mjs';
import { practiceSteps } from './steps/practice.mjs';
import { problemSteps } from './steps/problems.mjs';
import { stuckSteps } from './steps/stuck.mjs';

// npm run parity: the same request sequence against the legacy E2E server (4001) and the Spring e2e backend
// (4000), compared step by step; writes docs/PARITY.md. Without legacy/backend-node/node_modules (or with
// --snapshot) the Spring answers are compared with the saved legacy snapshot instead. --no-start uses running servers.
const STEPS = [...accountSteps, ...beforeLinkSteps, ...problemSteps, ...syncSteps, ...practiceSteps,
  ...stuckSteps, ...miscSteps];
const SNAPSHOT = path.join(root, 'tools/parity/legacy-snapshot.json');
const args = new Set(process.argv.slice(2));
const live = legacyAvailable() && !args.has('--snapshot');

const request = (step, ctx) => {
  const auth = step.auth === 'none' ? {} : { Authorization: `Bearer ${ctx.token}` };
  const pathOf = typeof step.path === 'function' ? step.path(ctx) : step.path;
  return { ...step, path: pathOf, headers: { ...auth, ...step.headers } };
};

/** Runs every step on each target in turn (same timing on both), keeping one context per target. */
const runSteps = async (targets) => {
  const results = targets.map(() => []);
  const contexts = targets.map(() => ({}));
  for (const step of STEPS) {
    if (step.waitMs) await new Promise((resolve) => setTimeout(resolve, step.waitMs));
    for (const [i, base] of targets.entries()) {
      const answer = await send(base, request(step, contexts[i]));
      step.save?.(answer.body, contexts[i]);
      results[i].push(record(step.name, answer));
    }
  }
  return results;
};

const bases = [...(live ? [LEGACY_PORT] : []), SPRING_PORT].map((port) => `http://localhost:${port}/api/v1`);
const running = args.has('--no-start') ? null : await startServers({ withLegacy: live });
try {
  const results = await runSteps(bases);
  const legacy = live ? results[0] : JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  const spring = results.at(-1);
  if (live) writeFileSync(SNAPSHOT, `${JSON.stringify(legacy, null, 1)}\n`);
  const rows = legacy.map((a, i) => compare(a, spring[i], EXPECTED_VALUES));
  const failed = writeReport(rows, { source: live ? 'live legacy E2E server' : 'saved legacy snapshot' });
  console.log(failed ? `FAIL: ${failed} of ${rows.length} steps differ (see docs/PARITY.md)`
    : `PASS: all ${rows.length} steps match (docs/PARITY.md)`);
  process.exitCode = failed ? 1 : 0;
} finally {
  running?.stopAll();
}
