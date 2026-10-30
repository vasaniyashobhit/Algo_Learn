import { lookup as dnsLookup } from 'node:dns/promises';
import { ExternalServiceError, ValidationError } from '../../../errors/httpErrors.js';
import { codes } from '../../../errors/codes.js';
import { isPrivateAddress } from '../helpers/privateAddress.js';

const ALLOWED_PORTS = new Set(['', '80', '443']);

export const notAllowed = (message, reason, cause) =>
  new ValidationError(codes.URL_NOT_ALLOWED, message, { reason }, { cause });

/** Parses user input into a URL, or VALIDATION_FAILED on the `url` field. */
export const parseUrl = (raw) => {
  try {
    return new URL(String(raw ?? '').trim());
  } catch (err) {
    throw new ValidationError(codes.VALIDATION_FAILED, 'Request validation failed', [{
      field: 'body.url', message: 'Enter a full link, e.g. https://codeforces.com/problemset/problem/1/A',
    }], { cause: err });
  }
};

/**
 * SSRF guard: only http(s) on the default ports, no credentials, no localhost, and every address
 * the host resolves to must be public (checked after the DNS lookup, so a public name that points
 * to 127.0.0.1 or 169.254.169.254 is refused). Run it again for every redirect hop.
 */
export const createUrlGuard = ({ lookup = dnsLookup } = {}) => async (url) => {
  if (!['http:', 'https:'].includes(url.protocol)) throw notAllowed('Only http and https links are supported', 'scheme');
  if (url.username || url.password) throw notAllowed('Links with a username or password are not allowed', 'credentials');
  if (!ALLOWED_PORTS.has(url.port)) throw notAllowed('Only links on the standard web ports are allowed', 'port');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) throw notAllowed('Local addresses are not allowed', 'private');
  let addresses;
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch (err) {
    throw new ExternalServiceError(codes.URL_FETCH_FAILED, 'The host of this link could not be found',
      { reason: 'dns' }, { cause: err });
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw notAllowed('Links to private or local network addresses are not allowed', 'private');
  }
};
