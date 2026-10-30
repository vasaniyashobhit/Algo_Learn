import { isUnexpectedError } from '../../errors/getUserMessage.js';
import { Notice } from '../ui/Notice.jsx';

/** The form-level error above the submit button; shows a reference only for unexpected errors. */
export const FormAlert = ({ formError }) => {
  if (!formError) return null;
  const showReference = formError.requestId && isUnexpectedError(formError.error);
  return (
    <Notice tone="error" className="mb-4">
      <p>{formError.message}</p>
      {showReference && <p className="mt-1 text-step--1 text-ink-soft">Reference: {formError.requestId}</p>}
    </Notice>
  );
};
