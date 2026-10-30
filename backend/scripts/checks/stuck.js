import { call, loginDemo, stuckForm, summarize } from './stuck/api.js';
import { makePdf, wrap } from './stuck/pdf.js';
import { textPng } from './stuck/png.js';
import { TEAM, THEATRE_SQUARE, WATERMELON_URL, WAY_TOO_LONG_WORDS } from './stuck/problems.js';

// Live check of POST /stuck against the RUNNING server (npm run dev in another terminal).
// Sends the four input types, prints one row each, then one solution. Exit 1 if any request
// took 55 s or more, failed, or came back blank.
const LIMIT_MS = 55_000;

const { token, created } = await loginDemo();
console.log(`logged in as demo@cpcoach.dev${created ? ' (account created now)' : ''}`);

const cases = [
  ['text (71A)', stuckForm('text', { fields: { text: WAY_TOO_LONG_WORDS } })],
  ['url (4/A)', stuckForm('url', { fields: { url: WATERMELON_URL } })],
  ['pdf (231A)', stuckForm('pdf', { file: { buffer: makePdf(wrap(TEAM, 95)), type: 'application/pdf', name: 'team.pdf' } })],
  ['png (1A)', stuckForm('image', { file: { buffer: textPng(wrap(THEATRE_SQUARE, 64)), type: 'image/png', name: 'theatre.png' } })],
];

const rows = [];
const results = [];
for (const [label, form] of cases) {
  let answer;
  try {
    answer = await call('POST', '/stuck', { token, form });
  } catch (err) {
    answer = { status: 0, body: { error: { code: err.name } }, ms: LIMIT_MS };
  }
  rows.push(summarize(label, answer));
  results.push(answer);
  console.log(`done: ${label} in ${(answer.ms / 1000).toFixed(1)} s`);
}
console.table(rows);

const blank = (data) => !data || (!data.hints?.length && !data.similar?.items.length);
const failures = results.filter(({ status, body, ms }) => status !== 201 || ms >= LIMIT_MS || blank(body.data));

const pick = results.find(({ body }) => body.data?.hasSolution) ?? results.find(({ body }) => body.data);
if (pick) {
  const { body, ms } = await call('GET', `/stuck/${pick.body.data.id}/solution`, { token });
  const { kind, solution, editorial, notice } = body.data ?? {};
  console.log(`\nsolution for ${pick.body.data.problem.title} (kind ${kind}, ${ms} ms)${notice ? ` notice: ${notice}` : ''}`);
  const text = solution ? [solution.approach, '', ...(solution.code ?? '').split('\n')].join('\n') : editorial ?? '(none)';
  console.log(text.split('\n').slice(0, 12).map((line) => `  ${line}`).join('\n'));
}

console.log(failures.length ? `\nFAIL: ${failures.length} request(s) slow, failed or blank` : '\nPASS: all under 55 s and none blank');
process.exitCode = failures.length ? 1 : 0;
