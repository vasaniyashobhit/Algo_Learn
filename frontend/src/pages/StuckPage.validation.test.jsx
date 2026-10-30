import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/msw/server.js';
import { renderApp } from '../test/renderWithProviders.jsx';

/** Fails the test if the form sends anything: these mistakes must be caught before a request. */
const forbidSubmit = () => {
  let sent = 0;
  server.use(
    http.post('*/api/v1/stuck', () => {
      sent += 1;
      return HttpResponse.json({}, { status: 500 });
    }),
  );
  return () => sent;
};

const file = (name, type, size = 2048) => {
  const upload = new File(['%PDF'], name, { type });
  Object.defineProperty(upload, 'size', { value: size });
  return upload;
};

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Get hints' }));

describe('StuckPage client checks', () => {
  it('shows the practice-only note and the four tabs', async () => {
    renderApp('/stuck', { signedIn: true });
    expect(await screen.findByText('For practice and upsolving only.')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Text', 'Link', 'PDF', 'Image']);
    expect(document.title).toBe("I'm stuck · AlgoLearn");
  });

  it('needs 40 characters of text, and says how many there are', async () => {
    const sent = forbidSubmit();
    renderApp('/stuck', { signedIn: true });
    await userEvent.type(await screen.findByLabelText('Problem statement'), 'Count the paths.');
    expect(screen.getByText('At least 40 characters, so we can match it.')).toBeInTheDocument();
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Paste at least 40 characters of the problem statement so we can match it (you have 16).');
    expect(screen.getByLabelText('Problem statement')).toHaveAttribute('aria-invalid', 'true');
    expect(sent()).toBe(0);
  });

  it('refuses links the server would refuse', async () => {
    const sent = forbidSubmit();
    renderApp('/stuck', { signedIn: true });
    await userEvent.click(await screen.findByRole('tab', { name: 'Link' }));
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Paste a link to the problem page.');
    await userEvent.type(screen.getByLabelText('Problem link'), 'http://localhost:3000/problem');
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent(/unusual ports/);
    await userEvent.clear(screen.getByLabelText('Problem link'));
    await userEvent.type(screen.getByLabelText('Problem link'), 'http://192.168.0.2/p');
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent(/private or local address/);
    expect(screen.getByRole('button', { name: 'Paste text instead' })).toBeInTheDocument();
    expect(sent()).toBe(0);
  });

  it('checks file size and type before uploading', async () => {
    const sent = forbidSubmit();
    renderApp('/stuck', { signedIn: true });
    await userEvent.click(await screen.findByRole('tab', { name: 'PDF' }));
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a PDF first.');
    fireEvent.change(screen.getByLabelText('browse your files'), { target: { files: [file('big.pdf', 'application/pdf', 6 * 1024 * 1024)] } });
    expect(screen.getByText('big.pdf')).toBeInTheDocument();
    expect(screen.getByText('6.0 MB')).toBeInTheDocument();
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('That file is over 5 MB. Try a smaller PDF or a cropped screenshot.');
    await userEvent.click(screen.getByRole('tab', { name: 'Image' }));
    fireEvent.change(screen.getByLabelText('browse your files'), { target: { files: [file('shot.gif', 'image/gif')] } });
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Use a PNG, JPEG or WebP screenshot.');
    expect(sent()).toBe(0);
  });

  it('moves between tabs with the arrow keys, Home and End', async () => {
    renderApp('/stuck', { signedIn: true });
    const text = await screen.findByRole('tab', { name: 'Text' });
    text.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Link' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Link' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Image' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Text' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}{Home}');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'stuck-tab-text');
  });
});
