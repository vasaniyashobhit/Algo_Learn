import { vi } from 'vitest';

/** A tiny valid one-page PDF whose only text is `line` (unpdf can read it). */
export const makePdf = (line = 'Theatre Square in Berland') => {
  const stream = `BT /F1 12 Tf 10 100 Td (${line}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = objects.map((object, i) => {
    const at = out.length;
    out += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return at;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((at) => `${String(at).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
};

/** Buffers that pass the signature check for each image type. */
export const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
export const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);

export const STATEMENT = [
  'A. Theatre Square',
  'Theatre Square in the capital city of Berland has a rectangular shape with the size n × m meters.',
  'Find the least number of a × a flagstones needed to pave the Square.',
].join('\n');

/** DNS lookup fake: host → list of addresses (unknown hosts fail like ENOTFOUND). */
export const fakeLookup = (table = {}) => vi.fn(async (host) => {
  const addresses = table[host];
  if (!addresses) throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { code: 'ENOTFOUND' });
  return addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
});

export const html = (body) => `<html><head><script>var x = 1;</script></head><body>${body}</body></html>`;

/** fetch fake: url → Response (or a function returning one / throwing). Unknown urls → 404. */
export const fakeFetch = (routes = {}) => vi.fn(async (url, init) => {
  const route = routes[url];
  if (typeof route === 'function') return route(url, init);
  if (route) return route.clone();
  return new Response('not found', { status: 404 });
});

export const page = (body, { status = 200, type = 'text/html; charset=utf-8', headers = {} } = {}) =>
  new Response(body, { status, headers: { 'content-type': type, ...headers } });

export const redirect = (location, status = 302) => new Response(null, { status, headers: { location } });

/** The llm interface of createLlm, faked. */
export const fakeLlm = ({ coach = { answer: null, source: 'fallback', reason: 'AI_UNAVAILABLE' }, image = null } = {}) => ({
  getCoachAnswer: vi.fn(async () => coach),
  extractImageText: vi.fn(async () => image),
});

/** A sanitized coach answer as getCoachAnswer returns it. */
export const coachAnswer = (overrides = {}) => ({
  tags: ['math'],
  estimatedRating: 1000,
  hints: ['Each side needs ceil(n / a) stones'],
  approach: 'Multiply ceil(n/a) by ceil(m/a).',
  solutionSteps: ['Read input', 'Print the product'],
  complexity: 'O(1)',
  code: 'int main() {}',
  pitfalls: ['Use 64-bit integers'],
  ...overrides,
});
