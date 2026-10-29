import { describe, expect, it } from 'vitest';
import { createServices } from '../../src/services.js';
import { fakeCfClient } from '../helpers/codeforces.js';
import { accountGone } from '../../src/modules/users/helpers/accountGone.js';

describe('createServices', () => {
  it('shares one Codeforces client between the services and jobs', () => {
    const client = fakeCfClient();
    const services = createServices({ client });
    expect(services.client).toBe(client);
    expect(Object.keys(services.handleService)).toEqual(['linkHandle', 'unlinkHandle']);
    expect(Object.keys(services.syncService)).toEqual(['syncUser']);
    expect(Object.keys(services.statsService)).toEqual(['recomputeForUser', 'getStats', 'getSummary']);
    expect(Object.keys(services.jobs)).toEqual(['syncAllUsers', 'syncProblemset']);
    expect(services.jobs.syncAllUsers.name).toBe('syncAllUsers');
  });

  it('uses an injected stats service', () => {
    const statsService = { recomputeForUser: async () => {} };
    expect(createServices({ client: fakeCfClient(), statsService }).statsService).toBe(statsService);
  });

  it('builds a real client by default', () => {
    expect(Object.keys(createServices().client)).toEqual(['problemsetProblems', 'userInfo', 'userStatus']);
  });
});

describe('accountGone', () => {
  it('is a 401 AUTH_INVALID_TOKEN', () => {
    expect(accountGone()).toMatchObject({ statusCode: 401, code: 'AUTH_INVALID_TOKEN' });
  });
});
