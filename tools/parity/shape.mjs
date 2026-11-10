/**
 * JSON shapes: the keys and value types of a response, ignoring values. Arrays merge the shapes of all their
 * elements. Values are compared separately, after masking what differs by design (ids, tokens, timestamps).
 */
const typeOf = (value) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value);

const merge = (a, b) => {
  if (a === undefined) return b;
  if (typeof a === 'string' || typeof b === 'string') {
    return a === b ? a : [...new Set([...String(a).split('|'), ...String(b).split('|')])].sort().join('|');
  }
  if (a.array !== undefined || b.array !== undefined) return { array: merge(a.array, b.array) };
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return Object.fromEntries(keys.map((key) => [key, merge(a[key] ?? 'missing', b[key] ?? 'missing')]));
};

/** A string for primitives ('number', 'null', ...), `{ array: shape }`, or an object of key → shape. */
export const shapeOf = (value) => {
  const type = typeOf(value);
  if (type === 'array') return { array: value.map(shapeOf).reduce(merge, undefined) ?? 'empty' };
  if (type === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, shapeOf(v)]));
  return type;
};

/** Paths where two shapes differ, e.g. `data.items[].note: string ≠ missing`. An empty array matches any. */
export const shapeDiff = (a, b, at = '') => {
  if (a === 'empty' || b === 'empty') return [];
  if (typeof a === 'string' || typeof b === 'string') {
    return JSON.stringify(a) === JSON.stringify(b) ? [] : [`${at || '(root)'}: ${describe(a)} ≠ ${describe(b)}`];
  }
  if (a.array !== undefined || b.array !== undefined) {
    if (a.array === undefined || b.array === undefined) return [`${at}: ${describe(a)} ≠ ${describe(b)}`];
    return shapeDiff(a.array, b.array, `${at}[]`);
  }
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys.flatMap((key) => shapeDiff(a[key] ?? 'missing', b[key] ?? 'missing', at ? `${at}.${key}` : key));
};

const describe = (shape) => (typeof shape === 'string' ? shape : shape.array !== undefined ? 'array' : 'object');

/** Keys whose order differs (informational: JSON consumers do not depend on it). */
export const keyOrderDiff = (a, b, at = '') => {
  if (typeOf(a) !== typeOf(b) || a === null) return [];
  if (Array.isArray(a)) return a.length && b.length ? keyOrderDiff(a[0], b[0], `${at}[]`) : [];
  if (typeof a !== 'object') return [];
  const order = (o) => Object.keys(o).filter((key) => key in a && key in b).join(',');
  const own = order(a) === order(b) ? [] : [`${at || '(root)'}: ${order(a)} ≠ ${order(b)}`];
  return [...own, ...Object.keys(a).filter((key) => key in b)
    .flatMap((key) => keyOrderDiff(a[key], b[key], at ? `${at}.${key}` : key))];
};
