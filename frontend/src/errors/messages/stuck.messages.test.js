import { describe, expect, it } from 'vitest';
import { getUserMessage } from '../getUserMessage.js';

const say = (code, details, context) => getUserMessage({ code, details, status: 400 }, context);

describe('stuck input messages', () => {
  it('counts the characters of a short statement', () => {
    expect(say('PROBLEM_TEXT_TOO_SHORT', { minLength: 40, length: 12 })).toBe(
      'Paste at least 40 characters of the problem statement so we can match it (you have 12).',
    );
    expect(say('PROBLEM_TEXT_TOO_SHORT', null)).toMatch(/at least 40 characters.*match it\.$/);
  });

  it.each([
    ['scheme', /http:\/\/ or https:\/\//],
    ['credentials', /username or password/],
    ['port', /unusual ports/],
    ['private', /private or local address/],
    [undefined, /We can't open that link/],
  ])('explains a refused link (%s) and points at Codeforces', (reason, text) => {
    const message = say('URL_NOT_ALLOWED', { reason });
    expect(message).toMatch(text);
    expect(message).toMatch(/Codeforces problem page always works/);
  });

  it('explains a link that did not load and suggests pasting text', () => {
    expect(say('URL_FETCH_FAILED', { reason: 'status', status: 403 })).toBe(
      'That page returned an error. Paste the statement as text instead.',
    );
  });

  it('words file problems for the tab', () => {
    expect(say('FILE_TOO_LARGE')).toMatch(/over 5 MB/);
    expect(say('FILE_TYPE_UNSUPPORTED', { inputType: 'image' })).toBe('Use a PNG, JPEG or WebP screenshot.');
    expect(say('FILE_TYPE_UNSUPPORTED', { inputType: 'pdf' })).toBe('Choose a PDF file.');
    expect(say('FILE_TYPE_UNSUPPORTED')).toMatch(/PDF, PNG, JPEG, WebP or plain text/);
  });

  it('suggests pasting text when a file could not be read', () => {
    expect(say('INPUT_UNREADABLE', { inputType: 'pdf' })).toMatch(/no selectable text.*Paste the statement as text/);
    expect(say('INPUT_UNREADABLE', { inputType: 'image' })).toMatch(/Paste the statement as text instead/);
  });

  it('says when the hourly limit opens again', () => {
    expect(say('RATE_LIMITED', { retryAfterSeconds: 3600 }, 'stuck')).toBe(
      "You've used your 10 stuck requests for this hour. Try again in 1 hour.",
    );
  });
});

describe('"I solved it" messages', () => {
  it('has verify wording for the errors a check can hit', () => {
    expect(say('CF_HANDLE_NOT_LINKED', null, 'verify')).toMatch(/Link your Codeforces handle on the dashboard/);
    expect(say('CF_UNAVAILABLE', null, 'verify')).toMatch(/couldn't check your submission/);
    expect(say('SYNC_IN_PROGRESS', null, 'verify')).toMatch(/syncing right now/);
  });
});
