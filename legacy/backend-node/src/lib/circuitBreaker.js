/**
 * In-memory circuit breaker: `trip(key)` opens the circuit for `openMs`; `isOpen(key)` is true
 * until then. Used to skip a model that just timed out or answered 503 (one per process).
 */
export const createCircuitBreaker = ({ openMs, now = Date.now }) => {
  const openUntil = new Map();

  const trip = (key) => {
    openUntil.set(key, now() + openMs);
  };

  const isOpen = (key) => {
    const until = openUntil.get(key);
    if (until === undefined) return false;
    if (now() < until) return true;
    openUntil.delete(key);
    return false;
  };

  return { trip, isOpen };
};
