import { failedStatusError, httpStatusError, invalidBodyError } from './cfErrors.js';

export const CF_API_BASE_URL = 'https://codeforces.com/api';

/** Builds `<base>/<method>?a=1&b=2`, skipping null/undefined params and joining arrays with ";". */
export const buildCfUrl = (baseUrl, method, params = {}) => {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, Array.isArray(value) ? value.join(';') : String(value));
  }
  return url.toString();
};

const readJson = async (response) => {
  try {
    return { body: await response.json() };
  } catch (err) {
    return { parseError: err };
  }
};

/**
 * Turns a fetch Response into the CF `result`, or throws a typed error.
 * CF reports bad input as HTTP 400 with `"status": "FAILED"`, so the body is checked first.
 */
export const parseCfResponse = async (response) => {
  const { body, parseError } = await readJson(response);
  if (body?.status === 'FAILED') throw failedStatusError(body.comment);
  if (!response.ok) throw httpStatusError(response.status);
  if (parseError || body?.status !== 'OK') throw invalidBodyError(response.status, parseError);
  return body.result;
};
