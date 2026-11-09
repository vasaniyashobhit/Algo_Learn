import { PROBLEM_ID_PATTERN } from '../../../config/constants.js';

const HOST = /^(?:www\.|m[1-3]\.)?codeforces\.(?:com|ru)$/i;
const PATHS = [
  /^\/contest\/(\d+)\/problem\/([a-z0-9]{1,3})\/?$/i,
  /^\/problemset\/problem\/(\d+)\/([a-z0-9]{1,3})\/?$/i,
  /^\/gym\/(\d+)\/problem\/([a-z0-9]{1,3})\/?$/i,
];

/**
 * Problem id from a Codeforces problem URL (contest, problemset or gym form), or null.
 * No fetch is needed: the id is looked up in our database. `url` is a URL object.
 */
export const parseCodeforcesUrl = (url) => {
  if (!['http:', 'https:'].includes(url.protocol) || !HOST.test(url.hostname)) return null;
  for (const pattern of PATHS) {
    const match = url.pathname.match(pattern);
    if (!match) continue;
    const id = `${Number(match[1])}/${match[2].toUpperCase()}`;
    return PROBLEM_ID_PATTERN.test(id) ? id : null;
  }
  return null;
};
