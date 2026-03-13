import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const readJson = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const getCurrentUser = () => {
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

const getBusinessIdForUser = (user) => {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'staff') return String(user?.businessId || '');
  return String(user?.id || '');
};

const getSystemPreferences = (businessId) => {
  const key = `systemPreferences:${businessId || 'default'}`;
  return readJson(localStorage.getItem(key) || 'null', null);
};

const normalizeMode = () => 'light';

const ThemeContext = createContext({ mode: 'light', theme: 'light' });

const resolveMode = () => {
  const user = getCurrentUser();
  const businessId = getBusinessIdForUser(user);
  void getSystemPreferences(businessId);
  return 'light';
};

const prefersDark = () => {
  try {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch {
    return false;
  }
};

const resolveThemeFromMode = (mode) => {
  const m = normalizeMode(mode);
  if (m === 'dark') return 'dark';
  if (m === 'light') return 'light';
  return prefersDark() ? 'dark' : 'light';
};

const applyDocumentTheme = (theme) => {
  try {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  } catch {}
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => resolveMode());
  const [theme, setTheme] = useState(() => resolveThemeFromMode(mode));

  useEffect(() => {
    const nextTheme = resolveThemeFromMode(mode);
    setTheme(nextTheme);
    applyDocumentTheme(nextTheme);
  }, [mode]);

  useEffect(() => {
    const sync = () => setMode(resolveMode());
    const onTempMode = (e) => setMode(normalizeMode(e?.detail?.mode));

    let mq;
    const onSystemChange = () => {
      if (normalizeMode(mode) !== 'system') return;
      const nextTheme = resolveThemeFromMode('system');
      setTheme(nextTheme);
      applyDocumentTheme(nextTheme);
    };
    try {
      mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
      if (mq && typeof mq.addEventListener === 'function') mq.addEventListener('change', onSystemChange);
      else if (mq && typeof mq.addListener === 'function') mq.addListener(onSystemChange);
    } catch {}

    window.addEventListener('storage', sync);
    window.addEventListener('systemPreferencesUpdated', sync);
    window.addEventListener('themeChanged', onTempMode);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('systemPreferencesUpdated', sync);
      window.removeEventListener('themeChanged', onTempMode);
      try {
        if (mq && typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onSystemChange);
        else if (mq && typeof mq.removeListener === 'function') mq.removeListener(onSystemChange);
      } catch {}
    };
  }, [mode]);

  const value = useMemo(() => ({ mode, theme }), [mode, theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
