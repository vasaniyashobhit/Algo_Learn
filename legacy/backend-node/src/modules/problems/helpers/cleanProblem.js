import { problemDerivedFields } from './derivedFields.js';

export const SPECIAL_TAG = '*special';

/** Trims a string; null/undefined/non-strings become ''. */
export const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

/** Numbers, BigInts (parquet INT64) and numeric strings → Number; anything else → null. */
export const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** Trimmed, non-empty, de-duplicated tags in their original order. */
export const cleanTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  const trimmed = tags.map(cleanText).filter(Boolean);
  return [...new Set(trimmed)];
};

/**
 * Maps one snake_case dataset row to a `problems` document (source "hf").
 * Returns null when the description is empty (the row is skipped).
 * `*special` stays in `tags` (it is a real CF tag); stats code excludes it from topic scores.
 */
export const cleanProblem = (row) => {
  const description = cleanText(row?.description);
  if (!description) return null;
  const tags = cleanTags(row.tags);
  const editorial = cleanText(row.editorial);
  return {
    _id: cleanText(row.id),
    contestId: toNumberOrNull(row.contest_id),
    index: cleanText(row.index),
    title: cleanText(row.title),
    description,
    inputFormat: cleanText(row.input_format),
    outputFormat: cleanText(row.output_format),
    note: cleanText(row.note),
    editorial,
    rating: toNumberOrNull(row.rating),
    tags,
    ...problemDerivedFields({ tags, editorial }),
    source: 'hf',
  };
};

export const hasSpecialTag = (problem) => problem.tags.includes(SPECIAL_TAG);
