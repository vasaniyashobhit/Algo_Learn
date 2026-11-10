/** Small client for the running API (Node fetch + FormData, no extra packages). */
export const BASE = process.env.CHECK_BASE_URL ?? 'http://localhost:4000/api/v1';

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

/**
 * The check account comes from CHECK_EMAIL and CHECK_PASSWORD (never from a file). The account must exist; the
 * checks never create or delete it.
 */
export const checkAccount = () => {
  const { CHECK_EMAIL: email, CHECK_PASSWORD: password } = process.env;
  if (!email || !password) {
    console.error('Set CHECK_EMAIL and CHECK_PASSWORD to an existing account (e.g. `$env:CHECK_EMAIL=...` in PowerShell).');
    process.exit(2);
  }
  return { email, password };
};

/** Logs in with the check account; throws with the error code when that fails. */
export const login = async ({ email, password }) => {
  const res = await call('POST', '/auth/login', { json: { email, password } });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${res.body.error?.code}`);
  return res.body.data.token;
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
