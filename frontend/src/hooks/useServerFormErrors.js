import { useCallback, useState } from 'react';
import { codes } from '../errors/codes.js';
import { toFieldErrors } from '../errors/fieldErrors.js';
import { getUserMessage } from '../errors/getUserMessage.js';

// Server codes that belong to one field rather than the whole form.
const FIELD_CODES = { [codes.AUTH_EMAIL_TAKEN]: 'email' };

/**
 * Maps a failed submit onto the form: VALIDATION_FAILED details and field codes become inline
 * errors via setError; anything else becomes one form-level message.
 */
export const useServerFormErrors = ({ setError, fields, context }) => {
  const [formError, setFormError] = useState(null);

  const handleServerError = useCallback(
    (error) => {
      const fieldErrors = toFieldErrors(error, fields);
      const fieldNames = Object.keys(fieldErrors);
      if (fieldNames.length > 0) {
        fieldNames.forEach((name) => setError(name, { type: 'server', message: fieldErrors[name] }));
        setFormError(null);
        return;
      }
      const field = FIELD_CODES[error?.code];
      if (field && fields.includes(field)) {
        setError(field, { type: 'server', message: getUserMessage(error, context) }, { shouldFocus: true });
        setFormError(null);
        return;
      }
      setFormError({ message: getUserMessage(error, context), requestId: error?.requestId ?? null, error });
    },
    [setError, fields, context],
  );

  const clearFormError = useCallback(() => setFormError(null), []);
  return { formError, handleServerError, clearFormError };
};
