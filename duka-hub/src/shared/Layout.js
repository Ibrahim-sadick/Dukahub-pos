import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { appendSystemActivity } from '../utils/systemActivity';
import { productsApi } from '../services/productsApi';
import {
  RiStackLine,
  RiShoppingCart2Line,
  RiShoppingBag3Line,
  RiBarChart2Line,
  RiWallet3Line,
  RiSearchLine,
  RiNotification3Line,
  RiPulseLine,
  RiCheckboxCircleFill,
  RiErrorWarningLine,
  RiSettings3Line,
  RiDownload2Line,
  RiApps2Line,
  RiUser3Line,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiLock2Line,
  RiMenuLine,
  RiCloseLine
} from 'react-icons/ri';

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const authApi = {
  getCurrentUserSync() {
    void safeJsonParse;
    try {
      return safeJsonParse(window.localStorage.getItem('currentUser'), null);
    } catch {
      return null;
    }
  }
};

const localStore = {
  get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(String(key || ''));
      if (raw == null) return fallback;
      return safeJsonParse(raw, fallback);
    } catch {
      return fallback;
    }
  },
  set(key, value, options) {
    const k = String(key || '');
    if (!k) return false;
    try {
      window.localStorage.setItem(k, JSON.stringify(value));
    } catch {
      return false;
    }
    if (!options?.silent) {
      try {
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}
    }
    return true;
  },
  list() {
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
      return keys.sort();
    } catch {
      return [];
    }
  }
};

const migrateLegacyToScopedCacheOnce = async () => {
  return;
};

const Layout = ({ onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [companyInfo, setCompanyInfo] = useState({});
  const [currentUser, setCurrentUser] = useState(() => (authApi.getCurrentUserSync ? authApi.getCurrentUserSync() : null));
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [sidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    try {
      return window.matchMedia('(min-width: 1024px)').matches;
    } catch {
      return true;
    }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const isAdmin = true;
  const [toast, setToast] = useState({ open: false, id: 0, text: '', tone: 'info' });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [clock, setClock] = useState(() => Date.now());
  const audioRef = useRef({ ctx: null, unlocked: false });
  // eslint-disable-next-line no-unused-vars
  const meRefreshRef = useRef({ inFlight: false, lastAt: 0 });
  const prevCountsRef = useRef({});
  const pushNotificationRef = useRef(null);
  const businessId = useMemo(() => {
    const role = String(currentUser?.role || '').toLowerCase();
    if (role && role !== 'admin') return String(currentUser?.businessId || '');
    return String(currentUser?.id || '');
  }, [currentUser]);

  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia('(min-width: 1024px)');
    } catch {
      return;
    }
    const onChange = () => setIsDesktop(Boolean(mq.matches));
    onChange();
    try {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, []);

  useEffect(() => {
    if (isDesktop) setSidebarOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false);
  }, [location.pathname, isDesktop]);

  useEffect(() => {
    if (isDesktop || !sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen, isDesktop]);

  const staffAuditRef = useRef({ ready: false, prevByKey: {} });
  const staffLoginRef = useRef({ key: '' });
  useEffect(() => {
    if (!currentUser) return;
    const defs = [
      { key: 'sales', entityType: 'Sale', idFields: ['id', 'invoiceNo', 'invoiceNumber'], nameFields: ['customerName', 'customer', 'name'] },
      { key: 'salesOrders', entityType: 'Sales Order', idFields: ['id', 'invoiceNo', 'invoiceNumber'], nameFields: ['customerName', 'customer', 'name'] },
      { key: 'invoicedSales', entityType: 'Sale', idFields: ['id', 'invoiceNo', 'invoiceNumber'], nameFields: ['customerName', 'customer', 'name'] },
      { key: 'expenses', entityType: 'Expense', idFields: ['id'], nameFields: ['category', 'type', 'description'] },
      { key: 'purchases', entityType: 'Purchase', idFields: ['id', 'purchaseId', 'poNumber'], nameFields: ['supplierName', 'supplier', 'reference'] },
      { key: 'inventoryItems', entityType: 'Product', idFields: ['id', 'sku', 'barcode'], nameFields: ['name', 'itemName'] },
      { key: 'damagedStocks', entityType: 'Damage Stock', idFields: ['id'], nameFields: ['productName', 'itemName', 'name', 'reason'] }
    ];

    const prune = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const next = Array.isArray(obj) ? obj.slice() : { ...obj };
      delete next.updatedAt;
      delete next.lastUpdated;
      delete next.lastUpdatedAt;
      delete next.timestamp;
      delete next.ts;
      return next;
    };

    const pickFirst = (o, keys) => {
      for (const k of keys || []) {
        const v = o?.[k];
        if (v != null && String(v).trim() !== '') return String(v);
      }
      return '';
    };

    const getRowId = (def, row, idx) => {
      const id = pickFirst(row, def.idFields);
      return id ? `${id}` : `${def.key}#${idx}`;
    };

    const normalizeList = (def, list) => {
      const map = new Map();
      (Array.isArray(list) ? list : []).forEach((row, idx) => {
        const id = getRowId(def, row, idx);
        map.set(id, {
          id,
          name: pickFirst(row, def.nameFields),
          raw: row,
          sig: (() => {
            try {
              return JSON.stringify(prune(row));
            } catch {
              return String(id);
            }
          })()
        });
      });
      return map;
    };

    const log = (action, title, details, entityType, entityId) => {
      appendSystemActivity(action, title, details, entityType, 'success', { entityId });
    };

    const processOnce = async () => {
      const nextPrev = { ...(staffAuditRef.current.prevByKey || {}) };
      if (!staffAuditRef.current.ready) {
        for (const def of defs) {
          const raw = await localStore.get(def.key, []);
          const list = Array.isArray(raw) ? raw : [];
          const map = normalizeList(def, list);
          const saved = {};
          map.forEach((v, id) => {
            saved[id] = v.sig;
          });
          nextPrev[def.key] = saved;
        }
        staffAuditRef.current.prevByKey = nextPrev;
        staffAuditRef.current.ready = true;
        return;
      }

      for (const def of defs) {
        const raw = await localStore.get(def.key, []);
        const list = Array.isArray(raw) ? raw : [];
        const map = normalizeList(def, list);
        const prev = staffAuditRef.current.prevByKey?.[def.key] || {};
        const next = {};
        const added = [];
        const updated = [];
        map.forEach((v, id) => {
          next[id] = v.sig;
          if (!prev[id]) added.push(v);
          else if (prev[id] !== v.sig) updated.push(v);
        });
        const removedIds = Object.keys(prev).filter((id) => !next[id]);

        const cap = 4;
        added.slice(0, cap).forEach((v) => {
          const label = v.name ? ` (${v.name})` : '';
          log('create', `${def.entityType} created${label}`, `Created ${def.entityType}${label}`, def.entityType, v.id);
        });
        updated.slice(0, cap).forEach((v) => {
          const label = v.name ? ` (${v.name})` : '';
          log('update', `${def.entityType} updated${label}`, `Updated ${def.entityType}${label}`, def.entityType, v.id);
        });
        removedIds.slice(0, cap).forEach((id) => {
          try {
            const actorName = String(currentUser?.fullName || currentUser?.name || '').trim() || 'Staff';
            pushNotificationRef.current?.({ title: `${def.entityType} deleted`, message: `${actorName} deleted ${def.entityType}`, type: 'warning', read: false });
          } catch {}
          log('delete', `${def.entityType} deleted`, `Deleted ${def.entityType} (#${id})`, def.entityType, id);
        });

        if (added.length > cap) log('create', `${def.entityType} created`, `Created ${added.length} ${def.entityType}s`, def.entityType, '');
        if (updated.length > cap) log('update', `${def.entityType} updated`, `Updated ${updated.length} ${def.entityType}s`, def.entityType, '');
        if (removedIds.length > cap) log('delete', `${def.entityType} deleted`, `Deleted ${removedIds.length} ${def.entityType}s`, def.entityType, '');

        nextPrev[def.key] = next;
      }

      staffAuditRef.current.prevByKey = nextPrev;
    };

    const onData = () => {
      void Promise.resolve(processOnce()).catch(() => {});
    };

    onData();
    window.addEventListener('dataUpdated', onData);
    window.addEventListener('storage', onData);
    return () => {
      window.removeEventListener('dataUpdated', onData);
      window.removeEventListener('storage', onData);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const key = String(currentUser?.id || '').trim();
    if (!key) return;
    if (staffLoginRef.current.key === key) return;
    staffLoginRef.current.key = key;
    const actorName = String(currentUser?.fullName || currentUser?.name || '').trim() || 'Staff';
    try {
      pushNotificationRef.current?.({ title: 'Staff login', message: `${actorName} logged in`, type: 'info', read: false });
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    setHeaderSearch('');
  }, [location.pathname]);

  useEffect(() => {
    const unlock = () => {
      try {
        if (audioRef.current.unlocked) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!audioRef.current.ctx) audioRef.current.ctx = new Ctx();
        const ctx = audioRef.current.ctx;
        if (ctx.state === 'suspended') ctx.resume();
        audioRef.current.unlocked = true;
      } catch {}
    };
    const opts = { capture: true, passive: true };
    document.addEventListener('pointerdown', unlock, opts);
    document.addEventListener('keydown', unlock, opts);
    return () => {
      document.removeEventListener('pointerdown', unlock, opts);
      document.removeEventListener('keydown', unlock, opts);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const path = String(location.pathname || '').trim();
    if (path === '/plans' || path === '/login' || path === '/signup' || path.startsWith('/signup/')) return;
    const status = String(currentUser?.subscriptionPaymentStatus || companyInfo?.subscriptionPaymentStatus || '').trim().toLowerCase();
    const trialEndsAt = String(currentUser?.subscriptionTrialEndsAt || companyInfo?.subscriptionTrialEndsAt || '').trim();
    const endsAt = String(currentUser?.subscriptionEndsAt || companyInfo?.subscriptionEndsAt || '').trim();
    const targetDate = status === 'trial' ? trialEndsAt : endsAt;
    if (!targetDate) return;
    const ts = Date.parse(targetDate);
    if (!Number.isFinite(ts)) return;
    if (clock < ts) return;
    try {
      window.dispatchEvent(new CustomEvent('subscriptionLocked'));
    } catch {}
  }, [
    clock,
    companyInfo?.subscriptionEndsAt,
    companyInfo?.subscriptionPaymentStatus,
    companyInfo?.subscriptionTrialEndsAt,
    currentUser,
    location.pathname
  ]);

  const showToast = useCallback((text, tone, sound) => {
    setToast({ open: true, id: Date.now(), text, tone });
    try {
      const kind = String(sound || '').trim().toLowerCase() || (tone === 'critical' ? 'critical' : tone === 'warning' ? 'warning' : 'default');
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioRef.current.ctx) audioRef.current.ctx = new Ctx();
      const ctx = audioRef.current.ctx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const make = (freq, startOffset, duration, peak) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.00001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const startAt = ctx.currentTime + startOffset;
        osc.start(startAt);
        gain.gain.setValueAtTime(peak, startAt);
        gain.gain.exponentialRampToValueAtTime(0.00001, startAt + duration);
        osc.stop(startAt + duration + 0.02);
      };
      if (kind === 'ripples') {
        make(820, 0, 0.16, 0.085);
        make(640, 0.05, 0.22, 0.065);
        make(480, 0.12, 0.28, 0.045);
      } else if (kind === 'critical') {
        make(980, 0, 0.3, 0.095);
      } else if (kind === 'warning') {
        make(720, 0, 0.26, 0.08);
      } else {
        make(560, 0, 0.24, 0.06);
      }
    } catch {}
    setTimeout(() => setToast((t) => ({ ...t, open: false })), 5200);
  }, []);

  const notificationKey = useMemo(() => `notifications:${businessId || 'default'}`, [businessId]);

  const loadNotifications = useCallback(() => {
    Promise.resolve()
      .then(async () => {
        const raw = await localStore.get(notificationKey, []);
        const list = Array.isArray(raw) ? raw : [];
        const filtered = list.filter((n) => {
          const title = String(n?.title || '').toLowerCase();
          const message = String(n?.message || '').toLowerCase();
          const type = String(n?.type || '').toLowerCase();
          if (type === 'plan') return false;
          if (title.includes('payment due')) return false;
          if (message.includes('subscription is ending')) return false;
          return true;
        });
        if (filtered.length !== list.length) {
          void Promise.resolve(localStore.set(notificationKey, filtered, { silent: true })).catch(() => {});
        }
        setNotifications(filtered);
      })
      .catch(() => setNotifications([]));
  }, [notificationKey]);

  const pushNotification = useCallback((item) => {
    const next = {
      id: String(item?.id || `NTF-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      ts: String(item?.ts || new Date().toISOString()),
      title: String(item?.title || 'Notification'),
      message: String(item?.message || ''),
      type: String(item?.type || 'info'),
      read: Boolean(item?.read)
    };
    setNotifications((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const updated = [next, ...list].slice(0, 200);
      void Promise.resolve(localStore.set(notificationKey, updated, { silent: true })).catch(() => {});
      try {
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
      } catch {}
      return updated;
    });
  }, [notificationKey]);

  useEffect(() => {
    pushNotificationRef.current = pushNotification;
  }, [pushNotification]);
  

  useEffect(() => {
    const handleCompanyUpdate = () => {
      Promise.resolve()
        .then(async () => {
          const savedInfo = await localStore.get('companyInfo', {});
          setCompanyInfo(savedInfo && typeof savedInfo === 'object' ? savedInfo : {});
        })
        .catch(() => {});
      try {
        const user = authApi.getCurrentUserSync ? authApi.getCurrentUserSync() : null;
        setCurrentUser(user || null);
      } catch {}
    };
    window.addEventListener('companyInfoUpdated', handleCompanyUpdate);
    window.addEventListener('dataUpdated', handleCompanyUpdate);
    handleCompanyUpdate();
    return () => {
      window.removeEventListener('companyInfoUpdated', handleCompanyUpdate);
      window.removeEventListener('dataUpdated', handleCompanyUpdate);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    migrateLegacyToScopedCacheOnce();
  }, [currentUser]);

  useEffect(() => {
    if (!businessId) return;
    loadNotifications();
    const onUpdate = () => loadNotifications();
    window.addEventListener('storage', onUpdate);
    window.addEventListener('notificationsUpdated', onUpdate);
    return () => {
      window.removeEventListener('storage', onUpdate);
      window.removeEventListener('notificationsUpdated', onUpdate);
    };
  }, [businessId, loadNotifications]);

  useEffect(() => {
    const keys = ['salesOrders', 'purchases', 'expenses', 'inventoryItems', 'damagedStocks'];
    const ref = { timer: null };
    const check = async () => {
      const deltas = {};
      const scope = String(businessId || 'default');
      for (const k of keys) {
        const curArr = await localStore.get(k, []);
        const cur = Array.isArray(curArr) ? curArr.length : 0;
        const slot = `${scope}:${k}`;
        const prev = prevCountsRef.current[slot];
        const hasPrev = typeof prev === 'number' && Number.isFinite(prev);
        const d = cur - (hasPrev ? prev : cur);
        if (hasPrev && d > 0) deltas[k] = d;
        prevCountsRef.current[slot] = cur;
      }
      if (deltas.salesOrders) {
        const msg = `${deltas.salesOrders} sale order(s) recorded`;
        showToast(msg, 'success', 'ripples');
        pushNotification({ title: 'New sale order', message: msg, type: 'sales', read: false });
      }
      if (deltas.purchases) {
        const msg = `${deltas.purchases} purchase order(s) recorded`;
        showToast(msg, 'success', 'ripples');
        pushNotification({ title: 'New purchase order', message: msg, type: 'purchases', read: false });
      }
      if (deltas.expenses) {
        const msg = `${deltas.expenses} expense(s) recorded`;
        showToast(msg, 'success', 'ripples');
        pushNotification({ title: 'New expense', message: msg, type: 'expenses', read: false });
      }
      if (deltas.inventoryItems) {
        const msg = `${deltas.inventoryItems} product(s) added`;
        showToast(msg, 'success', 'ripples');
        pushNotification({ title: 'New product', message: msg, type: 'inventory', read: false });
      }
      if (deltas.damagedStocks) {
        const msg = `${deltas.damagedStocks} damaged stock record(s) recorded`;
        showToast(msg, 'warning', 'ripples');
        pushNotification({ title: 'Damaged stock', message: msg, type: 'inventory', read: false });
      }
    };
    // Initialize once
    void check();
    const onEvent = () => {
      if (ref.timer) window.clearTimeout(ref.timer);
      ref.timer = window.setTimeout(() => void check(), 250);
    };
    window.addEventListener('dataUpdated', onEvent);
    return () => {
      if (ref.timer) window.clearTimeout(ref.timer);
      window.removeEventListener('dataUpdated', onEvent);
    };
  }, [businessId, pushNotification, showToast]);

  const unreadNotifications = useMemo(() => (notifications || []).filter((n) => !n?.read), [notifications]);
  const unreadCount = unreadNotifications.length;
  const topbarTitle = useMemo(() => {
    const name = String(
      companyInfo?.companyName ||
        companyInfo?.name ||
        companyInfo?.businessName ||
        currentUser?.businessName ||
        currentUser?.companyName ||
        currentUser?.company ||
        ''
    ).trim();
    const branch = String(companyInfo?.branch || 'HQ').trim() || 'HQ';
    return `${name || 'Duka Hub'} ${branch}`.trim();
  }, [companyInfo?.branch, companyInfo?.businessName, companyInfo?.companyName, companyInfo?.name, currentUser?.businessName, currentUser?.company, currentUser?.companyName]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!e?.target?.closest?.('[data-notification-center]')) setNotificationOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const shouldRun = false;
    if (!shouldRun) return;
    const ref = { timer: null, lastAt: 0, inFlight: false };
    const computeSets = async () => {
      const businessIdForPrefs = String(currentUser?.id || '');
      const prefs = await localStore.get(`systemPreferences:${businessIdForPrefs || 'default'}`, null);
      const rawMin = String(prefs?.inventory?.defaultReorderLevel || '10').trim();
      const parsedMin = parseInt(rawMin, 10);
      const defaultMin = Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : 10;
      const minByName = new Map();
      const items = await localStore.get('inventoryItems', []);
      (Array.isArray(items) ? items : []).forEach((it) => {
        const name = String(it?.name || '').trim();
        if (!name) return;
        const minRaw = parseInt(String(it?.reorderLevel || '').trim(), 10);
        if (Number.isFinite(minRaw) && minRaw > 0) minByName.set(name, minRaw);
      });
      const snapshot = await productsApi.loadInventorySnapshot().catch(() => []);
      const critical = [];
      const warning = [];
      (Array.isArray(snapshot) ? snapshot : []).forEach((entry) => {
        const name = String(entry?.name || entry?.itemName || '').trim();
        const qty = Number(entry?.stockQuantity || 0);
        if (!name) return;
        const minLevel = minByName.get(name) || defaultMin;
        const status = qty <= minLevel ? 'critical' : qty <= Math.ceil(minLevel * 1.5) ? 'warning' : 'ok';
        if (status === 'critical') critical.push(name);
        else if (status === 'warning') warning.push(name);
      });
      return { critical: Array.from(new Set(critical)).sort(), warning: Array.from(new Set(warning)).sort() };
    };
    const checkAndNotify = async () => {
      if (ref.inFlight) return;
      const now = Date.now();
      if (now - ref.lastAt < 5000) return;
      ref.lastAt = now;
      ref.inFlight = true;
      try {
        const { critical, warning } = await computeSets();
        const prevC = await localStore.get(`lowStockPrevCritical:${businessId || 'default'}`, []);
        const prevW = await localStore.get(`lowStockPrevWarning:${businessId || 'default'}`, []);
        const first = prevC == null && prevW == null;
        if (!first) {
          const prevCList = Array.isArray(prevC) ? prevC : [];
          const prevWList = Array.isArray(prevW) ? prevW : [];
          const newC = critical.filter((n) => !prevCList.includes(n));
          const newW = warning.filter((n) => !prevWList.includes(n));
          if (newC.length) {
            const names = newC.slice(0, 3).join(', ');
            const more = newC.length > 3 ? ` +${newC.length - 3}` : '';
            showToast(`${newC.length} item(s) critical: ${names}${more}`, 'critical', 'ripples');
          } else if (newW.length) {
            const names = newW.slice(0, 3).join(', ');
            const more = newW.length > 3 ? ` +${newW.length - 3}` : '';
            showToast(`${newW.length} item(s) low: ${names}${more}`, 'warning', 'ripples');
          }
        }
        void Promise.resolve(localStore.set(`lowStockPrevCritical:${businessId || 'default'}`, critical)).catch(() => {});
        void Promise.resolve(localStore.set(`lowStockPrevWarning:${businessId || 'default'}`, warning)).catch(() => {});
      } catch {}
      ref.inFlight = false;
    };
    const onEvent = () => {
      if (ref.timer) window.clearTimeout(ref.timer);
      ref.timer = window.setTimeout(() => void checkAndNotify(), 400);
    };
    void checkAndNotify();
    window.addEventListener('dataUpdated', onEvent);
    return () => {
      if (ref.timer) window.clearTimeout(ref.timer);
      window.removeEventListener('dataUpdated', onEvent);
    };
  }, [businessId, currentUser, location.pathname, notificationOpen, showToast]);

  const sidebarItems = useMemo(
    () => [
      { path: '/dashboard', label: t('nav.dashboard'), icon: RiBarChart2Line },
      { path: '/sales', label: t('nav.sales'), icon: RiShoppingCart2Line },
      { path: '/stocks', label: t('nav.stocks'), icon: RiStackLine },
      { path: '/purchases', label: t('nav.purchases'), icon: RiShoppingBag3Line },
      { path: '/expenses', label: t('nav.expenses'), icon: RiWallet3Line },
      { path: '/placeholder/damage-stocks', label: t('nav.damageStocks'), icon: RiErrorWarningLine },
      { path: '/reports', label: t('nav.reports'), icon: RiBarChart2Line },
      { path: '/placeholder/notifications', label: t('nav.activity'), icon: RiPulseLine },
      { path: '/settings', label: t('nav.settings'), icon: RiSettings3Line }
    ],
    [t]
  );

  const visibleSidebarItems = useMemo(() => {
    return (sidebarItems || []).filter((i) => !i?.locked);
  }, [sidebarItems]);

  

  const submenu = useMemo(() => ({
    '/sales': [
      {
        title: t('nav.sales'),
        items: [
          { label: t('submenu.salesOrder'), to: '/placeholder/sales-order' },
          { label: t('submenu.salesHistory'), to: '/placeholder/sales-history' },
          { label: t('submenu.customers'), to: '/placeholder/sales-customers' },
          { label: t('submenu.creditSales'), to: '/placeholder/sales-credit' }
        ]
      }
    ],
    '/stocks': [
      {
        title: t('nav.stocks'),
        items: [
          { label: t('submenu.products'), to: '/placeholder/products' },
          { label: t('submenu.store'), to: '/placeholder/store' }
        ]
      }
    ],
    
    '/purchases': [
      {
        title: t('nav.purchases'),
        items: [
          { label: t('submenu.purchaseOrder'), to: '/purchases' },
          { label: t('submenu.purchaseHistory'), to: '/purchases/history' },
          { label: t('submenu.suppliers'), to: '/suppliers' }
        ]
      }
    ],
    '/expenses': [
      {
        title: t('nav.expenses'),
        items: [
          { label: t('submenu.expensesRecord'), to: '/expenses' },
          { label: t('submenu.expensesAnalytics'), to: '/placeholder/expenses-analytics' }
        ]
      }
    ],
    '/reports': [
      {
        title: t('nav.reports'),
        items: [
          { label: t('submenu.salesReports'), to: '/placeholder/reports-sales' },
          { label: t('submenu.inventoryReports'), to: '/placeholder/reports-inventory' },
          { label: t('submenu.productionReports'), to: '/placeholder/reports-production' },
          { label: t('submenu.expenseReports'), to: '/placeholder/reports-expenses' },
          { label: t('submenu.profitLoss'), to: '/reports' }
        ]
      }
    ],
    '/settings': [
      {
        title: t('nav.settings'),
        items: [{ label: t('submenu.systemPreferences'), to: '/placeholder/settings-preferences' }]
      }
    ]
  }), [t]);

  const visibleSubmenu = useMemo(() => {
    const out = {};
    Object.entries(submenu || {}).forEach(([k, groups]) => {
      const nextGroups = (groups || [])
        .map((g) => ({
          ...g,
          items: (g?.items || []).filter((it) => !it?.locked)
        }))
        .filter((g) => (g?.items || []).length > 0);
      if (nextGroups.length) out[k] = nextGroups;
    });
    return out;
  }, [submenu]);

  const openSubmenuRef = useRef(null);
  useEffect(() => {
    openSubmenuRef.current = openSubmenu;
  }, [openSubmenu]);

  useEffect(() => {
    if (sidebarCollapsed) {
      setOpenSubmenu(null);
      return;
    }
    const currentOpen = openSubmenuRef.current;
    if (!currentOpen) return;
    const p = String(location.pathname || '');
    const groupLinks = visibleSubmenu[currentOpen]
      ? visibleSubmenu[currentOpen].flatMap((g) => (g?.items ? g.items : []))
      : [];
    const stillWithinGroup = p === currentOpen || groupLinks.some((l) => String(l?.to || '') === p);
    if (!stillWithinGroup) setOpenSubmenu(null);
  }, [location.pathname, sidebarCollapsed, visibleSubmenu]);

  const searchItems = useMemo(() => {
    const out = [];
    visibleSidebarItems.forEach((i) => out.push({ label: i.label, to: i.path, group: t('common.menu') }));
    Object.values(visibleSubmenu).forEach((groups) => {
      (groups || []).forEach((g) => {
        (g.items || []).forEach((it) => out.push({ label: it.label, to: it.to, group: g.title || t('common.menu') }));
      });
    });
    const seen = new Set();
    return out.filter((x) => {
      const key = `${x.to}__${x.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [t, visibleSidebarItems, visibleSubmenu]);

  const headerResults = useMemo(() => {
    const q = (headerSearch || '').trim().toLowerCase();
    if (!q) return [];
    return searchItems
      .filter((x) => (x.label || '').toLowerCase().includes(q))
      .slice(0, 10);
  }, [headerSearch, searchItems]);

  const goTo = (to) => {
    const lockedAccounting =
      String(to || '') === '/placeholder/accounting' ||
      String(to || '').startsWith('/placeholder/income-overview') ||
      String(to || '').startsWith('/placeholder/expense-overview') ||
      String(to || '').startsWith('/placeholder/stock-value') ||
      String(to || '').startsWith('/placeholder/period-closing') ||
      String(to || '').startsWith('/placeholder/audit-trail');
    if (lockedAccounting) {
      setHeaderSearch('');
      setProfileOpen(false);
      return;
    }
    setHeaderSearch('');
    setProfileOpen(false);
    setSidebarOpen(false);
    navigate(to);
  };

  return (
    <div className="flex h-screen bg-white relative overflow-x-hidden">
      <style>{`
        @keyframes toastLife {
          0% { opacity: 0; transform: translateY(-14px) scale(0.97); }
          26% { opacity: 1; transform: translateY(0) scale(1); }
          78% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-10px) scale(0.985); }
        }
        .toast-life {
          animation: toastLife 5.2s cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: transform, opacity;
        }
        @keyframes submenuSlideDown {
          0% { opacity: 0; transform: translateY(-6px) scaleY(0.98); }
          100% { opacity: 1; transform: translateY(0) scaleY(1); }
        }
        .submenu-slide-down {
          transform-origin: top;
          animation: submenuSlideDown 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: transform, opacity;
        }
      `}</style>
      {!isDesktop && sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <div
        className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 overflow-hidden z-50 transform transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex justify-center">
            <div className={`${sidebarCollapsed ? 'w-12 h-12' : 'w-28 h-28'} rounded-full bg-green-600 flex items-center justify-center`}>
              <RiShoppingCart2Line size={sidebarCollapsed ? 22 : 56} className="text-white" />
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {visibleSidebarItems.map((item) => {
              const IconComponent = item.icon;
              const isLocked = Boolean(item.locked);
              const hasSubmenu = Boolean(visibleSubmenu[item.path]);
              const isOpen = !sidebarCollapsed && hasSubmenu && openSubmenu === item.path;
              const isActive = (() => {
                const p = String(location.pathname || '');
                if (p === item.path) return true;
                if (item.path === '/sales' && p.startsWith('/placeholder/sales-')) return true;
                if (item.path === '/stocks' && (p.startsWith('/placeholder/products') || p.startsWith('/placeholder/store'))) return true;
                if (item.path === '/expenses' && p.startsWith('/placeholder/expenses-')) return true;
                if (item.path === '/reports' && p.startsWith('/placeholder/reports-')) return true;
                if (item.path === '/settings' && p.startsWith('/placeholder/settings-')) return true;
                if (item.path.startsWith('/placeholder/') && p.startsWith(item.path)) return true;
                return false;
              })();
              const rowClassName = `relative flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} w-full text-left px-4 py-2.5 rounded-xl transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white border border-green-400 shadow-sm'
                  : isLocked
                    ? 'text-slate-200 opacity-60'
                    : isOpen
                      ? 'bg-slate-800/70 text-white'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
              }`;
              return (
                <div key={item.path} className="mb-1">
                  {hasSubmenu ? (
                    <button
                      type="button"
                      data-no-loading="true"
                      disabled={isLocked}
                      aria-expanded={isOpen}
                      aria-controls={`submenu_${item.path.replace(/[^a-z0-9]+/gi, '_')}`}
                      onClick={() => {
                        if (isLocked) return;
                        setOpenSubmenu((prev) => (prev === item.path ? null : item.path));
                      }}
                      className={rowClassName}
                    >
                      {isActive && <span className="absolute left-0 top-1 bottom-1 w-1 bg-green-600 rounded-r"></span>}
                      <span className={`flex items-center min-w-0 ${sidebarCollapsed ? 'justify-center' : ''} flex-1`}>
                        <IconComponent size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </span>
                      {!sidebarCollapsed ? (
                        isLocked ? (
                          <span className="ml-2">
                            <RiLock2Line size={16} className={isActive ? 'text-white' : 'text-slate-300'} />
                          </span>
                        ) : isOpen ? (
                          <RiArrowDownSLine size={16} className={isActive ? 'text-white' : 'text-slate-300'} />
                        ) : (
                          <RiArrowRightSLine size={16} className={isActive ? 'text-white' : 'text-slate-300'} />
                        )
                      ) : null}
                    </button>
                  ) : (
                    <NavLink
                      to={item.path}
                      onClick={(e) => {
                        if (isLocked) {
                          e.preventDefault();
                          return;
                        }
                        setOpenSubmenu(null);
                        if (!isDesktop) setSidebarOpen(false);
                      }}
                      className={rowClassName}
                    >
                      {isActive && <span className="absolute left-0 top-1 bottom-1 w-1 bg-green-600 rounded-r"></span>}
                      <span className={`flex items-center min-w-0 ${sidebarCollapsed ? 'justify-center' : ''} flex-1`}>
                        <IconComponent size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </span>
                      {!sidebarCollapsed && isLocked ? (
                        <span className="ml-2">
                          <RiLock2Line size={16} className={isActive ? 'text-white' : 'text-slate-300'} />
                        </span>
                      ) : null}
                    </NavLink>
                  )}
                  {!sidebarCollapsed && visibleSubmenu[item.path] && openSubmenu === item.path && (
                    <div
                      id={`submenu_${item.path.replace(/[^a-z0-9]+/gi, '_')}`}
                      className="submenu-slide-down mt-2 ml-4 rounded-xl bg-slate-800/40 text-white border border-green-400/40 p-2 max-h-64 overflow-auto"
                    >
                      <ul className="divide-y divide-slate-700">
                        {visibleSubmenu[item.path].flatMap((group) => group.items).map((link) => {
                          const childActive = location.pathname === link.to;
                          const lockedChild = Boolean(link.locked);
                          return (
                            <li key={link.label}>
                              <NavLink
                                to={link.to}
                                onClick={(e) => {
                                  if (lockedChild) {
                                    e.preventDefault();
                                    return;
                                  }
                                  if (!isDesktop) setSidebarOpen(false);
                                }}
                                className={`flex items-center justify-between text-sm px-3 py-2 rounded transition-colors ${
                                  lockedChild
                                    ? 'cursor-not-allowed opacity-60 text-white/70'
                                    : childActive
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/90 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  {link.label}
                                  {lockedChild ? <RiLock2Line size={14} className="text-white/80" /> : null}
                                </span>
                                <span className={childActive ? 'text-white' : 'text-white/60'}>{lockedChild ? '' : '›'}</span>
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      </div>
      <div data-theme-scope="app" className={`flex-1 flex flex-col ml-0 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="lg:hidden w-9 h-9 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 flex items-center justify-center"
                aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setSidebarOpen((v) => !v)}
              >
                {sidebarOpen ? <RiCloseLine size={18} /> : <RiMenuLine size={18} />}
              </button>
              <span className="text-sm font-medium font-serif tracking-wide text-gray-900">{topbarTitle}</span>
              
            </div>
          </div>
          <div className="hidden md:block flex-1 px-4">
            <div className="max-w-xl mx-auto relative">
              <div className="flex items-center bg-gray-100 text-gray-700 rounded-full px-3 py-2 border border-gray-200">
                <RiSearchLine size={18} className="mr-2 text-gray-500" />
                <input
                  type="text"
                  name="app_search"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="search"
                  enterKeyHint="search"
                  placeholder=""
                  className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500 opacity-60 cursor-not-allowed"
                  value=""
                  disabled
                />
              </div>
              {(headerSearch || '').trim() ? (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                  {headerResults.length ? (
                    <div className="max-h-72 overflow-auto">
                      {headerResults.map((r) => (
                        <button
                          key={`${r.to}_${r.label}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => goTo(r.to)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{r.label}</div>
                            <div className="text-xs text-gray-600">{r.group}</div>
                          </div>
                          <RiArrowRightSLine size={18} className="text-gray-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-600">{t('common.noMatches')}</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 flex items-center gap-2">
              <RiDownload2Line size={16} />
              <span className="hidden sm:inline">{t('common.export')}</span>
            </button>
            <button className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 flex items-center justify-center">
              <RiApps2Line size={18} />
            </button>
            <div className="relative" data-notification-center>
              <button
                type="button"
                className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 flex items-center justify-center relative"
                onClick={() => setNotificationOpen((v) => !v)}
              >
                {unreadCount ? (
                  <>
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : String(unreadCount)}
                    </span>
                  </>
                ) : null}
                <RiNotification3Line size={18} />
              </button>
              {notificationOpen ? (
                <div className="absolute right-0 mt-2 w-[360px] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">Notifications</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          const next = (notifications || []).map((n) => ({ ...n, read: true }));
                          void Promise.resolve(localStore.set(notificationKey, next)).catch(() => {});
                          setNotifications(next);
                          try {
                            window.dispatchEvent(new CustomEvent('notificationsUpdated'));
                          } catch {}
                        }}
                      >
                        Mark read
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {(notifications || []).length ? (
                      (notifications || []).slice(0, 20).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={n.read ? 'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50' : 'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 bg-green-50/40'}
                          onClick={() => {
                            const next = (notifications || []).map((x) => (x.id === n.id ? { ...x, read: true } : x));
                            void Promise.resolve(localStore.set(notificationKey, next)).catch(() => {});
                            setNotifications(next);
                            try {
                              window.dispatchEvent(new CustomEvent('notificationsUpdated'));
                            } catch {}
                            setNotificationOpen(false);
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{n.title || 'Notification'}</div>
                              <div className="mt-1 text-xs text-gray-700 line-clamp-2">{n.message || ''}</div>
                            </div>
                            {!n.read ? <div className="mt-1 w-2 h-2 rounded-full bg-green-600 shrink-0" /> : null}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-sm text-gray-600 text-center">No notifications yet</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            {isAdmin ? (
              <button type="button" className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 flex items-center justify-center" onClick={() => goTo('/placeholder/settings-preferences?tab=profile')}>
                <RiSettings3Line size={18} />
              </button>
            ) : null}
            <div className="relative">
              <div className="flex items-center gap-2 pl-2 cursor-pointer" onClick={() => setProfileOpen(!profileOpen)}>
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">
                  <RiUser3Line size={16} />
                </div>
                <RiArrowDownSLine size={16} className="text-gray-500" />
              </div>
              <div className={`absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 ${profileOpen ? 'block' : 'hidden'} z-50`}>
                {isAdmin ? (
                  <button type="button" className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => goTo('/placeholder/settings-preferences?tab=profile')}>
                    {t('top.profile')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                >
                  {t('top.logout')}
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-5 bg-gray-50 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      {toast.open ? (
        <div key={toast.id} className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] toast-life">
          <div
            className={
              toast.tone === 'critical'
                ? 'px-4 py-3 rounded-2xl bg-red-600 text-white shadow-lg'
                : toast.tone === 'warning'
                ? 'px-4 py-3 rounded-2xl bg-amber-500 text-white shadow-lg'
                : toast.tone === 'success'
                ? 'px-4 py-3 rounded-2xl bg-green-600 text-white shadow-lg'
                : 'px-4 py-3 rounded-2xl bg-slate-800 text-white shadow-lg'
            }
          >
            <div className="flex items-start gap-2">
              {toast.tone === 'success' ? <RiCheckboxCircleFill size={18} className="mt-0.5 text-white" /> : null}
              <div className="text-sm font-semibold">{toast.text}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Layout;
