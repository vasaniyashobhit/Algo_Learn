import { describe, expect, it } from 'vitest';
import { chainOrder } from '../../../../src/modules/llm/helpers/chainOrder.js';

const p = (name, model) => ({ name, model });
const ids = (list) => chainOrder(list).map(({ name, model }) => `${name}:${model}`);

describe('chainOrder', () => {
  it('puts Groq right after the first Gemini model', () => {
    expect(ids([p('gemini', 'a'), p('gemini', 'b'), p('gemini', 'c'), p('groq', 'g')]))
      .toEqual(['gemini:a', 'groq:g', 'gemini:b', 'gemini:c']);
  });

  it('keeps the order when there is no Groq or only one Gemini model', () => {
    expect(ids([p('gemini', 'a'), p('gemini', 'b')])).toEqual(['gemini:a', 'gemini:b']);
    expect(ids([p('gemini', 'a'), p('groq', 'g')])).toEqual(['gemini:a', 'groq:g']);
  });

  it('handles no Gemini model and an empty list', () => {
    expect(ids([p('groq', 'g')])).toEqual(['groq:g']);
    expect(chainOrder([])).toEqual([]);
  });
});
