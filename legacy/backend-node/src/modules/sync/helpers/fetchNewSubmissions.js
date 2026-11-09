/**
 * Reads `user.status` newest first in pages of `pageSize` until a page reaches `after`
 * (the last stored submission id), a page comes back short, or `maxPages` pages were read.
 * With `after = null` (first sync) that means at most maxPages × pageSize submissions.
 */
export const fetchNewSubmissions = async (client, handle, { after = null, pageSize, maxPages }) => {
  const collected = [];
  let pages = 0;
  while (pages < maxPages) {
    const page = (await client.userStatus(handle, pages * pageSize + 1, pageSize)) ?? [];
    pages += 1;
    const fresh = after === null ? page : page.filter(({ id }) => id > after);
    collected.push(...fresh);
    if (page.length < pageSize || fresh.length < page.length) break;
  }
  return { submissions: collected, pages };
};
