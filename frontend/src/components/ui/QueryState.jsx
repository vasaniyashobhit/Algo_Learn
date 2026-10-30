import { getUserMessage, isUnexpectedError } from '../../errors/getUserMessage.js';
import { ErrorState } from './ErrorState.jsx';

/**
 * One place for the four states of a query-backed block: skeleton while loading, an error
 * panel with retry (only when there is nothing cached to show), the empty state, or the data.
 * `children` is a function of the query data.
 */
export const QueryState = ({ query, skeleton, errorTitle, errorContext, isEmpty, empty, children }) => {
  if (query.isPending) return skeleton;
  if (query.isError && query.data === undefined) {
    const { error } = query;
    return (
      <ErrorState
        compact
        title={errorTitle}
        message={getUserMessage(error, errorContext)}
        requestId={isUnexpectedError(error) ? error?.requestId : undefined}
        onRetry={() => query.refetch()}
      />
    );
  }
  if (isEmpty?.(query.data)) return empty;
  return children(query.data);
};
