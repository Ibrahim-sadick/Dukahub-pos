const getApiBaseUrl = () => {
  const raw = String(process.env.REACT_APP_API_BASE_URL || '').trim();
  if (raw) return raw.replace(/\/+$/, '');
  return 'http://localhost:4000';
};

const STORAGE_KEY = 'authTokens';

export const authStorage = {
  getTokens() {
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (local?.accessToken && local?.refreshToken) return { ...local, storage: 'local' };
    } catch {}
    try {
      const session = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (session?.accessToken && session?.refreshToken) return { ...session, storage: 'session' };
    } catch {}
    return null;
  },
  setTokens(tokens, rememberMe) {
    const payload = {
      accessToken: String(tokens?.accessToken || ''),
      refreshToken: String(tokens?.refreshToken || ''),
      expiresAt: tokens?.expiresAt || null
    };
    if (!payload.accessToken || !payload.refreshToken) return;
    try {
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
};

const apiRequest = async (path, { method = 'GET', body, auth = false } = {}) => {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const tokens = authStorage.getTokens();
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok || !data || data.success !== true) {
    const code = data?.error?.code || `HTTP_${res.status}`;
    const message = data?.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.code = code;
    err.status = res.status;
    err.details = data?.error?.details;
    if (String(code) === 'SUBSCRIPTION_EXPIRED') {
      try {
        const existing = JSON.parse(localStorage.getItem('companyInfo') || '{}') || {};
        const next = { ...existing, subscriptionLocked: true, subscriptionLockReason: 'expired' };
        localStorage.setItem('companyInfo', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('companyInfoUpdated'));
      } catch {}
    }
    throw err;
  }
  return data.data;
};

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const authApi = {
  async signup(payload, rememberMe) {
    const data = await apiRequest('/api/auth/signup', { method: 'POST', body: payload });
    authStorage.setTokens(data.tokens, rememberMe);
    syncLocalAuthStateFromBackendMe(data, rememberMe);
    return data;
  },
  async loginAdmin({ phone, password, rememberMe }) {
    const data = await apiRequest('/api/auth/login/admin', { method: 'POST', body: { phone, password, rememberMe: Boolean(rememberMe) } });
    authStorage.setTokens(data.tokens, Boolean(rememberMe));
    syncLocalAuthStateFromBackendMe({ user: data.user }, Boolean(rememberMe));
    return data;
  },
  async loginStaff({ employeeId, password, businessId, rememberMe }) {
    const data = await apiRequest('/api/auth/login/staff', {
      method: 'POST',
      body: {
        employeeId,
        password,
        businessId: businessId ? Number(businessId) : undefined,
        rememberMe: Boolean(rememberMe)
      }
    });
    if (data.selectionRequired) return data;
    authStorage.setTokens(data.tokens, Boolean(rememberMe));
    syncLocalAuthStateFromBackendMe({ user: data.user }, Boolean(rememberMe));
    return data;
  },
  async me() {
    return apiRequest('/api/auth/me', { auth: true });
  },
  async logout() {
    const tokens = authStorage.getTokens();
    const refreshToken = String(tokens?.refreshToken || '').trim();
    if (refreshToken) {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST', body: { refreshToken } });
      } catch {}
    }
    authStorage.clear();
    try {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUser');
    } catch {}
  },
  async passwordResetRequest({ phone, otp }) {
    return apiRequest('/api/auth/password-reset/request', { method: 'POST', body: { phone, otp } });
  },
  async passwordResetConfirm({ phone, otp, newPassword }) {
    return apiRequest('/api/auth/password-reset/confirm', { method: 'POST', body: { phone, otp, newPassword } });
  }
};

export const subscriptionsApi = {
  async current() {
    return apiRequest('/api/subscriptions/current', { auth: true });
  },
  async selectPlan(payload) {
    return apiRequest('/api/subscriptions/select-plan', { method: 'POST', body: payload, auth: true });
  },
  async confirmPayment(payload) {
    return apiRequest('/api/subscriptions/confirm-payment', { method: 'POST', body: payload, auth: true });
  }
};

export const usersApi = {
  async list() {
    return apiRequest('/api/users', { auth: true });
  },
  async create(payload) {
    return apiRequest('/api/users', { method: 'POST', body: payload, auth: true });
  },
  async patch(id, payload) {
    return apiRequest(`/api/users/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: payload, auth: true });
  }
};

export const staffRecordsApi = {
  async list() {
    return apiRequest('/api/staff-records', { auth: true });
  },
  async create(payload) {
    return apiRequest('/api/staff-records', { method: 'POST', body: payload, auth: true });
  },
  async patch(id, payload) {
    return apiRequest(`/api/staff-records/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: payload, auth: true });
  }
};

export const workspacesApi = {
  async list() {
    return apiRequest('/api/workspaces', { auth: true });
  }
};

export const activityApi = {
  async list({ take = 200 } = {}) {
    const q = new URLSearchParams();
    if (take != null) q.set('take', String(take));
    return apiRequest(`/api/activity?${q.toString()}`, { auth: true });
  },
  async create(payload) {
    return apiRequest('/api/activity', { method: 'POST', body: payload, auth: true });
  }
};

export function syncLocalAuthStateFromBackendMe(meData, rememberMe) {
  const write = (key, value) => {
    try {
      if (rememberMe) {
        localStorage.setItem(key, JSON.stringify(value));
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, JSON.stringify(value));
        localStorage.removeItem(key);
      }
    } catch {}
  };

  const user = meData?.user || null;
  const business = meData?.business || null;
  const subscription = meData?.subscription || null;
  const modules = Array.isArray(meData?.modules) ? meData.modules : [];
  const access = meData?.access || null;
  const role = normalizeRole(user?.role);
  const isAdmin = role === 'admin';

  const currentUser = (() => {
    if (!user) return null;
    if (isAdmin && business?.id) {
      return {
        id: String(business.id),
        userId: String(user.id),
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: 'admin',
        businessId: String(business.id),
        workspaceId: user.workspaceId ?? null,
        subscriptionPlan: String(subscription?.plan?.name || ''),
        subscriptionPaymentStatus: String(subscription?.status || ''),
        subscriptionEndsAt: String(subscription?.endsAt || ''),
        subscriptionTrialEndsAt: String(subscription?.trialEndsAt || ''),
        subscriptionLocked: Boolean(subscription?.locked ?? access?.locked),
        subscriptionLockReason: String(subscription?.lockReason || access?.reason || ''),
        paymentProvider: String(subscription?.paymentProvider || ''),
        paymentPhone: String(subscription?.paymentPhone || '')
      };
    }
    return {
      id: String(user.id),
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: role || 'staff',
      businessId: String(user.businessId || ''),
      workspaceId: user.workspaceId ?? null,
      staffEmployeeId: user.employeeId || '',
      subscriptionLocked: Boolean(subscription?.locked ?? access?.locked),
      subscriptionLockReason: String(subscription?.lockReason || access?.reason || ''),
      accessEnabled: user.isActive !== false,
      forcePasswordChange: false
    };
  })();

  if (currentUser) write('currentUser', currentUser);

  const companyInfo = (() => {
    let existing = {};
    try {
      existing = JSON.parse(localStorage.getItem('companyInfo') || '{}') || {};
    } catch {}
    return {
      ...existing,
      companyName: String(business?.businessName || existing.companyName || ''),
      location: String(business?.address || existing.location || ''),
      phone: String(business?.phone || existing.phone || ''),
      email: String(business?.email || existing.email || ''),
      currency: String(business?.currency || existing.currency || 'TZS'),
      timezone: String(business?.timezone || existing.timezone || 'Africa/Dar_es_Salaam'),
      businessModule: String(modules?.[0]?.key || existing.businessModule || ''),
      subscriptionPlan: String(subscription?.plan?.name || existing.subscriptionPlan || ''),
      subscriptionPaymentStatus: String(subscription?.status || existing.subscriptionPaymentStatus || ''),
      subscriptionEndsAt: String(subscription?.endsAt || existing.subscriptionEndsAt || ''),
      subscriptionTrialEndsAt: String(subscription?.trialEndsAt || existing.subscriptionTrialEndsAt || ''),
      subscriptionLocked: Boolean(subscription?.locked ?? access?.locked),
      subscriptionLockReason: String(subscription?.lockReason || access?.reason || ''),
      subscriptionUserLimit: Number(subscription?.userLimit ?? existing.subscriptionUserLimit ?? 0),
      paymentProvider: String(subscription?.paymentProvider || existing.paymentProvider || ''),
      paymentPhone: String(subscription?.paymentPhone || existing.paymentPhone || '')
    };
  })();

  try {
    localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
    window.dispatchEvent(new CustomEvent('companyInfoUpdated'));
    window.dispatchEvent(new CustomEvent('dataUpdated'));
  } catch {}
}
