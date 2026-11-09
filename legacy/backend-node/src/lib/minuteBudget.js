/**
 * In-memory sliding-window budget: at most `limitFor(key)` takes per `windowMs` per key.
 * `tryTake(key)` returns false (and records nothing) once the window is full.
 */
export const createMinuteBudget = ({ limitFor, windowMs = 60_000, now = Date.now }) => {
  const calls = new Map();

  const recent = (key, at) => (calls.get(key) ?? []).filter((time) => at - time < windowMs);

  const tryTake = (key) => {
    const at = now();
    const kept = recent(key, at);
    if (kept.length >= limitFor(key)) {
      calls.set(key, kept);
      return false;
    }
    calls.set(key, [...kept, at]);
    return true;
  };

  const remaining = (key) => Math.max(0, limitFor(key) - recent(key, now()).length);

  return { tryTake, remaining };
};
