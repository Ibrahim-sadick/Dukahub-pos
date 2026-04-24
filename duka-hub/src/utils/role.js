export const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const normalizePermissionKey = (permission) => String(permission || '').trim().toLowerCase();

export const isAdminLikeRole = (role) => {
  const r = normalizeRole(role);
  if (!r) return false;
  if (r === 'manager') return true;
  if (r === 'admin') return true;
  if (r === 'super admin') return true;
  if (r === 'superadmin') return true;
  if (r === 'owner') return true;
  if (r.includes('admin')) return true;
  return false;
};

export const getUserPermissions = (user) => {
  const raw = Array.isArray(user?.permissions) ? user.permissions : [];
  const normalized = raw
    .map((permission) => {
      if (typeof permission === 'string') return permission;
      if (permission && typeof permission === 'object') {
        if (typeof permission.key === 'string') return permission.key;
        if (permission.permission && typeof permission.permission === 'object' && typeof permission.permission.key === 'string') {
          return permission.permission.key;
        }
      }
      return '';
    })
    .map((permission) => normalizePermissionKey(permission))
    .filter(Boolean);

  return normalized;
};

export const hasAllPermissions = (user, permissions = []) => {
  if (isAdminLikeRole(user?.role)) return true;
  const required = (Array.isArray(permissions) ? permissions : [permissions])
    .map((permission) => normalizePermissionKey(permission))
    .filter(Boolean);
  if (!required.length) return true;
  const currentPermissions = new Set(getUserPermissions(user));
  return required.every((permission) => currentPermissions.has(permission));
};

export const hasAnyPermission = (user, permissions = []) => {
  if (isAdminLikeRole(user?.role)) return true;
  const required = (Array.isArray(permissions) ? permissions : [permissions])
    .map((permission) => normalizePermissionKey(permission))
    .filter(Boolean);
  if (!required.length) return true;
  const currentPermissions = new Set(getUserPermissions(user));
  return required.some((permission) => currentPermissions.has(permission));
};

export const getRoleFromAccessToken = (accessToken) => {
  const token = String(accessToken || '').trim();
  if (!token) return '';
  const parts = token.split('.');
  if (parts.length < 2) return '';
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return normalizeRole(payload?.role || '');
  } catch {
    return '';
  }
};
