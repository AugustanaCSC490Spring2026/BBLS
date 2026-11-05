export const TIMED_OUT = Symbol("timed out");

/**
 * Resolves with the promise's value, or with TIMED_OUT if it has not settled in time.
 * The underlying work is not cancelled.
 */
export function withTimeout(promise, ms) {
  let timer;
  const timedOut = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  return Promise.race([promise, timedOut]).finally(() => clearTimeout(timer));
}
