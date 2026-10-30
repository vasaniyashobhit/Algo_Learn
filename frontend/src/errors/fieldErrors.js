/**
 * VALIDATION_FAILED details → { email: 'Invalid email address', ... } for the given fields.
 * Field names lose their "body." prefix; only the first message per field is kept.
 */
export const toFieldErrors = (error, allowedFields) => {
  if (error?.code !== 'VALIDATION_FAILED' || !Array.isArray(error.details)) return {};
  const result = {};
  for (const { field, message } of error.details) {
    const name = String(field ?? '').replace(/^(body|query|params)\./, '');
    if (allowedFields.includes(name) && message && !result[name]) result[name] = message;
  }
  return result;
};
