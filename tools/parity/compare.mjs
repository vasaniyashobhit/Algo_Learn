import { keyOrderDiff, shapeDiff, shapeOf } from './shape.mjs';
import { mask, valueDiff } from './values.mjs';

/** What is kept of one response: status, error code, shape, and the masked body (also the snapshot format). */
export const record = (name, { status, body, ms }) => ({
  name, status, code: body?.error?.code ?? null, shape: shapeOf(body), masked: mask(body), ms,
});

/**
 * Compares the legacy (`a`) and Spring (`b`) record of one step. Status, error code and shape must match;
 * value and key-order differences are listed separately (some are deliberate, see expected.mjs).
 */
export const compare = (a, b, expected = {}) => {
  const problems = [];
  if (a.status !== b.status) problems.push(`status ${a.status} ≠ ${b.status}`);
  if (a.code !== b.code) problems.push(`error code ${a.code} ≠ ${b.code}`);
  problems.push(...shapeDiff(a.shape, b.shape).map((diff) => `shape ${diff}`));
  const values = valueDiff(a.masked, b.masked);
  const order = keyOrderDiff(a.masked, b.masked);
  const note = expected[a.name];
  return {
    name: a.name,
    ms: [a.ms, b.ms],
    legacy: `${a.status}${a.code ? ` ${a.code}` : ''}`,
    spring: `${b.status}${b.code ? ` ${b.code}` : ''}`,
    problems,
    values: note ? [] : values,
    expectedValues: note ? { note, values } : null,
    order,
    ok: problems.length === 0 && (note !== undefined || values.length === 0),
  };
};
