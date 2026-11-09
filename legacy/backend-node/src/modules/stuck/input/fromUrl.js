import { STUCK } from '../../../config/constants.js';
import { ExternalServiceError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';
import { createFetchWithTimeout } from '../../../lib/fetchWithTimeout.js';
import { parseCodeforcesUrl } from '../helpers/codeforcesUrl.js';
import { extractMainText, tidyText } from '../helpers/extractMainText.js';
import { BodyTooLargeError, readLimitedBody } from '../helpers/readLimitedBody.js';
import { createUrlGuard, notAllowed, parseUrl } from './urlGuard.js';
import { createSafeFetch, isPrivateAddressError } from './safeFetch.js';

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

const failed = (message, details, cause) =>
  new ExternalServiceError(codes.URL_FETCH_FAILED, message, details, { cause });

const pageText = (body, contentType) => {
  if (/text\/html|application\/xhtml\+xml/i.test(contentType)) return extractMainText(body);
  if (/text\/plain/i.test(contentType)) return tidyText(body);
  throw failed('The link is not a web page we can read', { reason: 'unsupported_type' });
};

/**
 * URL input → `{ problemId }` for a Codeforces problem link (no fetch), else `{ text }` from the
 * page: SSRF-checked on every redirect hop (before fetching, and again at connect time by the
 * default safe fetch), `timeoutMs` for the whole fetch, at most `maxBytes`, cheerio main text.
 * Any failure is URL_NOT_ALLOWED or URL_FETCH_FAILED (`details.reason`).
 */
export const createFromUrl = ({
  lookup,
  fetchImpl = createSafeFetch({ lookup }),
  now = Date.now,
  limits: { timeoutMs, maxBytes, maxRedirects } = STUCK.url,
} = {}) => {
  const guard = createUrlGuard({ lookup });
  const fetchHop = createFetchWithTimeout({ fetchImpl });

  // The connect-time refusal (DNS changed after the guard's lookup) is still URL_NOT_ALLOWED.
  const fetchSafely = async (url, ms) => {
    try {
      return await fetchHop(url.href, { redirect: 'manual', timeoutMs: ms, headers: { accept: 'text/html, text/plain' } });
    } catch (err) {
      if (!isPrivateAddressError(err)) throw err;
      throw notAllowed('Links to private or local network addresses are not allowed', 'private', err);
    }
  };

  const fetchPage = async (start) => {
    const deadline = now() + timeoutMs;
    let url = start;
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      await guard(url);
      const response = await fetchSafely(url, Math.max(1, deadline - now()));
      if (!REDIRECTS.has(response.status)) return response;
      const location = response.headers.get('location');
      if (!location) throw failed('The link redirects nowhere', { reason: 'status', status: response.status });
      url = new URL(location, url);
    }
    throw failed('The link redirects too many times', { reason: 'too_many_redirects' });
  };

  const readBody = async (response) => {
    try {
      return await readLimitedBody(response, maxBytes);
    } catch (err) {
      if (err instanceof BodyTooLargeError) throw failed('The page is too large to read', { reason: 'too_large', maxBytes }, err);
      throw failed('The page could not be downloaded', { reason: 'network' }, err);
    }
  };

  return async (raw) => {
    const url = parseUrl(raw);
    const problemId = parseCodeforcesUrl(url);
    if (problemId) return { problemId };
    const response = await fetchPage(url);
    if (!response.ok) throw failed(`The page answered HTTP ${response.status}`, { reason: 'status', status: response.status });
    const text = pageText(await readBody(response), response.headers.get('content-type') ?? '');
    if (text.length < STUCK.minTextLength) throw failed('No problem text was found on that page', { reason: 'no_text' });
    return { text: text.slice(0, STUCK.maxTextLength) };
  };
};
