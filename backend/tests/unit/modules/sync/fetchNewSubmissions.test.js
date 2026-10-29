import { describe, expect, it } from 'vitest';
import { fetchNewSubmissions } from '../../../../src/modules/sync/helpers/fetchNewSubmissions.js';
import { cfHistory, fakeCfClient } from '../../../helpers/codeforces.js';

const settings = { pageSize: 5, maxPages: 3 };

describe('fetchNewSubmissions', () => {
  it('reads pages until a short page on the first sync', async () => {
    const client = fakeCfClient({ submissions: cfHistory(12) });
    const { submissions, pages } = await fetchNewSubmissions(client, 'ada', settings);
    expect(pages).toBe(3);
    expect(submissions).toHaveLength(12);
    expect(client.userStatus.mock.calls).toEqual([['ada', 1, 5], ['ada', 6, 5], ['ada', 11, 5]]);
  });

  it('stops at maxPages on the first sync', async () => {
    const client = fakeCfClient({ submissions: cfHistory(40) });
    const { submissions, pages } = await fetchNewSubmissions(client, 'ada', settings);
    expect(pages).toBe(3);
    expect(submissions.map(({ id }) => id)).toEqual(cfHistory(15, 26).map(({ id }) => id));
  });

  it('stops at the page that reaches `after` and keeps only newer ids', async () => {
    const client = fakeCfClient({ submissions: cfHistory(40) });
    const { submissions, pages } = await fetchNewSubmissions(client, 'ada', { ...settings, after: 33 });
    expect(pages).toBe(2);
    expect(submissions.map(({ id }) => id)).toEqual([40, 39, 38, 37, 36, 35, 34]);
  });

  it('reads one page when nothing is new', async () => {
    const client = fakeCfClient({ submissions: cfHistory(40) });
    const { submissions, pages } = await fetchNewSubmissions(client, 'ada', { ...settings, after: 40 });
    expect({ count: submissions.length, pages }).toEqual({ count: 0, pages: 1 });
  });

  it('copes with an empty or missing result', async () => {
    const client = { userStatus: async () => undefined };
    expect(await fetchNewSubmissions(client, 'ada', settings)).toEqual({ submissions: [], pages: 1 });
  });
});
