const readJson = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const getCurrentUser = () => {
  try {
    const local = readJson(localStorage.getItem('currentUser') || 'null', null);
    if (local) return local;
  } catch {}
  try {
    const session = readJson(sessionStorage.getItem('currentUser') || 'null', null);
    if (session) return session;
  } catch {}
  return null;
};

export const getBusinessIdForUser = (user) => {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'staff') return String(user?.businessId || '');
  return String(user?.id || '');
};

export const getSystemPreferences = (businessId) => {
  const key = `systemPreferences:${businessId || 'default'}`;
  return readJson(localStorage.getItem(key) || 'null', null);
};

export const isAdminUser = (user) => String(user?.role || '').toLowerCase() === 'admin';

export const canDeleteRecords = () => isAdminUser(getCurrentUser());

export const shouldRequirePasswordForDelete = () => {
  return false;
};

export const confirmDeletePassword = (actionLabel) => {
  void actionLabel;
  return true;
};
