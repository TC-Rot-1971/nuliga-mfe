export function memoize<T>(ttlMs: number, load: () => Promise<T>): () => Promise<T> {
  let cached: { value: T; expiresAt: number } | null = null;
  let pending: Promise<T> | null = null;

  return async () => {
    if (cached && Date.now() < cached.expiresAt) return cached.value;
    if (pending) return pending;

    pending = load()
      .then((value) => {
        cached = { value, expiresAt: Date.now() + ttlMs };
        return value;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
}
