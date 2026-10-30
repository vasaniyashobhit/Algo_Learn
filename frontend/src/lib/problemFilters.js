// The problem browser's filters live in the URL (?tag=dp&min=1400&max=1800&page=2).
export const PAGE_SIZE = 20;
export const RATING_OPTIONS = Array.from({ length: 28 }, (_, step) => 800 + step * 100);

const toRating = (value) => {
  const number = Number(value);
  return value && RATING_OPTIONS.includes(number) ? number : null;
};

const toPage = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 1 ? number : 1;
};

/** URLSearchParams → { tag, minRating, maxRating, page } with anything invalid dropped. */
export const readFilters = (params) => ({
  tag: params.get('tag') || null,
  minRating: toRating(params.get('min')),
  maxRating: toRating(params.get('max')),
  page: toPage(params.get('page')),
});

/** Filters → a search params object; empty values and page 1 are left out. */
export const toSearch = ({ tag, minRating, maxRating, page }) =>
  Object.fromEntries(
    Object.entries({ tag, min: minRating, max: maxRating, page: page > 1 ? page : null })
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]),
  );

/**
 * One filter changed: back to page 1, and a crossed range moves the other bound with it
 * (the API refuses minRating > maxRating).
 */
export const setFilter = (filters, key, value) => {
  const next = { ...filters, [key]: value, page: 1 };
  if (next.minRating !== null && next.maxRating !== null && next.minRating > next.maxRating) {
    if (key === 'minRating') next.maxRating = next.minRating;
    else next.minRating = next.maxRating;
  }
  return next;
};

/** Filters → GET /problems query params. */
export const toQueryParams = ({ tag, minRating, maxRating, page }) => ({
  ...(tag ? { tags: tag } : {}),
  ...(minRating !== null ? { minRating } : {}),
  ...(maxRating !== null ? { maxRating } : {}),
  page,
  limit: PAGE_SIZE,
});

export const hasFilters = ({ tag, minRating, maxRating }) => Boolean(tag) || minRating !== null || maxRating !== null;
