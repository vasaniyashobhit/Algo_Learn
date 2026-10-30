import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../test/msw/server.js';
import { renderApp } from '../test/renderWithProviders.jsx';
import { historyItem } from '../test/stuckFixtures.js';

vi.mock('../lib/undoWindow.js', () => ({ UNDO_WINDOW_MS: 300 }));

/** An in-memory history API: GET answers what is left, DELETE removes (or fails with `deleteStatus`). */
const serveHistory = ({ deleteStatus = 200 } = {}) => {
  let items = [historyItem('a1', 'Flowers', { problem: { title: 'Flowers', matchedProblemId: '474/D' } }), historyItem('b2', 'Kefa and Dishes', { source: 'fallback', inputType: 'image', gapTopics: [] })];
  const deletes = [];
  server.use(
    http.get('*/api/v1/stuck/history', () =>
      HttpResponse.json({ success: true, data: items, meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } }),
    ),
    http.delete('*/api/v1/stuck/:id', async ({ params }) => {
      deletes.push(params.id);
      await delay(20);
      if (deleteStatus !== 200) {
        return HttpResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'x', requestId: 'req-del' } }, { status: deleteStatus });
      }
      items = items.filter((item) => item.id !== params.id);
      return HttpResponse.json({ success: true, data: { id: params.id, deleted: true } });
    }),
  );
  return deletes;
};

const deleteButton = (label) => screen.findByRole('button', { name: `Delete ${label} from your history` });

describe('HistoryPage', () => {
  it('lists past requests newest first, each opening its result', async () => {
    serveHistory();
    renderApp('/history', { signedIn: true });
    expect(await screen.findByLabelText('Loading your history')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Flowers 474\/D/ })).toHaveAttribute('href', '/stuck/a1');
    expect(screen.getByText('Screenshot')).toBeInTheDocument();
    expect(screen.getByText('Without AI')).toBeInTheDocument();
    expect(screen.getAllByText('(concept gap)')).toHaveLength(1);
    expect(screen.getByText('No gap')).toBeInTheDocument();
  });

  it('removes a row at once and sends the DELETE when the undo window ends', async () => {
    const deletes = serveHistory();
    renderApp('/history', { signedIn: true });
    await userEvent.click(await deleteButton('Flowers (474/D)'));
    expect(screen.queryByRole('link', { name: /Flowers/ })).not.toBeInTheDocument();
    expect(screen.getByText('Deleted Flowers (474/D)')).toBeInTheDocument();
    expect(deletes).toEqual([]);
    await waitFor(() => expect(deletes).toEqual(['a1']));
    expect(screen.queryByRole('link', { name: /Flowers/ })).not.toBeInTheDocument();
  });

  it('brings the row back on Undo and never sends the DELETE', async () => {
    const deletes = serveHistory();
    renderApp('/history', { signedIn: true });
    await userEvent.click(await deleteButton('Kefa and Dishes'));
    // fireEvent: sonner's swipe handler needs setPointerCapture, which jsdom does not have.
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('link', { name: /Kefa and Dishes/ })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(deletes).toEqual([]);
  });

  it('rolls the row back with a specific toast when the DELETE fails', async () => {
    serveHistory({ deleteStatus: 500 });
    renderApp('/history', { signedIn: true });
    await userEvent.click(await deleteButton('Flowers (474/D)'));
    expect(screen.queryByRole('link', { name: /Flowers/ })).not.toBeInTheDocument();
    expect(await screen.findByText("Couldn't delete Flowers (474/D)")).toBeInTheDocument();
    expect(screen.getByText(/Reference: req-del/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Flowers/ })).toBeInTheDocument();
  });

  it('suggests bringing a problem when the history is empty', async () => {
    server.use(http.get('*/api/v1/stuck/history', () => HttpResponse.json({ success: true, data: [], meta: { page: 1, total: 0, totalPages: 0 } })));
    renderApp('/history', { signedIn: true });
    expect(await screen.findByRole('heading', { name: 'No stuck requests yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bring a problem' })).toHaveAttribute('href', '/stuck');
  });
});
