import { useEffect } from 'react';

/** The first image file on a clipboard event, or null (pasted text is left alone). */
export const imageFromClipboard = (event) =>
  [...(event.clipboardData?.files ?? [])].find((file) => file.type.startsWith('image/')) ?? null;

/** Calls onImage(file) when a screenshot is pasted anywhere on the page (Ctrl+V). */
export const usePasteImage = (onImage) => {
  useEffect(() => {
    const onPaste = (event) => {
      const file = imageFromClipboard(event);
      if (!file) return;
      event.preventDefault();
      onImage(file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [onImage]);
};
