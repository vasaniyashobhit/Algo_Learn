import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { retryClock } from '../lib/formatters.js';
import { respondError } from '../test/msw/scenarios.js';
import { renderApp } from '../test/renderWithProviders.jsx';

const STATEMENT = 'Vlad has n tiles in a row, each with a colour. Count the nice paths of maximum length.';

const sendText = async () => {
  renderApp('/stuck', { signedIn: true });
  await userEvent.type(await screen.findByLabelText('Problem statement'), STATEMENT);
  await userEvent.click(screen.getByRole('button', { name: 'Get hints' }));
};

const sendLink = async (url = 'https://example.com/problem/7') => {
  renderApp('/stuck', { signedIn: true });
  await userEvent.click(await screen.findByRole('tab', { name: 'Link' }));
  await userEvent.type(screen.getByLabelText('Problem link'), url);
  await userEvent.click(screen.getByRole('button', { name: 'Get hints' }));
};

const sendScreenshot = async () => {
  renderApp('/stuck', { signedIn: true });
  await userEvent.click(await screen.findByRole('tab', { name: 'Image' }));
  const shot = new File(['png'], 'shot.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('browse your files'), { target: { files: [shot] } });
  await userEvent.click(screen.getByRole('button', { name: 'Get hints' }));
};

describe('StuckPage server errors', () => {
  it('PROBLEM_TEXT_TOO_SHORT', async () => {
    respondError('post', '/stuck', 400, 'PROBLEM_TEXT_TOO_SHORT', { minLength: 40, length: 38 });
    await sendText();
    expect(await screen.findByRole('alert')).toHaveTextContent('(you have 38)');
  });

  it('URL_NOT_ALLOWED', async () => {
    respondError('post', '/stuck', 400, 'URL_NOT_ALLOWED', { reason: 'private' });
    await sendLink();
    expect(await screen.findByRole('alert')).toHaveTextContent(/private or local address/);
  });

  it('URL_FETCH_FAILED offers to paste the text instead', async () => {
    respondError('post', '/stuck', 503, 'URL_FETCH_FAILED', { reason: 'timeout' });
    await sendLink();
    expect(await screen.findByRole('alert')).toHaveTextContent('That page took too long to respond. Paste the statement as text instead.');
    await userEvent.click(screen.getByRole('button', { name: 'Paste text instead' }));
    expect(screen.getByRole('tab', { name: 'Text' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('FILE_TOO_LARGE from the server', async () => {
    respondError('post', '/stuck', 413, 'FILE_TOO_LARGE');
    await sendScreenshot();
    expect(await screen.findByRole('alert')).toHaveTextContent(/over 5 MB/);
  });

  it('FILE_TYPE_UNSUPPORTED when the bytes do not match', async () => {
    respondError('post', '/stuck', 415, 'FILE_TYPE_UNSUPPORTED', { inputType: 'image' });
    await sendScreenshot();
    expect(await screen.findByRole('alert')).toHaveTextContent('Use a PNG, JPEG or WebP screenshot.');
  });

  it('INPUT_UNREADABLE suggests pasting text and switches to the text tab', async () => {
    respondError('post', '/stuck', 422, 'INPUT_UNREADABLE', { inputType: 'image' });
    await sendScreenshot();
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't read a problem from that file. Paste the statement as text instead.");
    await userEvent.click(screen.getByRole('button', { name: 'Paste text instead' }));
    expect(screen.getByLabelText('Problem statement')).toBeInTheDocument();
  });

  it('RATE_LIMITED says when the next request opens, and links the history', async () => {
    respondError('post', '/stuck', 429, 'RATE_LIMITED', { retryAfterSeconds: 3600 });
    await sendText();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("You've used your 10 stuck requests for this hour. Try again in 1 hour.");
    expect(alert).toHaveTextContent(`Your next request opens at ${retryClock(3600)}.`);
    expect(screen.getByRole('link', { name: 'Open history' })).toHaveAttribute('href', '/history');
  });

  it('shows a reference for unexpected errors and keeps the input', async () => {
    respondError('post', '/stuck', 500, 'INTERNAL_ERROR', null, { requestId: 'req-stuck' });
    await sendText();
    expect(await screen.findByText('req-stuck')).toBeInTheDocument();
    expect(screen.getByLabelText('Problem statement')).toHaveValue(STATEMENT);
  });
});
