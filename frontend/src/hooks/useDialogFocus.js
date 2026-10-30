import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

const focusables = (node) => [...node.querySelectorAll(FOCUSABLE)];

/** Keeps Tab inside the dialog: from the last element back to the first and the other way round. */
const trapTab = (node, event) => {
  const items = focusables(node);
  if (items.length === 0) return;
  const first = items[0];
  const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

/**
 * Modal focus handling: focus [data-autofocus] (or the first control) on open, trap Tab,
 * close on Escape, and give focus back to whatever opened the dialog.
 */
export const useDialogFocus = ({ open, onClose }) => {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    if (!open || !node) return undefined;
    const opener = document.activeElement;
    (node.querySelector('[data-autofocus]') ?? focusables(node)[0] ?? node).focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
      } else if (event.key === 'Tab') {
        trapTab(node, event);
      }
    };
    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [open]);

  return ref;
};
