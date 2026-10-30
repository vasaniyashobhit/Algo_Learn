import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { codes as backendCodes } from '../../../backend/src/errors/codes.js';
import { CODE_LIST, codes, SESSION_ENDING_CODES } from './codes.js';
import { messages } from './messages/index.js';

const apiDoc = readFileSync(resolve(process.cwd(), '../docs/API.md'), 'utf8');
const documentedCodes = [...apiDoc.matchAll(/^\| `([A-Z_]+)` \| \d/gm)].map((match) => match[1]);

describe('error codes', () => {
  it('has all 27 codes, including DB_UNAVAILABLE', () => {
    expect(CODE_LIST).toHaveLength(27);
    expect(codes.DB_UNAVAILABLE).toBe('DB_UNAVAILABLE');
  });

  it('matches the backend list exactly', () => {
    expect([...CODE_LIST].sort()).toEqual(Object.keys(backendCodes).sort());
  });

  it('matches the error code table in docs/API.md', () => {
    expect([...documentedCodes].sort()).toEqual([...CODE_LIST].sort());
  });

  it('ends the session only for expired or invalid tokens', () => {
    expect(SESSION_ENDING_CODES).toEqual(['AUTH_TOKEN_EXPIRED', 'AUTH_INVALID_TOKEN']);
  });
});

describe('messages', () => {
  it.each(CODE_LIST)('%s has a user message', (code) => {
    const entry = messages[code];
    expect(entry, `missing message for ${code}`).toBeDefined();
    const text = entry.default({});
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(10);
    Object.values(entry.contexts ?? {}).forEach((format) => expect(format({}).length).toBeGreaterThan(10));
  });

  it('has no messages for codes that do not exist', () => {
    expect(Object.keys(messages).filter((code) => !CODE_LIST.includes(code))).toEqual([]);
  });

  it('never mentions CP Coach', () => {
    const all = CODE_LIST.flatMap((code) => [
      messages[code].default({}),
      ...Object.values(messages[code].contexts ?? {}).map((format) => format({})),
    ]);
    expect(all.join(' ')).not.toMatch(/cp coach/i);
  });
});
