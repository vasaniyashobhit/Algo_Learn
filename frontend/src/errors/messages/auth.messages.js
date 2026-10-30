// Each entry: { default: (params) => string, contexts?: { [context]: (params) => string } }.
export const authMessages = {
  AUTH_REQUIRED: { default: () => 'Please log in to continue.' },
  AUTH_INVALID_TOKEN: { default: () => 'Your session is no longer valid. Please log in again.' },
  AUTH_TOKEN_EXPIRED: { default: () => 'Your session expired. Please log in again.' },
  AUTH_INVALID_CREDENTIALS: {
    default: () => "That email and password don't match. Check both and try again.",
  },
  AUTH_EMAIL_TAKEN: {
    default: () => 'An account with this email already exists.',
    contexts: {
      signup: () => 'An account with this email already exists. Log in instead, or use another email.',
    },
  },
  FORBIDDEN: { default: () => "You don't have access to this." },
};
