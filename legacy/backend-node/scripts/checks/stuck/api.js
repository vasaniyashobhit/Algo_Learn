/** Small client for the running API (Node fetch + FormData, no extra packages). */
export const BASE = process.env.CHECK_BASE_URL ?? 'http://localhost:4000/api/v1';
export const DEMO = Object.freeze({ email: 'demo@cpcoach.dev', password: 'Demo1234pass', name: 'Demo User' });

// The client never waits forever: 60 s is above the server's 55 s promise.
const CLIENT_TIMEOUT_MS = 60_000;

export const call = async (method, path, { token, json, form } = {}) => {
  const headers = { ...(token && { Authorization: `Bearer ${token}` }), ...(json && { 'Content-Type': 'application/json' }) };
  const started = Date.now();
  const res = await fetch(BASE + path, {
    method, headers, body: json ? JSON.stringify(json) : form, signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  const body = await res.json();
  return { status: res.status, body, ms: Date.now() - started };
};

/** Logs in as the demo user; creates the account once if it does not exist yet. */
export const loginDemo = async () => {
  const login = await call('POST', '/auth/login', { json: { email: DEMO.email, password: DEMO.password } });
  if (login.status === 200) return { token: login.body.data.token, created: false };
  if (login.body.error?.code !== 'AUTH_INVALID_CREDENTIALS') throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body.error)}`);
  const signup = await call('POST', '/auth/signup', { json: DEMO });
  if (signup.status !== 201) throw new Error(`demo login failed and signup answered ${signup.status} ${signup.body.error?.code}`);
  return { token: signup.body.data.token, created: true };
};

/** multipart body: inputType plus either text fields or one file. */
export const stuckForm = (inputType, { fields = {}, file } = {}) => {
  const form = new FormData();
  form.append('inputType', inputType);
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  if (file) form.append('file', new Blob([file.buffer], { type: file.type }), file.name);
  return form;
};

/** One table row from a POST /stuck answer. */
export const summarize = (label, { status, body, ms }) => {
  const data = body.data ?? {};
  return {
    input: label,
    http: status,
    seconds: (ms / 1000).toFixed(1),
    source: data.source ?? body.error?.code,
    model: data.provider ? `${data.provider}/${data.model}` : (data.fallbackReason ?? '-'),
    tags: data.problem ? `${data.problem.tags.join(',') || '-'} (${data.problem.tagsSource ?? 'none'})` : '-',
    match: data.problem?.matchedProblemId ?? '-',
    hints: data.hints?.length ?? 0,
    gap: data.gap?.items.length ?? 0,
    similar: data.similar?.items.length ?? 0,
  };
};
