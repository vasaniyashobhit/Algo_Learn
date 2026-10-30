import { describe, expect, it } from 'vitest';
import { practiceItem } from '../test/dashboardFixtures.js';
import { filterOf, findItem, optimisticItem, removeItem, upsertItem } from './practiceCache.js';
import { queryKeys } from './queryKeys.js';

const list = (...items) => ({ data: items, meta: { total: items.length, status: null } });

describe('practice cache helpers', () => {
  it('reads the status filter from a list key', () => {
    expect(filterOf(queryKeys.practice.list('todo'))).toBe('todo');
    expect(filterOf(queryKeys.practice.list())).toBeNull();
    expect(filterOf(undefined)).toBeNull();
  });

  it('puts new items first and updates existing ones in place', () => {
    const a = practiceItem('1/A');
    const b = practiceItem('2/B');
    expect(upsertItem(list(a), b, null).data.map((i) => i.problemId)).toEqual(['2/B', '1/A']);
    const updated = upsertItem(list(a, b), { ...a, status: 'solved' }, null);
    expect(updated.data.map((i) => [i.problemId, i.status])).toEqual([['1/A', 'solved'], ['2/B', 'todo']]);
    expect(updated.meta.total).toBe(2);
  });

  it('drops an item from a list whose filter no longer matches, and skips lists it never belonged to', () => {
    const a = practiceItem('1/A');
    expect(upsertItem(list(a), { ...a, status: 'solved' }, 'todo').data).toEqual([]);
    const solvedList = list();
    expect(upsertItem(solvedList, a, 'solved')).toBe(solvedList);
    expect(upsertItem(undefined, a, null)).toBeUndefined();
  });

  it('removes items and finds them across snapshots', () => {
    const a = practiceItem('1/A');
    expect(removeItem(list(a), '1/A')).toMatchObject({ data: [], meta: { total: 0 } });
    expect(removeItem(undefined, '1/A')).toBeUndefined();
    expect(findItem([[['k'], list(a)], [['j'], undefined]], '1/A')).toBe(a);
    expect(findItem([], '1/A')).toBeNull();
  });

  it('builds a to-do placeholder until the server answers', () => {
    const item = optimisticItem({ problemId: '1/A', problem: { id: '1/A' } }, new Date('2026-10-30T00:00:00Z'));
    expect(item).toMatchObject({ problemId: '1/A', status: 'todo', addedFrom: 'manual', optimistic: true });
    expect(item.createdAt).toBe('2026-10-30T00:00:00.000Z');
  });
});
