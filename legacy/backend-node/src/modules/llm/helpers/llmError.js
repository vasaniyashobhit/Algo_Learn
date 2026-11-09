/**
 * A failed provider call. Never leaves the LLM module: the coach chain catches it and tries the
 * next provider. `status` is the HTTP status (if any); `reason` is e.g. `invalid_json`.
 */
export class LlmError extends Error {
  constructor(message, { status, reason, cause } = {}) {
    super(message, { cause });
    this.name = 'LlmError';
    this.status = status;
    this.reason = reason;
  }
}

/** Short, secret-free description of a provider error for warn logs. */
export const describeLlmError = (err) => ({
  name: err?.name,
  status: err?.status,
  reason: err?.reason,
  message: String(err?.message ?? err).slice(0, 200),
});
