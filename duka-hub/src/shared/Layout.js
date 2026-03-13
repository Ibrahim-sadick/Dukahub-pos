import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { authApi, syncLocalAuthStateFromBackendMe } from '../services/backendApi';
import {
  RiStackLine,
  RiShoppingCart2Line,
  RiShoppingBag3Line,
  RiGroupLine,
  RiBarChart2Line,
  RiCalculatorLine,
  RiBankLine,
  RiPlug2Line,
  RiWallet3Line,
  RiSearchLine,
  RiNotification3Line,
  RiPulseLine,
  RiCheckboxCircleFill,
  RiSettings3Line,
  RiDownload2Line,
  RiApps2Line,
  RiUser3Line,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiLock2Line
} from 'react-icons/ri';

const Layout = ({ children, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [companyInfo, setCompanyInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('companyInfo') || '{}') || {};
    } catch {
      return {};
    }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || 'null') || JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    } catch {
      return null;
    }
  });
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [sidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const [toast, setToast] = useState({ open: false, id: 0, text: '', tone: 'info' });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [clock, setClock] = useState(() => Date.now());
  const audioRef = useRef({ ctx: null, unlocked: false });
  const meRefreshRef = useRef({ inFlight: false, lastAt: 0 });
  const businessId = useMemo(() => {
    const role = String(currentUser?.role || '').toLowerCase();
    if (role && role !== 'admin') return String(currentUser?.businessId || '');
    return String(currentUser?.id || '');
  }, [currentUser]);

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
    try {
      const raw = JSON.parse(localStorage.getItem(notificationKey) || '[]');
      const list = Array.isArray(raw) ? raw : [];
      setNotifications(list);
    } catch {
      setNotifications([]);
    }
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
    try {
      const raw = JSON.parse(localStorage.getItem(notificationKey) || '[]');
      const list = Array.isArray(raw) ? raw : [];
      const updated = [next, ...list].slice(0, 200);
      localStorage.setItem(notificationKey, JSON.stringify(updated));
      setNotifications(updated);
      try {
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
      } catch {}
    } catch {}
  }, [notificationKey]);
  

  useEffect(() => {
    const handleCompanyUpdate = () => {
      try {
        const savedInfo = JSON.parse(localStorage.getItem('companyInfo') || '{}');
        setCompanyInfo(savedInfo || {});
      } catch {}
      try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null') || JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        setCurrentUser(user || null);
      } catch {}
    };
    window.addEventListener('storage', handleCompanyUpdate);
    window.addEventListener('companyInfoUpdated', handleCompanyUpdate);
    window.addEventListener('dataUpdated', handleCompanyUpdate);
    return () => {
      window.removeEventListener('storage', handleCompanyUpdate);
      window.removeEventListener('companyInfoUpdated', handleCompanyUpdate);
      window.removeEventListener('dataUpdated', handleCompanyUpdate);
    };
  }, []);

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
    const getLen = (key) => {
      try {
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(arr) ? arr.length : 0;
      } catch {
        return 0;
      }
    };
    const keys = ['salesOrders', 'sales', 'purchases', 'expenses'];
    const check = () => {
      const deltas = {};
      keys.forEach((k) => {
        const cur = getLen(k);
        const prevKey = `prevCount:${k}`;
        const hasPrev = (() => {
          try {
            return localStorage.getItem(prevKey) !== null;
          } catch {
            return false;
          }
        })();
        let prev = cur;
        try {
          prev = parseInt(localStorage.getItem(prevKey) || String(cur), 10);
        } catch {}
        const d = cur - (Number.isFinite(prev) ? prev : cur);
        if (hasPrev && d > 0) deltas[k] = d;
        try {
          localStorage.setItem(prevKey, String(cur));
        } catch {}
      });
      if (deltas.salesOrders) {
        const msg = `${deltas.salesOrders} sale order(s) recorded`;
        showToast(msg, 'success', 'ripples');
        pushNotification({ title: 'New sale order', message: msg, type: 'sales', read: false });
      }
      if (deltas.sales) {
        const msg = `${deltas.sales} sale order(s) recorded`;
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
    };
    // Initialize once
    check();
    const onEvent = () => check();
    window.addEventListener('dataUpdated', onEvent);
    window.addEventListener('storage', onEvent);
    return () => {
      window.removeEventListener('dataUpdated', onEvent);
      window.removeEventListener('storage', onEvent);
    };
  }, [pushNotification, showToast]);

  const unreadNotifications = useMemo(() => (notifications || []).filter((n) => !n?.read), [notifications]);
  const unreadCount = unreadNotifications.length;

  useEffect(() => {
    const endsAtIso = String(companyInfo?.subscriptionEndsAt || '').trim();
    const planId = String(companyInfo?.subscriptionPlan || '').trim();
    if (!businessId || !planId || !endsAtIso) return;
    let endsAt;
    try {
      endsAt = new Date(endsAtIso);
      if (Number.isNaN(endsAt.getTime())) return;
    } catch {
      return;
    }
    const now = clock;
    const msLeft = endsAt.getTime() - now;
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    if (daysLeft <= 0) return;
    if (daysLeft > 3) return;
    const key = `notified:planExpiry:${businessId}:${endsAtIso}`;
    try {
      if (localStorage.getItem(key) === '1') return;
      localStorage.setItem(key, '1');
    } catch {}
    const title = 'Plan Expiry Alert';
    const message = `Mpango wako unakaribia kuisha (${daysLeft} siku). Tafadhali lipa ili uendelee kutumia mfumo.`;
    pushNotification({
      title,
      message,
      type: 'plan',
      read: false
    });
    showToast(message, 'warning', 'ripples');
  }, [businessId, clock, companyInfo?.subscriptionEndsAt, companyInfo?.subscriptionPlan, pushNotification, showToast]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!e?.target?.closest?.('[data-notification-center]')) setNotificationOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      const btn = e?.target?.closest?.('button');
      if (!btn) return;
      if (btn.disabled) return;
      if (btn.getAttribute('data-no-loading') === 'true') return;
      btn.setAttribute('data-click-loading', 'true');
      setTimeout(() => {
        try {
          btn.removeAttribute('data-click-loading');
        } catch {}
      }, 5000);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    const getDefaultMin = () => {
      try {
        const role = String(currentUser?.role || '').toLowerCase();
        const businessId = role === 'staff' ? String(currentUser?.businessId || '') : String(currentUser?.id || '');
        const prefs = JSON.parse(localStorage.getItem(`systemPreferences:${businessId || 'default'}`) || 'null');
        const raw = String(prefs?.inventory?.defaultReorderLevel || '10').trim();
        const n = parseInt(raw, 10);
        return Number.isFinite(n) && n > 0 ? n : 10;
      } catch {
        return 10;
      }
    };
    const computeSets = () => {
      const defaultMin = getDefaultMin();
      const qtyByName = new Map();
      const minByName = new Map();
      try {
        const items = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
        (Array.isArray(items) ? items : []).forEach((it) => {
          const name = String(it?.name || '').trim();
          if (!name) return;
          const minRaw = parseInt(String(it?.reorderLevel || '').trim(), 10);
          if (Number.isFinite(minRaw) && minRaw > 0) minByName.set(name, minRaw);
        });
      } catch {}
      try {
        Object.keys(localStorage || {}).forEach((k) => {
          if (!/^stockIn_/.test(k)) return;
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          (Array.isArray(list) ? list : []).forEach((r) => {
            const name = String(r?.itemName || r?.name || '').trim();
            if (!name) return;
            const qty = parseFloat(String(r?.quantity || 0)) || 0;
            qtyByName.set(name, (qtyByName.get(name) || 0) + qty);
          });
        });
        Object.keys(localStorage || {}).forEach((k) => {
          if (!/^stockOut_/.test(k)) return;
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          (Array.isArray(list) ? list : []).forEach((r) => {
            const name = String(r?.itemName || r?.name || '').trim();
            if (!name) return;
            const qty = parseFloat(String(r?.quantity || 0)) || 0;
            qtyByName.set(name, (qtyByName.get(name) || 0) - qty);
          });
        });
      } catch {}
      const critical = [];
      const warning = [];
      Array.from(qtyByName.entries()).forEach(([name, qty]) => {
        const minLevel = minByName.get(name) || defaultMin;
        const status = qty <= minLevel ? 'critical' : qty <= Math.ceil(minLevel * 1.5) ? 'warning' : 'ok';
        if (status === 'critical') critical.push(name);
        else if (status === 'warning') warning.push(name);
      });
      return { critical: Array.from(new Set(critical)).sort(), warning: Array.from(new Set(warning)).sort() };
    };
    const checkAndNotify = () => {
      const { critical, warning } = computeSets();
      let prevC = [];
      let prevW = [];
      try {
        prevC = JSON.parse(localStorage.getItem('lowStockPrevCritical') || '[]') || [];
        prevW = JSON.parse(localStorage.getItem('lowStockPrevWarning') || '[]') || [];
      } catch {}
      const first = !(localStorage.getItem('lowStockPrevCritical') || localStorage.getItem('lowStockPrevWarning'));
      if (!first) {
        const newC = critical.filter((n) => !prevC.includes(n));
        const newW = warning.filter((n) => !prevW.includes(n));
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
      try {
        localStorage.setItem('lowStockPrevCritical', JSON.stringify(critical));
        localStorage.setItem('lowStockPrevWarning', JSON.stringify(warning));
      } catch {}
    };
    const onEvent = () => checkAndNotify();
    checkAndNotify();
    window.addEventListener('dataUpdated', onEvent);
    window.addEventListener('storage', onEvent);
    return () => {
      window.removeEventListener('dataUpdated', onEvent);
      window.removeEventListener('storage', onEvent);
    };
  }, [currentUser, showToast]);

  const sidebarItems = useMemo(
    () => [
      { path: '/dashboard', label: t('nav.dashboard'), icon: RiBarChart2Line },
      { path: '/sales', label: t('nav.sales'), icon: RiShoppingCart2Line },
      { path: '/stocks', label: t('nav.stocks'), icon: RiStackLine },
      { path: '/purchases', label: t('nav.purchases'), icon: RiShoppingBag3Line },
      { path: '/expenses', label: t('nav.expenses'), icon: RiWallet3Line },
      { path: '/reports', label: t('nav.reports'), icon: RiBarChart2Line, locked: !isAdmin },
      { path: '/users', label: t('nav.staff'), icon: RiGroupLine, locked: !isAdmin },
      { path: '/placeholder/accounting', label: t('nav.accounting'), icon: RiCalculatorLine },
      { path: '/placeholder/banking', label: t('nav.banking'), icon: RiBankLine },
      { path: '/placeholder/planning', label: t('nav.planning'), icon: RiApps2Line },
      { path: '/placeholder/notifications', label: t('nav.activity'), icon: RiPulseLine },
      { path: '/placeholder/integrations', label: t('nav.integrations'), icon: RiPlug2Line },
      { path: '/settings', label: t('nav.settings'), icon: RiSettings3Line, locked: !isAdmin }
    ],
    [isAdmin, t]
  );

  

  const submenu = useMemo(() => ({
    '/sales': [
      {
        title: t('nav.sales'),
        items: [
          { label: t('submenu.salesOrder'), to: '/placeholder/sales-order' },
          { label: t('submenu.salesHistory'), to: '/placeholder/sales-history' },
          { label: t('submenu.customers'), to: '/placeholder/sales-customers' },
          { label: t('submenu.creditSales'), to: '/placeholder/sales-credit' },
          { label: t('submenu.returnsRefunds'), to: '/placeholder/sales-returns' }
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
    ...(isAdmin
      ? {
          '/reports': [
            {
              title: t('nav.reports'),
              items: [
                { label: t('submenu.salesReports'), to: '/placeholder/reports-sales' },
                { label: t('submenu.inventoryReports'), to: '/placeholder/reports-inventory', locked: true },
                { label: t('submenu.productionReports'), to: '/placeholder/reports-production' },
                { label: t('submenu.expenseReports'), to: '/placeholder/reports-expenses' },
                { label: t('submenu.profitLoss'), to: '/reports' },
                { label: t('submenu.performanceKpis'), to: '/placeholder/reports-kpis', locked: true }
              ]
            }
          ]
        }
      : {}),
    '/users': [
      {
        title: t('nav.staff'),
        items: [
          { label: t('submenu.staffRegister'), to: '/users' },
          { label: t('submenu.staffList'), to: '/users/list' },
          { label: t('submenu.rolesPermissions'), to: '/roles-permissions' }
        ]
      }
    ],
    '/placeholder/planning': [
      {
        title: t('nav.planning'),
        items: [
          { label: t('submenu.purchasePlanning'), to: '/placeholder/purchase-planning' }
        ]
      }
    ],
    '/placeholder/notifications': [
      {
        title: t('nav.activity'),
        items: [
          { label: t('submenu.lowStockAlerts'), to: '/placeholder/alerts-low-stock' },
          { label: t('submenu.expiryAlerts'), to: '/placeholder/alerts-expiry', locked: true },
          { label: t('submenu.paymentDueAlerts'), to: '/placeholder/alerts-payment-due' },
          { label: t('submenu.systemLogs'), to: '/placeholder/system-logs' }
        ]
      }
    ],
    '/placeholder/accounting': [
      {
        title: t('nav.accounting'),
        items: [
          { label: t('submenu.incomeOverview'), to: '/placeholder/income-overview', locked: true },
          { label: t('submenu.expenseOverview'), to: '/placeholder/expense-overview', locked: true },
          { label: t('submenu.stockValue'), to: '/placeholder/stock-value', locked: true },
          { label: t('submenu.periodClosing'), to: '/placeholder/period-closing', locked: true },
          { label: t('submenu.auditTrail'), to: '/placeholder/audit-trail', locked: true }
        ]
      }
    ],
    '/placeholder/banking': [
      {
        title: t('nav.banking'),
        items: [
          { label: t('submenu.bankAccounts'), to: '/placeholder/banking-accounts', locked: true },
          { label: t('submenu.bankTransfers'), to: '/placeholder/banking-transfers', locked: true },
          { label: t('submenu.bankReconciliation'), to: '/placeholder/banking-reconciliation', locked: true }
        ]
      }
    ],
    '/placeholder/integrations': [
      {
        title: t('nav.integrations'),
        items: [
          { label: t('submenu.mobileMoney'), to: '/placeholder/integration-mobile-money', locked: true },
          { label: t('submenu.smsWhatsapp'), to: '/placeholder/integration-sms', locked: true },
          { label: t('submenu.exportIntegration'), to: '/placeholder/integration-export', locked: true }
        ]
      }
    ],
    ...(isAdmin
      ? {
          '/settings': [
            {
              title: t('nav.settings'),
              items: [
                { label: t('top.profile'), to: '/settings' },
                { label: t('submenu.systemPreferences'), to: '/placeholder/settings-preferences' }
              ]
            }
          ]
        }
      : {})
  }), [isAdmin, t]);

  const searchItems = useMemo(() => {
    const out = [];
    sidebarItems.forEach((i) => out.push({ label: i.label, to: i.path, group: t('common.menu') }));
    Object.values(submenu).forEach((groups) => {
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
  }, [sidebarItems, submenu, t]);

  const headerResults = useMemo(() => {
    const q = (headerSearch || '').trim().toLowerCase();
    if (!q) return [];
    return searchItems
      .filter((x) => (x.label || '').toLowerCase().includes(q))
      .slice(0, 10);
  }, [headerSearch, searchItems]);

  const goTo = (to) => {
    if (subscriptionLock.locked && String(to || '') !== '/plans' && String(to || '') !== '/dashboard') {
      setHeaderSearch('');
      setProfileOpen(false);
      return;
    }
    const lockedReports =
      String(to || '') === '/placeholder/reports-inventory' || String(to || '') === '/placeholder/reports-kpis';
    const lockedIntegrations =
      String(to || '') === '/placeholder/integrations' ||
      String(to || '') === '/placeholder/integration-mobile-money' ||
      String(to || '') === '/placeholder/integration-sms' ||
      String(to || '') === '/placeholder/integration-export';
    const lockedBanking =
      String(to || '') === '/placeholder/banking' ||
      String(to || '') === '/placeholder/banking-accounts' ||
      String(to || '') === '/placeholder/banking-transfers' ||
      String(to || '') === '/placeholder/banking-reconciliation';
    const lockedAccounting =
      String(to || '') === '/placeholder/accounting' ||
      String(to || '').startsWith('/placeholder/income-overview') ||
      String(to || '').startsWith('/placeholder/expense-overview') ||
      String(to || '').startsWith('/placeholder/stock-value') ||
      String(to || '').startsWith('/placeholder/period-closing') ||
      String(to || '').startsWith('/placeholder/audit-trail') ||
      String(to || '') === '/placeholder/alerts-expiry';
    const lockedForStaff =
      !isAdmin &&
      (String(to || '') === '/reports' ||
        String(to || '') === '/settings' ||
        String(to || '') === '/users' ||
        String(to || '') === '/users/list' ||
        String(to || '') === '/roles-permissions' ||
        String(to || '') === '/placeholder/system-logs');
    if (lockedReports || lockedIntegrations || lockedBanking || lockedAccounting || lockedForStaff) {
      setHeaderSearch('');
      setProfileOpen(false);
      return;
    }
    setHeaderSearch('');
    setProfileOpen(false);
    navigate(to);
  };

  const subscriptionLock = useMemo(() => {
    if (!currentUser) return { locked: false, reason: '' };

    const explicitLocked = Boolean(currentUser?.subscriptionLocked || companyInfo?.subscriptionLocked);
    const explicitReason = String(currentUser?.subscriptionLockReason || companyInfo?.subscriptionLockReason || '').trim().toLowerCase();
    if (explicitLocked) {
      const reasonKey =
        explicitReason === 'expired'
          ? 'lock.expired'
          : explicitReason === 'payment_pending' || explicitReason === 'pending'
            ? 'lock.paymentPending'
            : explicitReason === 'cancelled'
              ? 'lock.inactive'
              : 'lock.inactive';
      return { locked: true, reason: reasonKey };
    }

    const status = String(currentUser?.subscriptionPaymentStatus || companyInfo?.subscriptionPaymentStatus || '').toLowerCase();
    const endsAtRaw = String(currentUser?.subscriptionEndsAt || companyInfo?.subscriptionEndsAt || '').trim();
    const trialEndsAtRaw = String(currentUser?.subscriptionTrialEndsAt || companyInfo?.subscriptionTrialEndsAt || '').trim();
    const now = clock;

    const parseTime = (s) => {
      const t = Date.parse(String(s || ''));
      return Number.isFinite(t) ? t : 0;
    };

    if (status === 'paid') {
      const end = parseTime(endsAtRaw);
      if (!end) return { locked: true, reason: 'lock.notActive' };
      if (now > end) return { locked: true, reason: 'lock.expired' };
      return { locked: false, reason: '' };
    }

    if (status === 'trial') {
      const end = parseTime(trialEndsAtRaw || endsAtRaw);
      if (!end) return { locked: true, reason: 'lock.trialNotActive' };
      if (now > end) return { locked: true, reason: 'lock.trialEnded' };
      return { locked: false, reason: '' };
    }

    if (status === 'pending') return { locked: true, reason: 'lock.paymentPending' };

    const hasPlan = Boolean(String(currentUser?.subscriptionPlan || companyInfo?.subscriptionPlan || '').trim());
    if (hasPlan) return { locked: true, reason: 'lock.inactive' };
    return { locked: false, reason: '' };
  }, [clock, companyInfo?.subscriptionEndsAt, companyInfo?.subscriptionLocked, companyInfo?.subscriptionLockReason, companyInfo?.subscriptionPaymentStatus, companyInfo?.subscriptionPlan, companyInfo?.subscriptionTrialEndsAt, currentUser]);

  const visibleSidebarItems = useMemo(() => {
    if (!subscriptionLock.locked) return sidebarItems;
    return [
      sidebarItems.find((i) => i.path === '/dashboard') || { path: '/dashboard', label: t('nav.dashboard'), icon: RiBarChart2Line },
      { path: '/plans', label: t('nav.plans'), icon: RiLock2Line }
    ];
  }, [sidebarItems, subscriptionLock.locked, t]);

  useEffect(() => {
    if (!subscriptionLock.locked) return;
    const path = String(location.pathname || '');
    if (path === '/plans' || path === '/dashboard') return;
    navigate('/dashboard', { replace: true });
  }, [location.pathname, navigate, subscriptionLock.locked]);

  useEffect(() => {
    if (subscriptionLock.locked) return;
    const path = String(location.pathname || '');
    if (path !== '/plans') return;
    navigate('/dashboard', { replace: true });
  }, [location.pathname, navigate, subscriptionLock.locked]);

  useEffect(() => {
    if (!currentUser) return;
    if (!subscriptionLock.locked) return;
    let mounted = true;
    const rememberMe = Boolean(localStorage.getItem('rememberMe') === 'true');
    const refresh = async () => {
      if (!mounted) return;
      const now = Date.now();
      if (meRefreshRef.current.inFlight) return;
      if (now - meRefreshRef.current.lastAt < 8000) return;
      meRefreshRef.current.inFlight = true;
      meRefreshRef.current.lastAt = now;
      try {
        const me = await authApi.me();
        if (!mounted) return;
        syncLocalAuthStateFromBackendMe(me, rememberMe);
      } catch {} finally {
        meRefreshRef.current.inFlight = false;
      }
    };

    const onFocus = () => refresh();
    refresh();
    const id = setInterval(refresh, 15000);
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser, subscriptionLock.locked]);

  return (
    <div className="flex h-screen bg-white relative overflow-x-hidden">
      <style>{`
        button[data-click-loading="true"] {
          position: relative;
          pointer-events: none;
        }
        button[data-click-loading="true"]::after {
          content: '';
          position: absolute;
          right: 10px;
          top: 50%;
          width: 14px;
          height: 14px;
          margin-top: -7px;
          border-radius: 9999px;
          border: 2px solid currentColor;
          border-top-color: rgba(0,0,0,0);
          opacity: 0.8;
          animation: btnSpin 0.55s linear infinite;
        }
        @keyframes btnSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
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
      `}</style>
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 overflow-hidden z-40`}>
        <div className="p-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex justify-center">
            <div className={`${sidebarCollapsed ? 'p-0.5' : 'p-1'} rounded-full bg-slate-800`}>
              {companyInfo.logo ? (
                <img src={companyInfo.logo} alt="Company Logo" className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-24 h-24'} object-cover rounded-full`} />
              ) : (
                <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-24 h-24'} rounded-full bg-green-600 flex items-center justify-center`}>
                  <RiShoppingCart2Line size={sidebarCollapsed ? 18 : 44} className="text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {visibleSidebarItems.map((item) => {
              const IconComponent = item.icon;
              const isLocked = Boolean(item.locked);
              const isActive =
                location.pathname === item.path ||
                (item.path.startsWith('/placeholder/') && location.pathname.startsWith(item.path));
              return (
                <div key={item.path} className="mb-1">
                  <Link
                    to={item.path}
                    onClick={(e) => {
                      if (isLocked) {
                        e.preventDefault();
                        return;
                      }
                      if (!sidebarCollapsed && submenu[item.path]) {
                        e.preventDefault();
                        setOpenSubmenu(openSubmenu === item.path ? null : item.path);
                      }
                    }}
                    className={`relative flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} w-full text-left px-4 py-2.5 rounded-xl transition-colors ${
                      isActive ? 'bg-slate-800 text-white border border-green-400 shadow-sm' : isLocked ? 'text-slate-200 opacity-60 cursor-not-allowed' : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-1 bottom-1 w-1 bg-green-600 rounded-r"></span>}
                    <span className="flex items-center">
                      <IconComponent size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                      {!sidebarCollapsed && item.label}
                    </span>
                    {!sidebarCollapsed && isLocked ? (
                      <span className="ml-2">
                        <RiLock2Line size={16} className={isActive ? 'text-white' : 'text-slate-300'} />
                      </span>
                    ) : !sidebarCollapsed && submenu[item.path] ? (
                      <span className="ml-2">
                        {openSubmenu === item.path ? (
                          <RiArrowDownSLine size={16} className={isActive ? 'text-white' : 'text-slate-300'} />
                        ) : (
                          <RiArrowRightSLine size={16} className={isActive ? 'text-white' : 'text-slate-300'} />
                        )}
                      </span>
                    ) : null}
                  </Link>
                  {!sidebarCollapsed && submenu[item.path] && openSubmenu === item.path && (
                    <div className="mt-2 ml-4 rounded-xl bg-slate-800/40 text-white border border-green-400/40 p-2 max-h-64 overflow-auto">
                      <ul className="divide-y divide-slate-700">
                        {submenu[item.path].flatMap((group) => group.items).map((link) => {
                          const childActive = location.pathname === link.to;
                          const lockedChild = Boolean(link.locked);
                          return (
                            <li key={link.label}>
                              <Link
                                to={link.to}
                                onClick={(e) => {
                                  if (lockedChild) {
                                    e.preventDefault();
                                    return;
                                  }
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
                              </Link>
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
      <div data-theme-scope="app" className={`flex-1 flex flex-col ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-green-600 text-white flex items-center justify-center">
                <RiShoppingCart2Line size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-900">{companyInfo.companyName || companyInfo.name || 'Duka Hubnow'}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{companyInfo?.branch || 'HQ'}</span>
              
            </div>
          </div>
          <div className="flex-1 px-4">
            <div className="max-w-xl mx-auto relative">
              <div className="flex items-center bg-gray-100 text-gray-700 rounded-full px-3 py-2 border border-gray-200">
                <RiSearchLine size={18} className="mr-2 text-gray-500" />
                <input
                  type="text"
                  placeholder={t('top.searchPlaceholder')}
                  className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && headerResults.length > 0) {
                      goTo(headerResults[0].to);
                    }
                  }}
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
              {t('common.export')}
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
                          try {
                            localStorage.setItem(notificationKey, JSON.stringify(next));
                            setNotifications(next);
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
                            try {
                              localStorage.setItem(notificationKey, JSON.stringify(next));
                              setNotifications(next);
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
              <button type="button" className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 flex items-center justify-center" onClick={() => goTo('/settings')}>
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
                  <button type="button" className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => goTo('/settings')}>
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
        <main className="flex-1 p-5 bg-gray-50 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
        {subscriptionLock.locked && String(location.pathname || '') !== '/plans' ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative w-[94vw] max-w-[520px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{t('lock.title')}</div>
                  <div className="mt-1 text-xs text-gray-600">{subscriptionLock.reason ? t(subscriptionLock.reason) : t('lock.title')}</div>
                </div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                  onClick={onLogout}
                >
                  {t('lock.close')}
                </button>
              </div>
              <div className="p-5">
                <div className="text-sm text-gray-700">{t('lock.body')}</div>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                    onClick={onLogout}
                  >
                    {t('lock.close')}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                    onClick={() => goTo('/plans')}
                  >
                    {t('lock.choosePlan')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
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
