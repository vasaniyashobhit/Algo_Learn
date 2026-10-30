import { createEvent, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/msw/server.js';
import { renderApp } from '../test/renderWithProviders.jsx';
import { STUCK_ID, stuckResult } from '../test/stuckFixtures.js';

/** POST /stuck that records the multipart fields it received. */
const serveStuck = () => {
  const received = [];
  server.use(
    http.post('*/api/v1/stuck', async ({ request }) => {
      const form = await request.formData();
      received.push(Object.fromEntries([...form.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : value.name])));
      await delay(50);
      return HttpResponse.json({ success: true, data: stuckResult() }, { status: 201 });
    }),
  );
  return received;
};

const pngFile = () => new File(['png'], 'statement.png', { type: 'image/png' });

describe('StuckPage submit', () => {
  it('sends the text, shows the reading state, then opens the result without another request', async () => {
    const received = serveStuck();
    const { router } = renderApp('/stuck', { signedIn: true });
    await userEvent.type(await screen.findByLabelText('Problem statement'), 'Count the nice paths of maximum length, modulo 1e9+7.');
    await userEvent.click(screen.getByRole('button', { name: 'Get hints' }));
    expect(screen.getByRole('button', { name: 'Reading your problem…' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/Hints usually land in 15–30 seconds/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Vlad and the Nice Paths (hard version)' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/stuck/${STUCK_ID}`);
    expect(received).toEqual([{ inputType: 'text', text: 'Count the nice paths of maximum length, modulo 1e9+7.' }]);
  });

  it('pre-fills the link when opened from a problem page', async () => {
    const received = serveStuck();
    const url = 'https://codeforces.com/problemset/problem/1811/G2';
    renderApp({ pathname: '/stuck', state: { url } }, { signedIn: true });
    expect(await screen.findByRole('tab', { name: 'Link' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Problem link')).toHaveValue(url);
    await userEvent.click(screen.getByRole('button', { name: 'Get hints' }));
    await screen.findByRole('heading', { level: 1, name: /Vlad and the Nice Paths/ });
    expect(received).toEqual([{ inputType: 'url', url }]);
  });

  it('takes a dropped screenshot and highlights the zone while dragging', async () => {
    const received = serveStuck();
    renderApp('/stuck', { signedIn: true });
    await userEvent.click(await screen.findByRole('tab', { name: 'Image' }));
    const zone = screen.getByText('Drop a screenshot').closest('.drop-zone');
    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute('data-over', 'true');
    fireEvent.dragLeave(zone);
    expect(zone).toHaveAttribute('data-over', 'false');
    fireEvent.drop(zone, { dataTransfer: { files: [pngFile()] } });
    expect(screen.getByText('statement.png')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove statement.png' }));
    expect(screen.queryByText('statement.png')).not.toBeInTheDocument();
    fireEvent.drop(zone, { dataTransfer: { files: [pngFile()] } });
    await userEvent.click(screen.getByRole('button', { name: 'Get hints' }));
    await screen.findByRole('heading', { level: 1, name: /Vlad and the Nice Paths/ });
    expect(received).toEqual([{ inputType: 'image', file: 'statement.png' }]);
  });

  it('switches to the image tab when a screenshot is pasted, and ignores pasted text', async () => {
    renderApp('/stuck', { signedIn: true });
    await screen.findByLabelText('Problem statement');
    const textPaste = createEvent.paste(document, { clipboardData: { files: [] } });
    fireEvent(document, textPaste);
    expect(screen.getByRole('tab', { name: 'Text' })).toHaveAttribute('aria-selected', 'true');
    fireEvent(document, createEvent.paste(document, { clipboardData: { files: [pngFile()] } }));
    expect(screen.getByRole('tab', { name: 'Image' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('statement.png')).toBeInTheDocument();
  });
});
