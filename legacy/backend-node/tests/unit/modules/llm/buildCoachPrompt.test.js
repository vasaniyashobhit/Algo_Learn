import { describe, expect, it } from 'vitest';
import { buildCoachPrompt } from '../../../../src/modules/llm/prompts/buildCoachPrompt.js';
import { TOPIC_TAGS } from '../../../../src/config/tags.js';

describe('buildCoachPrompt', () => {
  const prompt = buildCoachPrompt({ text: 'Count the flagstones.', knownTags: ['math', 'math', '*special', 'nope'] });

  it('includes the problem text between markers', () => {
    expect(prompt).toContain('"""\nCount the flagstones.\n"""');
  });

  it('lists every official topic tag and no *special', () => {
    for (const tag of TOPIC_TAGS) expect(prompt).toContain(tag);
    expect(prompt).not.toContain('*special');
  });

  it('mentions only valid known tags', () => {
    expect(prompt).toContain('Known tags for this problem: math.');
  });

  it('asks for JSON only with every field', () => {
    expect(prompt).toMatch(/JSON object only/);
    for (const field of ['tags', 'estimatedRating', 'hints', 'approach', 'solutionSteps', 'complexity', 'code', 'pitfalls']) {
      expect(prompt).toContain(`"${field}"`);
    }
    expect(prompt).toContain('C++17');
    expect(prompt).toContain('exactly 3 short progressive hints');
  });

  it('frames the request as upsolving practice, never live contests', () => {
    expect(prompt).toMatch(/upsolving for practice/);
    expect(prompt).toMatch(/never for a live rated contest or an assessment/);
  });

  it('asks to infer tags when none are known', () => {
    expect(buildCoachPrompt({ text: 'x' })).toContain('No tags are known for this problem: infer them.');
  });

  it('truncates very long statements to 20,000 characters', () => {
    const long = buildCoachPrompt({ text: 'y'.repeat(30_000), tagList: ['dp'] });
    expect(long.match(/y{100,}/)[0]).toHaveLength(20_000);
  });
});
