/**
 * Practice list: add, list, filter, patch, verify ("I solved it"), delete, and their errors. Runs right after the
 * sync steps, so verify is inside the 20 s cooldown on both servers (stored submissions are checked).
 */
export const practiceSteps = [
  { name: 'practice empty', method: 'GET', path: '/practice' },
  { name: 'practice add', method: 'POST', path: '/practice', json: { problemId: '1511/a', addedFrom: 'recommendation' } },
  { name: 'practice add default source', method: 'POST', path: '/practice', json: { problemId: '1502/A' } },
  { name: 'practice add duplicate', method: 'POST', path: '/practice', json: { problemId: '1511/A' } },
  { name: 'practice add unknown problem', method: 'POST', path: '/practice', json: { problemId: '9999/A' } },
  { name: 'practice add invalid', method: 'POST', path: '/practice', json: { problemId: 'x', addedFrom: 'friend' } },
  { name: 'practice add extra key', method: 'POST', path: '/practice', json: { problemId: '1503/A', status: 'solved' } },
  { name: 'practice list', method: 'GET', path: '/practice' },
  { name: 'practice patch', method: 'PATCH', path: '/practice/1511/A', json: { status: 'solved' } },
  { name: 'practice patch invalid', method: 'PATCH', path: '/practice/1511/A', json: { status: 'done' } },
  { name: 'practice patch not in list', method: 'PATCH', path: '/practice/1504/A', json: { status: 'skipped' } },
  { name: 'practice list solved', method: 'GET', path: '/practice?status=solved' },
  { name: 'practice list bad status', method: 'GET', path: '/practice?status=bogus' },
  { name: 'verify solved problem', method: 'POST', path: '/practice/1501/A/verify' },
  { name: 'verify unsolved in cooldown', method: 'POST', path: '/practice/1505/A/verify' },
  { name: 'verify unknown problem', method: 'POST', path: '/practice/9999/A/verify' },
  { name: 'verify invalid id', method: 'POST', path: '/practice/x/A/verify' },
  { name: 'practice delete', method: 'DELETE', path: '/practice/1511/A' },
  { name: 'practice delete again', method: 'DELETE', path: '/practice/1511/A' },
  { name: 'practice list after changes', method: 'GET', path: '/practice' },
];
