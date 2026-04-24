const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const normalizeTzPhone255 = (raw) => {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  const local = (() => {
    if (digits.startsWith('255')) return digits.slice(3);
    if (digits.startsWith('0')) return digits.slice(1);
    return digits;
  })().replace(/^0+/, '');
  if (local.length !== 9) return '';
  if (!(local.startsWith('6') || local.startsWith('7'))) return '';
  return `255${local}`;
};

const KEYS = {
  currentUser: 'currentUser',
  users: 'users',
  legacyCreds: 'localCredentials',
  legacyAdminAccounts: 'dh_admin_accounts_v1',
  legacyTokens: 'dh_tokens'
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

const removeKeyEverywhere = (key) => {
  try {
    window.localStorage.removeItem(String(key || ''));
  } catch {}
  try {
    window.sessionStorage.removeItem(String(key || ''));
  } catch {}
};

const hasStoredTokens = () => {
  const tokens = readJson(KEYS.legacyTokens, null);
  return Boolean(tokens && typeof tokens === 'object' && String(tokens.accessToken || '').trim());
};

const clearSession = () => {
  removeKeyEverywhere(KEYS.currentUser);
  removeKeyEverywhere(KEYS.legacyTokens);
  removeKeyEverywhere('dh_session_expired_message');
};

const validateSession = () => {
  const u = readJson(KEYS.currentUser, null);
  if (!u || typeof u !== 'object') return;
  const role = String(u.role || '').toLowerCase();
  if (role !== 'admin') return clearSession();
  if (hasStoredTokens()) return;
};

const init = () => {
  try {
    window.localStorage.removeItem(KEYS.legacyCreds);
  } catch {}
  try {
    window.localStorage.removeItem(KEYS.legacyAdminAccounts);
    window.localStorage.removeItem(KEYS.legacyTokens);
  } catch {}
  try {
    const rawUsers = readJson(KEYS.users, []);
    const list = Array.isArray(rawUsers) ? rawUsers : [];
    const deduped = [];
    const seen = new Set();
    list.forEach((u) => {
      const employeeId = String(u?.staffEmployeeId || u?.employeeId || '').trim();
      const role = String(u?.role || '').toLowerCase();
      const businessId = String(u?.businessId || '').trim();
      const key = role === 'staff' && employeeId ? `${businessId}:${employeeId}` : '';
      if (key && seen.has(key)) return;
      if (key) seen.add(key);
      deduped.push(u);
    });
    if (deduped.length !== list.length) writeJson(KEYS.users, deduped);
  } catch {}
  validateSession();
};

const getCurrentUserSync = () => {
  init();
  const u = readJson(KEYS.currentUser, null);
  return u && typeof u === 'object' ? u : null;
};

const setCurrentUserSync = (user) => {
  const u = user && typeof user === 'object' ? user : null;
  writeJson(KEYS.currentUser, u);
};

export { normalizeTzPhone255, init, getCurrentUserSync, setCurrentUserSync, clearSession };
