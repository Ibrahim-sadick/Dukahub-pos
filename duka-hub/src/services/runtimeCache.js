const cache = new Map();

const cloneValue = (value, fallback) => {
  if (value === undefined) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

export const readRuntimeCache = (key, fallback) => {
  const cacheKey = String(key || '');
  if (!cacheKey || !cache.has(cacheKey)) return fallback;
  return cloneValue(cache.get(cacheKey), fallback);
};

export const writeRuntimeCache = (key, value) => {
  const cacheKey = String(key || '');
  if (!cacheKey) return value;
  cache.set(cacheKey, cloneValue(value, value));
  return value;
};

export const removeRuntimeCache = (key) => {
  const cacheKey = String(key || '');
  if (!cacheKey) return;
  cache.delete(cacheKey);
};

export const listRuntimeCacheKeys = () => Array.from(cache.keys());
