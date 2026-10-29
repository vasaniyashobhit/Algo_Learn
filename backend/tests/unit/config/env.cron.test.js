import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../../src/config/env.js';
import { buildEnv } from '../../helpers/envFactory.js';

describe('SYNC_CRON', () => {
  it('accepts a valid cron expression', () => {
    expect(parseEnv(buildEnv({ SYNC_CRON: '*/30 * * * *' })).SYNC_CRON).toBe('*/30 * * * *');
  });

  it('rejects an invalid cron expression at startup', () => {
    expect(() => parseEnv(buildEnv({ SYNC_CRON: 'every six hours' })))
      .toThrow(/SYNC_CRON: Must be a valid cron expression/);
  });
});
