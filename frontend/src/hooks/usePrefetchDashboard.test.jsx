import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PAIR_PARAMS, RADAR_PARAMS } from '../lib/dashboardData.js';
import { queryKeys } from '../lib/queryKeys.js';
import { authStore } from '../lib/authStore.js';
import { TEST_TOKEN } from '../test/fixtures.js';
import { renderQueryHook } from '../test/hookHarness.jsx';
import { usePrefetchDashboard } from './usePrefetchDashboard.js';

const DASHBOARD_KEYS = [
  queryKeys.stats.summary(),
  queryKeys.stats.topics(RADAR_PARAMS),
  queryKeys.stats.topics(PAIR_PARAMS),
  queryKeys.recommendations.all,
];

describe('usePrefetchDashboard', () => {
  it('fills the cache with the four dashboard queries before the page asks for them', async () => {
    authStore.setToken(TEST_TOKEN);
    const { result, queryClient } = renderQueryHook(() => usePrefetchDashboard());
    result.current();
    await waitFor(() => DASHBOARD_KEYS.forEach((key) => expect(queryClient.getQueryData(key)).toBeDefined()));
    expect(queryClient.getQueryData(queryKeys.stats.summary()).data).toBeDefined();
  });

  it('returns a stable function', () => {
    const { result, rerender } = renderQueryHook(() => usePrefetchDashboard());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
