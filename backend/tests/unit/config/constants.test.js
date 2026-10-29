import { describe, expect, it } from 'vitest';
import * as constants from '../../../src/config/constants.js';

describe('constants', () => {
  it('PROBLEM_ID_PATTERN accepts 1-3 char A-Z/0-9 indexes only', () => {
    const ok = ['1/A', '1950/F2', '1723/GP1', '1723/GP2', '921/01', '921/02'];
    const bad = ['1A', '/A', '1/', '1/ABCD', '1/a', 'x/A', '1/A-1'];
    expect(ok.filter((id) => constants.PROBLEM_ID_PATTERN.test(id))).toEqual(ok);
    expect(bad.filter((id) => constants.PROBLEM_ID_PATTERN.test(id))).toEqual([]);
  });

  it('PROBLEM_INDEX_PATTERN and CONTEST_ID_PATTERN match route params', () => {
    expect(['A', 'B1', 'F2', 'GP1', '01'].every((i) => constants.PROBLEM_INDEX_PATTERN.test(i))).toBe(true);
    expect(['', 'a', 'ABCD', 'A-1'].some((i) => constants.PROBLEM_INDEX_PATTERN.test(i))).toBe(false);
    expect(['1', '1950', '1000000'].every((c) => constants.CONTEST_ID_PATTERN.test(c))).toBe(true);
    expect(['0', '01', 'x', '', '12345678'].some((c) => constants.CONTEST_ID_PATTERN.test(c))).toBe(false);
  });

  it('has similarity weights summing to 1 and a list cap of 50', () => {
    expect(constants.SIMILARITY).toMatchObject({ jaccardWeight: 0.75, ratingWeight: 0.25, maxK: 30 });
    expect(constants.SIMILARITY.defaultRatingWindow).toBe(300);
    expect(constants.PROBLEM_LIST.maxLimit).toBe(50);
    expect(Object.isFrozen(constants.SIMILARITY) && Object.isFrozen(constants.PROBLEM_LIST)).toBe(true);
  });

  it('has a 30-day LLM cache TTL and a 20k raw-input limit', () => {
    expect(constants.LLM_CACHE_TTL_SECONDS).toBe(2_592_000);
    expect(constants.STUCK_RAW_INPUT_MAX).toBe(20_000);
  });

  it('defines the agreed enums', () => {
    expect(constants.PROBLEM_SOURCES).toEqual(['hf', 'cf_api']);
    expect(constants.TOPIC_KINDS).toEqual(['single', 'pair']);
    expect(constants.STUCK_INPUT_TYPES).toEqual(['text', 'url', 'pdf', 'image']);
    expect(constants.TAG_SOURCES).toEqual(['db', 'ai', 'neighbors']);
    expect(constants.ANSWER_SOURCES).toEqual(['ai', 'cache', 'fallback']);
    expect(constants.PRACTICE_STATUSES).toEqual(['todo', 'solved', 'skipped']);
    expect(constants.PRACTICE_ORIGINS).toEqual(['recommendation', 'similar', 'stuck', 'manual']);
    expect(constants.GAP_STATUSES).toEqual(['untouched', 'weak', 'ok', 'strong']);
  });

  it('lists every Codeforces verdict once, including OK', () => {
    expect(constants.CF_VERDICTS).toContain('OK');
    expect(constants.CF_VERDICTS).toContain('WRONG_ANSWER');
    expect(new Set(constants.CF_VERDICTS).size).toBe(constants.CF_VERDICTS.length);
  });

  it('freezes every list', () => {
    Object.values(constants)
      .filter(Array.isArray)
      .forEach((list) => expect(Object.isFrozen(list)).toBe(true));
  });
});
