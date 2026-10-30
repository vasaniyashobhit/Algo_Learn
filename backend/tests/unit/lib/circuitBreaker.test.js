import { describe, expect, it } from 'vitest';
import { createCircuitBreaker } from '../../../src/lib/circuitBreaker.js';

describe('createCircuitBreaker', () => {
  it('is closed for unknown keys', () => {
    expect(createCircuitBreaker({ openMs: 100 }).isOpen('a')).toBe(false);
  });

  it('opens a tripped key until openMs has passed, then closes it', () => {
    let now = 1_000;
    const breaker = createCircuitBreaker({ openMs: 120_000, now: () => now });
    breaker.trip('gemini:a');
    expect(breaker.isOpen('gemini:a')).toBe(true);
    expect(breaker.isOpen('gemini:b')).toBe(false);
    now += 119_999;
    expect(breaker.isOpen('gemini:a')).toBe(true);
    now += 1;
    expect(breaker.isOpen('gemini:a')).toBe(false);
    expect(breaker.isOpen('gemini:a')).toBe(false);
  });

  it('a second trip extends the window', () => {
    let now = 0;
    const breaker = createCircuitBreaker({ openMs: 10, now: () => now });
    breaker.trip('k');
    now = 8;
    breaker.trip('k');
    now = 15;
    expect(breaker.isOpen('k')).toBe(true);
  });
});
