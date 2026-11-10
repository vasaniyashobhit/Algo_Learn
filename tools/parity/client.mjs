/** Minimal API client for the parity check (Node fetch + FormData, no extra packages). */
const CLIENT_TIMEOUT_MS = 60_000;

/** A step's request: `json` body, `form` fields (multipart), or `raw` text with its own content type. */
const bodyOf = ({ json, form, raw }) => {
  if (json !== undefined) return { body: JSON.stringify(json), type: 'application/json' };
  if (raw !== undefined) return { body: raw.text, type: raw.type };
  if (form) {
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    return { body: data };
  }
  return {};
};

/** Sends one request; never throws for HTTP errors (status and body are what we compare). */
export const send = async (base, { method, path, headers = {}, ...request }) => {
  const { body, type } = bodyOf(request);
  const started = performance.now();
  const res = await fetch(base + path, {
    method,
    headers: { ...(type && { 'Content-Type': type }), ...headers },
    body,
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { notJson: text.slice(0, 200) };
  }
  return { status: res.status, body: json, ms: Math.round(performance.now() - started) };
};

/** Waits until GET <base>/health answers 200 (or throws after `timeoutMs`). */
export const waitForHealth = async (base, timeoutMs) => {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2_000) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`${base} did not become healthy in ${timeoutMs / 1000} s`);
};
