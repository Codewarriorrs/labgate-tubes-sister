// Client-side Memory Cache with TTL for fast, instantaneous tab transitions
const cacheStore = new Map<string, { data: any; expiry: number }>();

export function getCachedData<T>(key: string): T | null {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cacheStore.delete(key);
    return null;
  }
  return item.data as T;
}

export function setCachedData<T>(key: string, data: T, ttlSeconds: number = 60): void {
  cacheStore.set(key, {
    data,
    expiry: Date.now() + ttlSeconds * 1000,
  });
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cacheStore.clear();
    return;
  }
  for (const key of Array.from(cacheStore.keys())) {
    if (key.startsWith(keyPrefix)) {
      cacheStore.delete(key);
    }
  }
}
