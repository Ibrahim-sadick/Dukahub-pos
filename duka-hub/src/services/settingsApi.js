import { authenticatedApiRequest, getCurrentUserSync } from './authApi';
import { readRuntimeCache, writeRuntimeCache } from './runtimeCache';

const normalizeText = (value) => String(value || '').trim();

const getStorageKey = () => {
  const currentUser = getCurrentUserSync() || {};
  const businessId = normalizeText(currentUser?.businessId || currentUser?.id);
  return `systemPreferences:${businessId || 'default'}`;
};

// eslint-disable-next-line no-unused-vars
const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

// eslint-disable-next-line no-unused-vars
const writeCachedSettings = (settings) => {
  writeRuntimeCache(getStorageKey(), settings && typeof settings === 'object' ? settings : {});
};

const readCachedSettings = (fallback = {}) => {
  return readRuntimeCache(getStorageKey(), fallback);
};

const notify = () => {
  try {
    window.dispatchEvent(new CustomEvent('systemPreferencesUpdated'));
  } catch {}
};

export const settingsApi = {
  async get(fallback = {}) {
    try {
      const data = await authenticatedApiRequest('/settings');
      const settings = data?.settings && typeof data.settings === 'object' ? data.settings : fallback;
      writeCachedSettings(settings);
      return settings;
    } catch {
      return readCachedSettings(fallback);
    }
  },

  async update(settings) {
    const nextSettings = settings && typeof settings === 'object' ? settings : {};
    const data = await authenticatedApiRequest('/settings', {
      method: 'PATCH',
      body: nextSettings
    });
    const saved = data?.settings && typeof data.settings === 'object' ? data.settings : nextSettings;
    writeCachedSettings(saved);
    notify();
    return saved;
  }
};
