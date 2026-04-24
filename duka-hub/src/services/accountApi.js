import { authenticatedApiRequest, getCurrentUserSync } from './authApi';
import { setCurrentUserSync } from './localAuth';

const USERS_KEY = 'users';

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const readJson = (key, fallback) => {
  try {
    return safeJsonParse(window.localStorage.getItem(String(key || '')), fallback);
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    window.localStorage.setItem(String(key || ''), JSON.stringify(value));
  } catch {}
};

const normalizeText = (value) => String(value || '').trim();

const notify = () => {
  try {
    window.dispatchEvent(new CustomEvent('dataUpdated'));
  } catch {}
};

const buildLocalCurrentUser = (payload, existingUser = null) => {
  const currentUser = existingUser || getCurrentUserSync() || {};
  const source = payload && typeof payload === 'object' ? payload : {};
  return {
    ...currentUser,
    fullName: normalizeText(source.fullName || currentUser.fullName || currentUser.name),
    name: normalizeText(source.fullName || currentUser.name || currentUser.fullName),
    email: normalizeText(source.email || currentUser.email),
    phone: normalizeText(source.phone || currentUser.phone),
    profilePhoto: normalizeText(source.profilePhoto || currentUser.profilePhoto)
  };
};

const syncUsersCache = (nextUser) => {
  const currentUser = getCurrentUserSync() || {};
  const targetId = normalizeText(currentUser?.userId || currentUser?.id);
  const list = readJson(USERS_KEY, []);
  if (!Array.isArray(list) || !targetId) return;
  const nextList = list.map((entry) => {
    const entryId = normalizeText(entry?.userId || entry?.id);
    if (entryId !== targetId) return entry;
    return {
      ...entry,
      fullName: normalizeText(nextUser.fullName || entry?.fullName),
      name: normalizeText(nextUser.name || entry?.name),
      email: normalizeText(nextUser.email || entry?.email),
      phone: normalizeText(nextUser.phone || entry?.phone),
      profilePhoto: normalizeText(nextUser.profilePhoto || entry?.profilePhoto)
    };
  });
  writeJson(USERS_KEY, nextList);
};

const syncCurrentUser = (payload, existingUser = null) => {
  const nextUser = buildLocalCurrentUser(payload, existingUser);
  setCurrentUserSync(nextUser);
  syncUsersCache(nextUser);
  notify();
  return nextUser;
};

const shouldUseLocalFallback = (error) => {
  return Boolean(error?.isNetworkError || error?.isBackendDisabled);
};

export const accountApi = {
  async updateCurrentUser(payload) {
    const currentUser = getCurrentUserSync() || {};
    const body = {
      fullName: normalizeText(payload?.fullName) || undefined,
      email: normalizeText(payload?.email) || undefined,
      phone: normalizeText(payload?.phone) || undefined,
      profilePhoto: normalizeText(payload?.profilePhoto) || undefined
    };

    if (!normalizeText(currentUser?.userId || currentUser?.id)) {
      return syncCurrentUser(body, currentUser);
    }

    let user = body;
    try {
      const data = await authenticatedApiRequest('/users/me', {
        method: 'PATCH',
        body
      });
      user = data?.user && typeof data.user === 'object' ? data.user : body;
    } catch (error) {
      if (!shouldUseLocalFallback(error)) {
        throw error;
      }
    }
    return syncCurrentUser(
      {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto || body.profilePhoto
      },
      currentUser
    );
  }
};
