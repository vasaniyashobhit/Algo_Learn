const URL_REASONS = {
  dns: "That website's address couldn't be found.",
  status: 'That page returned an error.',
  unsupported_type: "That link isn't a web page or text we can read.",
  no_text: 'That page has no readable problem text.',
  too_large: 'That page is too large to read.',
  too_many_redirects: 'That link redirects too many times.',
  timeout: 'That page took too long to respond.',
  network: "We couldn't connect to that page.",
};

const URL_BLOCKED = {
  scheme: 'Use a full link that starts with http:// or https://.',
  credentials: "Links with a username or password in them aren't allowed.",
  port: "Links on unusual ports aren't allowed. Use the page's normal address.",
  private: "That link points to a private or local address, which we can't open.",
};

const FILE_TYPES = {
  pdf: 'Choose a PDF file.',
  image: 'Use a PNG, JPEG or WebP screenshot.',
};

export const stuckMessages = {
  FILE_TOO_LARGE: { default: () => 'That file is over 5 MB. Try a smaller PDF or a cropped screenshot.' },
  FILE_TYPE_UNSUPPORTED: {
    default: ({ inputType }) => FILE_TYPES[inputType] ?? 'Upload a PDF, PNG, JPEG, WebP or plain text file.',
  },
  URL_NOT_ALLOWED: {
    default: ({ reason }) =>
      `${URL_BLOCKED[reason] ?? "We can't open that link."} The Codeforces problem page always works.`,
  },
  URL_FETCH_FAILED: {
    default: ({ reason }) =>
      `${URL_REASONS[reason] ?? "We couldn't open that link."} Paste the statement as text instead.`,
  },
  INPUT_UNREADABLE: {
    default: ({ inputType }) =>
      inputType === 'pdf'
        ? 'That PDF has no selectable text (it may be a scan). Paste the statement as text, or upload a screenshot.'
        : "We couldn't read a problem from that file. Paste the statement as text instead.",
  },
  PROBLEM_TEXT_TOO_SHORT: {
    default: ({ minLength = 40, length }) =>
      `Paste at least ${minLength} characters of the problem statement so we can match it` +
      (Number.isFinite(length) ? ` (you have ${length}).` : '.'),
  },
  STUCK_QUERY_NOT_FOUND: { default: () => "We couldn't find that stuck request. It may have been deleted." },
};
