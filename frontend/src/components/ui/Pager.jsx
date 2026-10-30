import { Button } from './Button.jsx';

/** Previous / "2 / 6" / Next. Hidden when everything fits on one page. */
export const Pager = ({ page, totalPages, onChange, label = 'Pages', previous = 'Previous', next = 'Next' }) => {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="mt-7 flex items-center justify-center gap-6">
      <Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {previous}
      </Button>
      <p className="fig m-0 text-[1.4rem]">
        <span className="sr-only">Page </span>
        {page}
        <span aria-hidden="true"> / </span>
        <span className="sr-only"> of </span>
        {totalPages}
      </p>
      <Button variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        {next}
      </Button>
    </nav>
  );
};
