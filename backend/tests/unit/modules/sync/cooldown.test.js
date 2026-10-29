import { describe, expect, it } from 'vitest';
import { cooldownLeftMs } from '../../../../src/modules/sync/helpers/cooldown.js';

const NOW = new Date('2026-10-30T10:00:20Z');

describe('cooldownLeftMs', () => {
  it('is 0 when never synced or without a cooldown', () => {
    expect(cooldownLeftMs(null, NOW, 20_000)).toBe(0);
    expect(cooldownLeftMs(new Date('2026-10-30T10:00:19Z'), NOW, 0)).toBe(0);
    expect(cooldownLeftMs(new Date('2026-10-30T10:00:19Z'), NOW)).toBe(0);
  });

  it('returns the time left inside the cooldown', () => {
    expect(cooldownLeftMs(new Date('2026-10-30T10:00:15Z'), NOW, 20_000)).toBe(15_000);
    expect(cooldownLeftMs('2026-10-30T10:00:19.500Z', NOW, 20_000)).toBe(19_500);
  });

  it('is 0 exactly at and after the end of the cooldown', () => {
    expect(cooldownLeftMs(new Date('2026-10-30T10:00:00Z'), NOW, 20_000)).toBe(0);
    expect(cooldownLeftMs(new Date('2026-10-30T09:00:00Z'), NOW, 20_000)).toBe(0);
  });
});
