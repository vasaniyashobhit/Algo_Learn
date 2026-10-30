import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest runs from the frontend folder (npm -w frontend or directly).
const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));

describe('vercel.json', () => {
  it('rewrites every unknown path to index.html so deep links reach the SPA router', () => {
    expect(config.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' });
    expect(config.outputDirectory).toBe('dist');
  });

  it('caches hashed assets forever but not the HTML', () => {
    const assets = config.headers.find(({ source }) => source === '/assets/(.*)');
    expect(assets.headers[0].value).toContain('immutable');
    expect(config.headers.some(({ source, headers }) => source === '/(.*)' && headers.some(({ key }) => key === 'Cache-Control'))).toBe(false);
  });
});
