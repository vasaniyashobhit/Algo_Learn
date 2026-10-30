import { useCallback } from 'react';
import { toast } from 'sonner';
import { getUserMessage, isUnexpectedError } from '../errors/getUserMessage.js';

/**
 * showRollback(title, error, context): an error toast after an optimistic change was undone.
 * The title says what was undone ("Couldn't remove 474/D"), the description says why.
 */
export const useRollbackToast = () =>
  useCallback((title, error, context) => {
    const reason = getUserMessage(error, context);
    const reference = isUnexpectedError(error) && error?.requestId ? ` Reference: ${error.requestId}` : '';
    return toast.error(title, { description: `${reason}${reference}` });
  }, []);
