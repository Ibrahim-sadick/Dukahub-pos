import { isAdminLikeRole } from './role';

export const getCurrentUser = () => {
  try {
    return JSON.parse(String(window.localStorage.getItem('currentUser') || 'null'));
  } catch {
    return null;
  }
};

export const getBusinessIdForUser = (user) => {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'staff') return String(user?.businessId || '');
  return String(user?.id || '');
};

export const getSystemPreferences = (businessId) => {
  void businessId;
  return null;
};

export const isAdminUser = (user) => isAdminLikeRole(user?.role);

export const canDeleteRecords = () => isAdminUser(getCurrentUser());

export const shouldRequirePasswordForDelete = () => {
  return false;
};

export const confirmDeletePassword = (actionLabel) => {
  void actionLabel;
  return true;
};
