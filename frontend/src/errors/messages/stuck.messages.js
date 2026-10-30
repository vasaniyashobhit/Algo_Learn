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

export const stuckMessages = {
  FILE_TOO_LARGE: { default: () => 'That file is over 5 MB. Try a smaller PDF or a cropped screenshot.' },
  FILE_TYPE_UNSUPPORTED: { default: () => 'Upload a PDF, PNG, JPEG, WebP or plain text file.' },
  URL_NOT_ALLOWED: {
    default: () => "We can't open that link. Use a public http(s) link, such as the Codeforces problem page.",
  },
  URL_FETCH_FAILED: {
    default: ({ reason }) =>
      `${URL_REASONS[reason] ?? "We couldn't open that link."} Paste the statement as text instead.`,
  },
  INPUT_UNREADABLE: {
    default: ({ inputType }) =>
      inputType === 'pdf'
        ? 'That PDF has no selectable text. Paste the statement or upload a screenshot instead.'
        : "We couldn't read that file. Paste the statement as text instead.",
  },
  PROBLEM_TEXT_TOO_SHORT: {
    default: ({ minLength = 40 }) =>
      `Paste at least ${minLength} characters of the problem statement so we can match it.`,
  },
  STUCK_QUERY_NOT_FOUND: { default: () => "We couldn't find that stuck request. It may have been deleted." },
};
