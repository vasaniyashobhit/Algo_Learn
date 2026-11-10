import { AI_OUTAGE_MARKER, STUCK_STATEMENT } from '../../../e2e/server/stuckFixture.js';

/**
 * "I'm stuck" flow: text (multipart and JSON), the fake-AI outage fallback, a Codeforces link (no fetch), a link
 * the SSRF guard refuses, validation errors, then history, one result, the solution and delete.
 */
const saveStuckId = (body, ctx) => {
  if (body?.data?.id) ctx.stuckId = body.data.id;
};
const withId = (suffix = '') => (ctx) => `/stuck/${ctx.stuckId}${suffix}`;

export const stuckSteps = [
  { name: 'stuck text', method: 'POST', path: '/stuck', save: saveStuckId,
    form: { inputType: 'text', text: STUCK_STATEMENT } },
  { name: 'stuck text again (cache)', method: 'POST', path: '/stuck', json: { inputType: 'text', text: STUCK_STATEMENT } },
  // Neighbors with distinct text scores, so the fallback is deterministic on both servers.
  { name: 'stuck AI outage (fallback)', method: 'POST', path: '/stuck',
    form: { inputType: 'text', text: `${AI_OUTAGE_MARKER} balanced bracket splits, long brackets again` } },
  // The E2E test's text: its neighbors tie in Mongo's textScore, which returns ties in arbitrary order.
  { name: 'stuck AI outage (tied neighbors)', method: 'POST', path: '/stuck',
    form: { inputType: 'text', text: `${AI_OUTAGE_MARKER} Greedy coins: pay n with the fewest coins.` } },
  { name: 'stuck Codeforces url', method: 'POST', path: '/stuck',
    form: { inputType: 'url', url: 'https://codeforces.com/problemset/problem/1502/A' } },
  { name: 'stuck private url', method: 'POST', path: '/stuck', form: { inputType: 'url', url: 'http://127.0.0.1:9/x' } },
  { name: 'stuck bad url', method: 'POST', path: '/stuck', form: { inputType: 'url', url: 'ftp://example.com/a' } },
  { name: 'stuck unknown input type', method: 'POST', path: '/stuck', form: { inputType: 'video', text: 'x' } },
  { name: 'stuck text missing', method: 'POST', path: '/stuck', form: { inputType: 'text' } },
  { name: 'stuck pdf without file', method: 'POST', path: '/stuck', form: { inputType: 'pdf' } },
  { name: 'stuck without token', method: 'POST', path: '/stuck', auth: 'none', form: { inputType: 'text', text: 'x' } },
  { name: 'stuck history', method: 'GET', path: '/stuck/history' },
  { name: 'stuck history page 2', method: 'GET', path: '/stuck/history?page=2' },
  { name: 'stuck history bad page', method: 'GET', path: '/stuck/history?page=0' },
  { name: 'stuck get', method: 'GET', path: withId() },
  { name: 'stuck solution', method: 'GET', path: withId('/solution') },
  { name: 'stuck unknown id', method: 'GET', path: '/stuck/ffffffffffffffffffffffff' },
  { name: 'stuck malformed id', method: 'GET', path: '/stuck/not-an-id/solution' },
  { name: 'stuck delete', method: 'DELETE', path: withId() },
  { name: 'stuck delete again', method: 'DELETE', path: withId() },
];
