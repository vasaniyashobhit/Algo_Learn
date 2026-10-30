import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog.jsx';

const renderDialog = (props = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog open title="Delete it?" confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} {...props}>
      <p>This cannot be undone.</p>
    </ConfirmDialog>,
  );
  return { onConfirm, onCancel };
};

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    render(<ConfirmDialog open={false} title="x" confirmLabel="y" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('is a labelled modal alert dialog with Cancel focused first', async () => {
    const { onConfirm } = renderDialog();
    const dialog = screen.getByRole('alertdialog', { name: 'Delete it?' });
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('cancels with Escape', async () => {
    const { onCancel } = renderDialog();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('cannot be dismissed while busy', async () => {
    const { onCancel } = renderDialog({ busy: true });
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('alertdialog').parentElement);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
