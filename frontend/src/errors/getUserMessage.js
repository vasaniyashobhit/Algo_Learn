import { genericMessage, networkMessage, statusMessages, timeoutMessage } from './messages/fallback.messages.js';
import { messages } from './messages/index.js';

const asParams = (details) => (details && typeof details === 'object' && !Array.isArray(details) ? details : {});

/**
 * Friendly text for any error. `context` picks a per-screen override (e.g. "login");
 * `params` fill placeholders and win over the server's details. Never returns raw server text.
 */
export const getUserMessage = (error, context, params = {}) => {
  if (error?.isTimeout) return timeoutMessage();
  if (error?.isNetwork) return networkMessage();
  const entry = messages[error?.code];
  if (entry) {
    const format = entry.contexts?.[context] ?? entry.default;
    return format({ ...asParams(error.details), ...params });
  }
  return (statusMessages[error?.status] ?? genericMessage)();
};

/** Unexpected errors show their request id so users can report them. */
export const isUnexpectedError = (error) => {
  if (error?.isNetwork || error?.isTimeout) return false;
  if (!messages[error?.code]) return true;
  return error.code === 'INTERNAL_ERROR' || (error.status ?? 0) >= 500;
};
