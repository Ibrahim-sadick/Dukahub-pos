const STORAGE_KEY = 'systemActivity';
const MAX_ITEMS = 500;

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const readActivities = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = safeJsonParse(raw, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const writeActivities = (items) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  } catch {}
};

const postActivity = async (payload) => {
  try {
    const next = payload && typeof payload === 'object' ? payload : null;
    if (!next) return;
    const current = readActivities();
    const merged = [next, ...current].slice(0, MAX_ITEMS);
    writeActivities(merged);
    try {
      window.dispatchEvent(new CustomEvent('systemActivityUpdated'));
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('dataUpdated'));
    } catch {}
  } catch {}
};

export const getCurrentUserForActivity = () => {
  try {
    return JSON.parse(String(window.localStorage.getItem('currentUser') || 'null'));
  } catch {
    return null;
  }
};

export const appendSystemActivity = (type, title, details, module, level = 'success', meta = null) => {
  try {
    const user = getCurrentUserForActivity();
    const entityId =
      meta && typeof meta === 'object'
        ? meta.entityId ?? meta.saleId ?? meta.purchaseId ?? meta.expenseId ?? meta.userId ?? meta.staffId ?? null
        : null;
    void postActivity({
      id: `act_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      action: String(type || '').trim(),
      title: String(title || '').trim(),
      details: String(details || '').trim(),
      entityType: String(module || '').trim(),
      module: String(module || '').trim(),
      entityId,
      level: String(level || 'success').trim(),
      meta: meta && typeof meta === 'object' ? meta : null,
      actor: user
        ? {
            fullName: String(user?.fullName || user?.name || '').trim(),
            employeeId: String(user?.employeeId || user?.staffEmployeeId || '').trim(),
            phone: String(user?.phone || '').trim(),
            role: String(user?.role || '').trim()
          }
        : null,
      actorHint: user
        ? {
            fullName: String(user?.fullName || user?.name || '').trim(),
            employeeId: String(user?.employeeId || user?.staffEmployeeId || '').trim(),
            phone: String(user?.phone || '').trim(),
            role: String(user?.role || '').trim()
          }
        : null
      ,
      ts: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
  } catch {}
};

export const listSystemActivities = ({ take = 200 } = {}) => {
  const limit = Math.max(0, Number(take || 0)) || 200;
  const rows = readActivities()
    .filter((item) => item && typeof item === 'object')
    .sort((a, b) => {
      const at = Date.parse(String(a?.createdAt || a?.ts || 0)) || 0;
      const bt = Date.parse(String(b?.createdAt || b?.ts || 0)) || 0;
      return bt - at;
    });
  return rows.slice(0, limit);
};

export const clearSystemActivities = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem('systemLogsCutoff');
    window.localStorage.removeItem('systemLogsReadAt');
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('systemActivityUpdated'));
    window.dispatchEvent(new CustomEvent('dataUpdated'));
  } catch {}
};
