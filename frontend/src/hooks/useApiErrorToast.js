import { useCallback } from 'react';
import { toast } from 'sonner';
import { getUserMessage, isUnexpectedError } from '../errors/getUserMessage.js';

/**
 * Returns showError(error, context, params): a toast with the user-specific message, plus the
 * request id as a reference when the error was unexpected.
 */
export const useApiErrorToast = () =>
  useCallback((error, context, params) => {
    const message = getUserMessage(error, context, params);
    const description = isUnexpectedError(error) && error?.requestId ? `Reference: ${error.requestId}` : undefined;
    return toast.error(message, { description });
  }, []);
