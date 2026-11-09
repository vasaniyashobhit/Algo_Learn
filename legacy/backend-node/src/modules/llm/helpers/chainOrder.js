/**
 * Order in which the chain tries providers: the first Gemini model, then the other providers
 * (Groq is fast), then the remaining Gemini models. Pure; keeps the order within each group.
 */
export const chainOrder = (providers) => {
  const gemini = providers.filter(({ name }) => name === 'gemini');
  const others = providers.filter(({ name }) => name !== 'gemini');
  return [...gemini.slice(0, 1), ...others, ...gemini.slice(1)];
};
