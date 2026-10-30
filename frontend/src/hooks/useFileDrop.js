import { useState } from 'react';

/**
 * Drag-and-drop handlers for an upload zone: `over` is true while a file hovers it, and the
 * first dropped file goes to onFile. Spread `handlers` on the zone element.
 */
export const useFileDrop = (onFile) => {
  const [over, setOver] = useState(false);
  const handlers = {
    onDragOver: (event) => {
      event.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (event) => {
      event.preventDefault();
      setOver(false);
      const [file] = event.dataTransfer?.files ?? [];
      if (file) onFile(file);
    },
  };
  return { over, handlers };
};
