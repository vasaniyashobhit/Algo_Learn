import { describe, expect, it } from 'vitest';
import { lazyPage, pageLoaders } from './lazyPages.js';

describe('lazyPages', () => {
  it('has a loader per signed-in page, each resolving to its module', async () => {
    const dashboard = await pageLoaders.dashboard();
    expect(dashboard.DashboardPage).toBeTypeOf('function');
    const stuck = await pageLoaders.stuckResult();
    expect(stuck.StuckResultPage).toBeTypeOf('function');
    expect(Object.keys(pageLoaders)).toHaveLength(8);
  });

  it('wraps a named export for React.lazy', () => {
    const Page = lazyPage('history', 'HistoryPage');
    expect(Page.$$typeof).toBe(Symbol.for('react.lazy'));
  });
});
