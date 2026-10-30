import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { practiceItem, problem } from '../../test/dashboardFixtures.js';
import { renderQueryHook } from '../../test/hookHarness.jsx';
import { respondOk } from '../../test/msw/scenarios.js';
import { useTagsQuery } from './meta.queries.js';
import { usePracticeStatuses } from './practice.queries.js';
import { useSimilarQuery } from './problems.queries.js';
import { useRecommendationsQuery } from './recommendations.queries.js';
import { statsReason, useStatsSummaryQuery, useTopicStatsQuery } from './stats.queries.js';

describe('query hooks', () => {
  it('loads the tag lists once', async () => {
    const { result } = renderQueryHook(() => useTagsQuery());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.topicTags).toEqual(['dp', 'greedy']);
  });

  it('loads similar problems for an id', async () => {
    respondOk('get', '/problems/1/A/similar', [problem('2/B')], { strategies: ['primary'] });
    const { result } = renderQueryHook(() => useSimilarQuery('1/A'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.data[0].id).toBe('2/B');
  });

  it('exposes the stats reason, or null when there is real data', async () => {
    const { result } = renderQueryHook(() => ({ summary: useStatsSummaryQuery(), topics: useTopicStatsQuery({ kind: 'pair' }), recs: useRecommendationsQuery() }));
    await waitFor(() => expect(result.current.summary.isSuccess && result.current.topics.isSuccess && result.current.recs.isSuccess).toBe(true));
    expect(statsReason(result.current.summary)).toBe('NO_HANDLE');
    expect(statsReason({ data: { meta: {} } })).toBeNull();
    expect(statsReason({})).toBeNull();
  });

  it('maps practice items to their status', async () => {
    respondOk('get', '/practice', [practiceItem('1/A'), practiceItem('2/B', { status: 'solved' })], { total: 2 });
    const { result } = renderQueryHook(() => usePracticeStatuses());
    await waitFor(() => expect(result.current.size).toBe(2));
    expect(result.current.get('2/B')).toBe('solved');
  });
});
