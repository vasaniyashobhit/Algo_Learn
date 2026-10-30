import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { emptySummary } from '../../test/dashboardFixtures.js';
import { testUser } from '../../test/fixtures.js';
import { server } from '../../test/msw/server.js';
import { respondError, useSyncedAccount } from '../../test/msw/scenarios.js';
import { renderApp } from '../../test/renderWithProviders.jsx';

const openDialog = async () => {
  renderApp('/dashboard', { signedIn: true });
  await userEvent.click(await screen.findByRole('button', { name: 'Unlink handle' }));
  return screen.getByRole('alertdialog', { name: 'Unlink ananya_k?' });
};

describe('UnlinkHandle', () => {
  it('asks in a dialog (never window.confirm), with Cancel focused, and Escape cancels', async () => {
    useSyncedAccount();
    const confirmSpy = vi.spyOn(window, 'confirm');
    const dialog = await openDialog();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(/removes your synced submissions/);
    expect(screen.getByRole('button', { name: 'Keep it linked' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlink handle' })).toHaveFocus();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog', async () => {
    useSyncedAccount();
    await openDialog();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Unlink and delete data' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Keep it linked' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Unlink and delete data' })).toHaveFocus();
  });

  it('unlinks after confirming and returns to the handle hero', async () => {
    useSyncedAccount();
    await openDialog();
    server.use(
      http.get('*/api/v1/auth/me', () => HttpResponse.json({ success: true, data: testUser })),
      http.get('*/api/v1/users/me/stats/summary', () => {
        const { data, meta } = emptySummary('NO_HANDLE');
        return HttpResponse.json({ success: true, data, meta });
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Unlink and delete data' }));
    expect(await screen.findByText('Handle unlinked. Your synced submissions and topic stats were removed.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Link your Codeforces handle' })).toBeInTheDocument();
  });

  it('closes and explains when unlinking is refused', async () => {
    useSyncedAccount();
    respondError('delete', '/users/me/handle', 409, 'SYNC_IN_PROGRESS');
    await openDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Unlink and delete data' }));
    expect(await screen.findByText(/A sync of your account is running/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: 'ananya_k' })).toBeInTheDocument();
  });

  it('a click on the backdrop cancels', async () => {
    useSyncedAccount();
    const dialog = await openDialog();
    await userEvent.click(dialog.parentElement);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
