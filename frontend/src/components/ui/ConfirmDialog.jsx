import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';
import { FadeIn } from '../motion/FadeIn.jsx';
import { Button } from './Button.jsx';

/**
 * A modal confirm step for destructive actions (never window.confirm). Cancel gets focus
 * first, Escape and a click on the backdrop cancel, and focus returns to the opener.
 */
export const ConfirmDialog = ({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const bodyId = useId();
  const ref = useDialogFocus({ open, onClose: busy ? undefined : onCancel });
  if (!open) return null;

  const onBackdrop = (event) => {
    if (event.target === event.currentTarget && !busy) onCancel();
  };

  return createPortal(
    <div className="fixed inset-0 z-30 grid place-items-center bg-ground/80 p-5" onMouseDown={onBackdrop}>
      <FadeIn
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="w-[min(34rem,100%)] bg-band p-[1.6rem] text-ink shadow-[var(--shadow),inset_0_3px_0_var(--miss)] outline-none"
      >
        <h2 id={titleId} className="text-step-2">
          {title}
        </h2>
        <div id={bodyId} className="text-ink-soft [&>p:last-child]:mb-0">
          {children}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="text" data-autofocus onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant="outline" loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </FadeIn>
    </div>,
    document.body,
  );
};
