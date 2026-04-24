import {
  clearSession as clearLocalSession,
  getCurrentUserSync as getLocalCurrentUserSync,
  setCurrentUserSync
} from './localAuth';

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const normalizeApiBaseUrl = (value) => {
  const resolved = String(value || '').trim().replace(/\/+$/, '');
  if (!resolved) return '';
  return /\/api$/i.test(resolved) ? resolved : `${resolved}/api`;
};

const getApiBaseUrl = () => {
  const fromEnv = String(process.env.REACT_APP_API_BASE_URL || '').trim();
  return normalizeApiBaseUrl(fromEnv);
};

const isBackendConfigured = () => Boolean(getApiBaseUrl());

const createApiError = (message, extras = {}) => {
  const error = new Error(String(message || 'Request failed'));
  Object.assign(error, extras);
  return error;
};

const requireBackendConfigured = () => {
  if (isBackendConfigured()) return;
  throw createApiError('Backend API is not configured for authentication.', {
    code: 'BACKEND_DISABLED',
    isBackendDisabled: true
  });
};

const parseResponse = async (response) => {
  const text = await response.text();
  const payload = text ? safeJsonParse(text, null) : null;

  if (!response.ok) {
    const apiErrorObj = payload?.error && typeof payload.error === 'object' ? payload.error : null;
    const apiErrorMessage =
      (payload?.message && String(payload.message)) ||
      (typeof payload?.error === 'string' ? payload.error : '') ||
      (apiErrorObj?.message ? String(apiErrorObj.message) : '') ||
      `Request failed with status ${response.status}`;
    const apiErrorCode =
      (payload?.code && String(payload.code)) ||
      (apiErrorObj?.code ? String(apiErrorObj.code) : '') ||
      '';
    throw createApiError(
      apiErrorMessage,
      {
        status: response.status,
        code: apiErrorCode,
        payload
      }
    );
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
};

const apiRequest = async (path, options = {}) => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw createApiError('Backend is disabled for this frontend session.', {
      code: 'BACKEND_DISABLED',
      isBackendDisabled: true
    });
  }

  const method = String(options.method || 'GET').toUpperCase();
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  const init = { method, headers, credentials: 'include' };
  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'text/plain';
      }
      init.body = options.body;
    } else if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
      init.body = options.body;
    } else {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
  }

  try {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, init);
    return await parseResponse(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw createApiError('Unable to complete the request right now.', {
        code: 'NETWORK_ERROR',
        isNetworkError: true,
        details:
          'Request was blocked by the browser (CORS/CSP) or the API is unreachable. Ensure the API returns Access-Control-Allow-Origin for this site and that the endpoint exists.',
        request: {
          url: `${baseUrl}${path}`,
          method
        }
      });
    }
    throw error;
  }
};

const applyAuthPayload = (payload) => {
  const currentUser = payload?.currentUser && typeof payload.currentUser === 'object' ? payload.currentUser : null;
  if (!currentUser) throw createApiError('Invalid authentication response from backend');

  setCurrentUserSync(currentUser);
  return currentUser;
};

const loginOwner = async ({ phone, password }) => {
  requireBackendConfigured();
  const payload = await apiRequest('/auth/login/owner', {
    method: 'POST',
    body: { phone, password }
  });
  return applyAuthPayload(payload);
};

const toFormUrlEncoded = (data) => {
  const pairs = [];
  Object.entries(data && typeof data === 'object' ? data : {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    pairs.push(`${encodeURIComponent(String(key))}=${encodeURIComponent(String(value))}`);
  });
  return pairs.join('&');
};

const registerOwner = async (payload) => {
  requireBackendConfigured();
  try {
    const data = await apiRequest('/auth/register-owner', {
      method: 'POST',
      body: payload
    });
    return applyAuthPayload(data);
  } catch (error) {
    if (error?.status !== 404) throw error;
    const signupPayload = {
      businessName: payload?.businessName,
      ownerFullName: payload?.fullName,
      ownerPhone: payload?.phone,
      password: payload?.password,
      moduleKey: payload?.businessModule,
      planName: payload?.subscriptionPlan
    };
    const data = await apiRequest('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormUrlEncoded(signupPayload)
    });
    return applyAuthPayload(data);
  }
};

const checkSignupPhoneAvailability = async ({ phone }) => {
  requireBackendConfigured();
  try {
    return await apiRequest('/auth/check-phone', {
      method: 'POST',
      body: { phone }
    });
  } catch (error) {
    if (error?.status === 404) {
      return { available: true, message: '' };
    }
    throw error;
  }
};

const requestPasswordReset = async ({ phone, otp }) => {
  requireBackendConfigured();
  return apiRequest('/auth/password-reset/request', {
    method: 'POST',
    body: { phone, otp }
  });
};

const resetOwnerPassword = async ({ challengeId, phone, otp, newPassword }) => {
  requireBackendConfigured();
  return apiRequest('/auth/password-reset/confirm', {
    method: 'POST',
    body: { challengeId, phone, otp, newPassword }
  });
};

const refreshAuth = async (refreshToken) => {
  void refreshToken;
  const data = await apiRequest('/auth/refresh', { method: 'POST' });
  return applyAuthPayload(data);
};

const authenticatedApiRequest = async (path, options = {}) => {
  if (!isBackendConfigured()) {
    throw createApiError('Backend is disabled for this frontend session.', {
      code: 'BACKEND_DISABLED',
      isBackendDisabled: true
    });
  }
  try {
    return await apiRequest(path, options);
  } catch (error) {
    if (error?.status === 401) {
      try {
        await refreshAuth();
        return apiRequest(path, options);
      } catch (refreshError) {
        clearLocalSession();
        if (refreshError?.status === 401 || refreshError?.status === 404 || refreshError?.status === 405) {
          throw createApiError('Authentication expired', { code: 'AUTH_EXPIRED', status: 401 });
        }
        throw refreshError;
      }
    }
    throw error;
  }
};

const bootstrapAuthSession = async () => {
  if (!isBackendConfigured()) {
    return getLocalCurrentUserSync();
  }
  try {
    const data = await authenticatedApiRequest('/auth/me');
    const currentUser = data?.currentUser && typeof data.currentUser === 'object' ? data.currentUser : null;
    if (currentUser) {
      setCurrentUserSync(currentUser);
      return currentUser;
    }
  } catch (error) {
    if (error?.status === 401) {
      clearLocalSession();
      return null;
    }
    throw error;
  }
  return getLocalCurrentUserSync();
};

const getCurrentUserSync = () => {
  return getLocalCurrentUserSync();
};

const logoutAuth = async () => {
  try {
    if (isBackendConfigured()) {
      await apiRequest('/auth/logout', {
        method: 'POST'
      });
    }
  } catch {}
  clearLocalSession();
};

export {
  authenticatedApiRequest,
  bootstrapAuthSession,
  checkSignupPhoneAvailability,
  getCurrentUserSync,
  loginOwner,
  logoutAuth,
  requestPasswordReset,
  registerOwner,
  resetOwnerPassword
};
