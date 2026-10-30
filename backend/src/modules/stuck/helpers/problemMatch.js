const SEARCH_CHARS = 600;
const SNIPPET_MIN = 80;
const SNIPPET_LENGTH = 200;

export const normalize = (text) => String(text ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

export const firstLine = (text) => String(text ?? '').split('\n').map((line) => line.trim()).find(Boolean) ?? '';

/** "A. Theatre Square" / "1A - Theatre Square" / "B1) X" → the title without the index prefix. */
export const stripIndexPrefix = (line) => line.replace(/^\d{0,6}[A-Z]\d?\s*[.:)\-–]\s+/, '');

/**
 * `$text` search string from the statement: its first characters, without quotes or minus signs
 * (they mean phrase / negation in MongoDB text search).
 */
export const searchQuery = (text) => String(text ?? '').slice(0, SEARCH_CHARS).replace(/["-]/g, ' ').replace(/\s+/g, ' ').trim();

const snippetOf = ({ description }) => {
  const body = normalize(description);
  return body.length >= SNIPPET_MIN ? body.slice(0, SNIPPET_LENGTH) : null;
};

/**
 * Exact match among text-search candidates: the statement's first line equals a candidate's
 * title (index prefix like "A." removed, case and spaces ignored), or the statement contains the
 * start of a candidate's description. Null when nothing matches exactly.
 */
export const findExactMatch = (text, candidates) => {
  const title = normalize(stripIndexPrefix(firstLine(text)));
  const body = normalize(text);
  return candidates.find((problem) => {
    if (title && normalize(problem.title) === title) return true;
    const snippet = snippetOf(problem);
    return Boolean(snippet && body.includes(snippet));
  }) ?? null;
};

/** Statement text of a stored problem, used to ask the coach about a problem found by id. */
export const statementOf = (problem) => [
  problem.title, problem.description, problem.inputFormat && `Input\n${problem.inputFormat}`,
  problem.outputFormat && `Output\n${problem.outputFormat}`, problem.note && `Note\n${problem.note}`,
].filter(Boolean).join('\n\n');
