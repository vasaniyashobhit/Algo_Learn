import { describe, expect, it } from 'vitest';
import { STUCK_FALLBACK_NOTICE } from '../../../../src/config/constants.js';
import { buildResult, solutionOf } from '../../../../src/modules/stuck/helpers/buildResult.js';
import { coachAnswer } from '../../../helpers/stuck.js';

const problem = { matchedProblemId: '1/A', title: 'T', tags: ['math'], tagsSource: 'db', rating: 1000 };
const gap = { message: 'm', items: [], topics: [] };
const similar = { items: [], easier: false, targetRating: 1000, strategies: ['primary'] };

describe('buildResult', () => {
  it('uses the AI hints and has no notice for an AI answer', () => {
    const result = buildResult({ coach: { answer: coachAnswer(), source: 'ai' }, problem, editorial: 'E', gap, similar });
    expect(result).toEqual({
      source: 'ai', notice: null, fallbackReason: null, problem,
      hints: ['Each side needs ceil(n / a) stones'], hasSolution: true, editorialAvailable: true, gap, similar,
    });
  });

  it('sets the notice and fallback hints for the fallback', () => {
    const coach = { answer: null, source: 'fallback', reason: 'AI_BUSY' };
    const result = buildResult({ coach, problem, editorial: 'Ceil both sides.', gap, similar });
    expect(result).toMatchObject({
      source: 'fallback', notice: STUCK_FALLBACK_NOTICE, fallbackReason: 'AI_BUSY', hasSolution: false, editorialAvailable: true,
    });
    expect(result.hints).toEqual(['This problem most likely uses math.', 'From the editorial: Ceil both sides.']);
  });

  it('falls back to generated hints when a cached answer has none, and reports a blank editorial', () => {
    const coach = { answer: coachAnswer({ hints: [] }), source: 'cache' };
    const result = buildResult({ coach, problem, editorial: '  ', gap, similar });
    expect(result).toMatchObject({ notice: null, editorialAvailable: false, hasSolution: true });
    expect(result.hints).toEqual(['This problem most likely uses math.']);
  });
});

describe('solutionOf', () => {
  it('keeps only the solution fields', () => {
    expect(solutionOf(coachAnswer())).toEqual({
      approach: 'Multiply ceil(n/a) by ceil(m/a).', solutionSteps: ['Read input', 'Print the product'],
      complexity: 'O(1)', code: 'int main() {}', pitfalls: ['Use 64-bit integers'],
    });
    expect(solutionOf({ approach: 'x' })).toMatchObject({ code: null, pitfalls: null });
  });

  it('is null without an approach', () => {
    expect(solutionOf(null)).toBeNull();
    expect(solutionOf({ hints: ['x'] })).toBeNull();
  });
});
