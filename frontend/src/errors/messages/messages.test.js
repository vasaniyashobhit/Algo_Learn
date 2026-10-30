import { describe, expect, it } from 'vitest';
import { codeforcesMessages } from './codeforces.messages.js';
import { genericMessage, networkMessage, statusMessages, timeoutMessage } from './fallback.messages.js';
import { problemsMessages } from './problems.messages.js';
import { stuckMessages } from './stuck.messages.js';

describe('feature messages with params', () => {
  it('names the handle when it is known', () => {
    expect(codeforcesMessages.CF_HANDLE_TAKEN.default({ handle: 'ananya_k' })).toMatch(/"ananya_k" is already linked/);
    expect(codeforcesMessages.CF_HANDLE_NOT_FOUND.default({})).toMatch(/that handle/);
    expect(codeforcesMessages.CF_UNAVAILABLE.contexts.sync()).toMatch(/couldn't sync/);
  });

  it('names the problem id when it is known', () => {
    expect(problemsMessages.PROBLEM_NOT_FOUND.default({ problemId: '1811/G2' })).toMatch(/1811\/G2/);
    expect(problemsMessages.PROBLEM_NOT_FOUND.default({})).toMatch(/that problem/);
  });

  it('explains each link failure reason', () => {
    expect(stuckMessages.URL_FETCH_FAILED.default({ reason: 'timeout' })).toMatch(/took too long/);
    expect(stuckMessages.URL_FETCH_FAILED.default({ reason: 'unknown' })).toMatch(/couldn't open that link/);
  });

  it('distinguishes unreadable PDFs from images', () => {
    expect(stuckMessages.INPUT_UNREADABLE.default({ inputType: 'pdf' })).toMatch(/no selectable text/);
    expect(stuckMessages.INPUT_UNREADABLE.default({ inputType: 'image' })).toMatch(/couldn't read that file/);
    expect(stuckMessages.PROBLEM_TEXT_TOO_SHORT.default({ minLength: 60 })).toMatch(/60 characters/);
  });

  it('has fallbacks for network, timeout, statuses and the generic case', () => {
    expect(networkMessage()).toMatch(/connection/);
    expect(timeoutMessage()).toMatch(/too long/);
    expect(genericMessage()).toMatch(/Something went wrong/);
    Object.values(statusMessages).forEach((format) => expect(format().length).toBeGreaterThan(10));
  });
});
