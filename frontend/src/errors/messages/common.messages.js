import { formatWait } from '../../lib/formatters.js';

const waitText = ({ retryAfterSeconds }) =>
  retryAfterSeconds ? `Try again in ${formatWait(retryAfterSeconds)}.` : 'Try again in a little while.';

export const commonMessages = {
  VALIDATION_FAILED: {
    default: () => 'Some fields need fixing. Check the highlighted fields and try again.',
  },
  ROUTE_NOT_FOUND: { default: () => "That page or action doesn't exist. Try reloading AlgoLearn." },
  NOT_FOUND: {
    default: () => "We couldn't find that. It may have been removed.",
    contexts: { practice: () => "That problem isn't in your practice list any more." },
  },
  RATE_LIMITED: {
    default: (params) => `Too many requests. ${waitText(params)}`,
    contexts: {
      login: (params) => `Too many login attempts from this network. ${waitText(params)}`,
      signup: (params) => `Too many sign-up attempts from this network. ${waitText(params)}`,
      sync: (params) => `You synced moments ago. ${waitText(params)}`,
      stuck: (params) => `You've used your 10 stuck requests for this hour. ${waitText(params)}`,
    },
  },
  DUPLICATE_RESOURCE: { default: () => 'That already exists, so nothing was changed.' },
  DB_UNAVAILABLE: {
    default: () => "AlgoLearn can't reach its database right now. Try again in a minute.",
  },
  INTERNAL_ERROR: {
    default: () =>
      'Something went wrong on our side. Try again, and if it keeps happening, report the reference below.',
  },
};
