/**
 * Value comparison after masking what differs by design between two independent servers: ids (ObjectId vs UUID),
 * tokens, request ids, timestamps and uptime. Numbers are compared to 3 decimals (time decay moves the 4th).
 */
const VOLATILE_KEYS = new Set(['id', 'userId', 'token', 'requestId', 'uptime', 'time']);
const ID_TEXT = /\b([0-9a-f]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi;
const ISO_TIME = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g;

const isVolatile = (key) => VOLATILE_KEYS.has(key) || /At$/.test(key);

/** The value with volatile parts replaced by placeholders. */
export const mask = (value, key = '') => {
  if (value === null || value === undefined) return value;
  if (isVolatile(key)) return `<${key}>`;
  if (Array.isArray(value)) return value.map((item) => mask(item));
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mask(v, k)]));
  if (typeof value === 'number') return Math.round(value * 1000) / 1000;
  if (typeof value === 'string') return value.replace(ID_TEXT, '<id>').replace(ISO_TIME, '<time>');
  return value;
};

const show = (value) => {
  const text = JSON.stringify(value);
  return text === undefined ? 'missing' : text.length > 90 ? `${text.slice(0, 87)}...` : text;
};

/** Paths whose masked values differ (at most `limit`), e.g. `data[0].problemId: "1/A" ≠ "2/A"`. */
export const valueDiff = (a, b, at = '', out = [], limit = 12) => {
  if (out.length >= limit) return out;
  const both = (type) => typeof a === type && typeof b === type && a !== null && b !== null;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${at}.length: ${a.length} ≠ ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) valueDiff(a[i], b[i], `${at}[${i}]`, out, limit);
    return out;
  }
  if (both('object') && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    keys.forEach((key) => valueDiff(a[key], b[key], at ? `${at}.${key}` : key, out, limit));
    return out;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${at || '(root)'}: ${show(a)} ≠ ${show(b)}`);
  return out;
};
