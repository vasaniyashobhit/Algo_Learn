import { COPY_CONTEST_GAP } from '../../../config/constants.js';

/**
 * Anchored `_id` prefixes ("1898/", ..., "1902/") for the contests a Div1/Div2 copy of a problem
 * in `contestId` can live in. Anchored regexes in `$in` can use the `_id` index.
 */
export const copyIdPrefixes = (contestId, gap = COPY_CONTEST_GAP) =>
  Array.from({ length: 2 * gap + 1 }, (_, i) => contestId - gap + i)
    .filter((id) => id >= 1)
    .map((id) => new RegExp(`^${id}/`));
