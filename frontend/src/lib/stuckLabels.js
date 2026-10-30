// Words for the stuck result and history. Keys follow docs/API.md (Stuck helper).
export const INPUT_LABELS = { text: 'Text', url: 'Link', pdf: 'PDF', image: 'Screenshot' };
export const INPUT_FROM = { text: 'from your text', url: 'from your link', pdf: 'from your PDF', image: 'from your screenshot' };

export const TAG_SOURCE = {
  db: { label: 'From our database', hint: 'The Codeforces tags stored for this problem.' },
  ai: { label: 'From AI', hint: 'Topics the AI picked from the statement. They can be wrong.' },
  neighbors: { label: 'Estimated', hint: 'The most common topics of the closest problems we have.' },
};

export const ANSWER_LABELS = { ai: 'AI hints', cache: 'AI hints (saved)', fallback: 'Without AI' };

export const FALLBACK_COPY = {
  AI_BUSY: 'AI hints are busy. Try again in a minute.',
  AI_TIMEOUT: 'The AI ran out of time on this one.',
  AI_UNAVAILABLE: 'AI hints are unavailable right now.',
  NO_INPUT: 'We had no statement text to give the AI, so there are no AI hints.',
};

export const GAP_STATUS_LABELS = { weak: 'Weak', unseen: 'Not practised yet', developing: 'Developing', strong: 'Strong' };

export const STRATEGY_LABELS = {
  primary: 'same topics, close rating',
  widened_window: 'same topics, wider rating range',
  no_rating_filter: 'same topics, any rating',
  rating_band: 'close rating (this problem has no topics)',
  near_user_rating: 'near your rating (few topic matches)',
};

export const isBroader = (strategies = []) => strategies.some((strategy) => strategy !== 'primary');

/** The id shown for a stuck query: our match, else the id parsed from a link, else null. */
export const stuckProblemId = (problem) => problem?.matchedProblemId ?? problem?.requestedProblemId ?? null;

export const stuckTitle = (problem) => problem?.title || 'Untitled problem';

/** Under the hints: who wrote them and how far to trust them. */
export const hintsCaption = ({ source, model }) =>
  source === 'fallback'
    ? 'Built from the topics, your stats and the editorial. No AI involved.'
    : `AI hints${model ? ` (${model})` : ''}. They can be wrong: check each step.`;

/** The label of the button that opens GET /stuck/:id/solution. */
export const solutionButtonLabel = ({ hasSolution, editorialAvailable }) =>
  !hasSolution && editorialAvailable ? 'Show editorial' : 'Show full solution';
