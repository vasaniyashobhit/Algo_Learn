import { useFileDrop } from '../../hooks/useFileDrop.js';
import { ACCEPT, fileSizeText } from '../../lib/stuckInput.js';
import { Button } from '../ui/Button.jsx';

const COPY = {
  pdf: { title: 'Drop a PDF', hint: 'One file, up to 5 MB. It needs selectable text; scans do not work.' },
  image: { title: 'Drop a screenshot', hint: 'PNG, JPEG or WebP, up to 5 MB. Crop to the statement. Ctrl+V pastes one.' },
};

const UploadIcon = ({ kind }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[34px] text-plate-text" aria-hidden="true">
    {kind === 'image' ? (
      <>
        <rect x="3" y="5" width="18" height="14" />
        <path d="m3 16 5-5 4 4 3-3 6 6" />
      </>
    ) : (
      <path d="M12 15V4m0 0L8 8m4-4 4 4M5 15v4h14v-4" />
    )}
  </svg>
);

/** The PDF or screenshot upload: drag-and-drop, a browse button (a real file input) and the chosen file. */
export const FileDrop = ({ kind, file, onFile, describedBy }) => {
  const { over, handlers } = useFileDrop(onFile);
  const { title, hint } = COPY[kind];
  const inputId = `stuck-file-${kind}`;
  return (
    <div className="drop-zone grid justify-items-center gap-2 px-4 py-12 text-center" data-over={over} {...handlers}>
      <UploadIcon kind={kind} />
      <p className="m-0">
        <b>{title}</b> or{' '}
        <label htmlFor={inputId} className="cursor-pointer underline underline-offset-4">
          browse your files
        </label>
      </p>
      <input
        id={inputId}
        type="file"
        accept={ACCEPT[kind]}
        className="sr-only"
        aria-describedby={[`${inputId}-hint`, describedBy].filter(Boolean).join(' ')}
        onChange={(event) => {
          const [chosen] = event.target.files ?? [];
          if (chosen) onFile(chosen);
          event.target.value = '';
        }}
      />
      {file ? (
        <p className="m-0 flex flex-wrap items-center justify-center gap-x-3 text-step--1" aria-live="polite">
          <span className="font-semibold">{file.name}</span>
          <span className="num text-ink-soft">{fileSizeText(file.size)}</span>
          <Button variant="text" onClick={() => onFile(null)} aria-label={`Remove ${file.name}`}>
            Remove
          </Button>
        </p>
      ) : (
        <p id={`${inputId}-hint`} className="m-0 text-step--1 text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
};
