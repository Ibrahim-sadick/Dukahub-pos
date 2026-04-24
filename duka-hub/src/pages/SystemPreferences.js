import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { RiLock2Line } from 'react-icons/ri';
import { accountApi } from '../services/accountApi';
import { businessApi } from '../services/businessApi';
import { settingsApi } from '../services/settingsApi';
import { withMinimumDelay } from '../utils/loadingDelay';

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
    void safeJsonParse;
    try {
      const raw = window.localStorage.getItem(String(key || ''));
      if (raw == null) return fallback;
      return safeJsonParse(raw, fallback);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    void safeJsonParse;
    try {
      window.localStorage.setItem(String(key || ''), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
};

const getCurrentUser = () => {
  return authApi.getCurrentUserSync ? authApi.getCurrentUserSync() : null;
};

const Toggle = ({ label, description, checked, onChange, danger, disabled, tooltip }) => {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className={danger ? 'text-base font-semibold text-red-700' : 'text-base font-semibold text-gray-900'} title={tooltip || ''}>
            {label}
          </div>
          {tooltip ? (
            <div
              className={danger ? 'w-5 h-5 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-extrabold flex items-center justify-center' : 'w-5 h-5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-xs font-extrabold flex items-center justify-center'}
              title={tooltip}
            >
              ?
            </div>
          ) : null}
        </div>
        {description ? <div className="mt-2 text-sm text-gray-600">{description}</div> : null}
      </div>
      <button
        type="button"
        data-no-loading="true"
        disabled={disabled}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={
          disabled
            ? 'relative w-14 h-8 rounded-full bg-gray-200 border border-gray-200 opacity-60 cursor-not-allowed transition duration-200'
            : checked
              ? danger
                ? 'relative w-14 h-8 rounded-full bg-red-600 border border-red-600 transition duration-200'
                : 'relative w-14 h-8 rounded-full bg-green-600 border border-green-600 transition duration-200'
              : danger
                ? 'relative w-14 h-8 rounded-full bg-red-50 border border-red-200 transition duration-200'
                : 'relative w-14 h-8 rounded-full bg-gray-100 border border-gray-200 transition duration-200'
        }
      >
        <span
          className={
            checked
              ? 'absolute top-0.5 left-0.5 w-7 h-7 rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-6'
              : 'absolute top-0.5 left-0.5 w-7 h-7 rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-0'
          }
        />
      </button>
    </div>
  );
};

const SelectRow = ({ label, description, value, onChange, options, tooltip }) => {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold text-gray-900" title={tooltip || ''}>
            {label}
          </div>
          {tooltip ? (
            <div className="w-5 h-5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-xs font-extrabold flex items-center justify-center" title={tooltip}>
              ?
            </div>
          ) : null}
        </div>
        {description ? <div className="mt-2 text-sm text-gray-600">{description}</div> : null}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-[420px] px-4 py-3 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const Card = ({ title, subtitle, children, danger }) => {
  return (
    <div className={danger ? 'bg-white border border-red-200 rounded-2xl shadow-sm' : 'bg-white border border-gray-200 rounded-2xl shadow-sm'}>
      <div className={danger ? 'px-6 py-5 border-b border-red-100' : 'px-6 py-5 border-b border-gray-100'}>
        <div className={danger ? 'text-base font-semibold text-red-800' : 'text-base font-semibold text-gray-900'}>{title}</div>
        {subtitle ? <div className="mt-2 text-sm text-gray-600">{subtitle}</div> : null}
      </div>
      <div className="px-6 py-5 space-y-6">{children}</div>
    </div>
  );
};

const ThemeCard = ({ title, active, onClick, mode }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'w-full text-left p-4 rounded-2xl border border-green-400 bg-green-50 shadow-sm transition duration-200'
          : 'w-full text-left p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition duration-200'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-semibold text-gray-900">{title}</div>
        {active ? <div className="px-2 py-1 rounded-full bg-green-600 text-white text-xs font-semibold">Selected</div> : null}
      </div>
      <div className="mt-2 text-sm text-gray-600">
        {mode === 'light' ? 'Bright, minimal UI for daylight.' : mode === 'dark' ? 'High-contrast UI for low light.' : 'Match your device setting.'}
      </div>
      <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden">
        <div className={mode === 'dark' ? 'h-20 bg-gray-900' : 'h-20 bg-white'}>
          <div className="p-3">
            <div className={mode === 'dark' ? 'h-2.5 w-24 rounded bg-white/20' : 'h-2.5 w-24 rounded bg-gray-200'} />
            <div className="mt-2 flex items-center gap-2">
              <div className={mode === 'dark' ? 'h-7 w-7 rounded-full bg-white/15' : 'h-7 w-7 rounded-full bg-gray-200'} />
              <div className="flex-1 space-y-1">
                <div className={mode === 'dark' ? 'h-2 w-28 rounded bg-white/15' : 'h-2 w-28 rounded bg-gray-200'} />
                <div className={mode === 'dark' ? 'h-2 w-20 rounded bg-white/10' : 'h-2 w-20 rounded bg-gray-100'} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default function SystemPreferences({ initialTab } = {}) {
  const { t } = useI18n();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [companyInfo, setCompanyInfo] = useState(() => localStore.get('companyInfo', {}));
  const businessId = useMemo(() => {
    const role = String(currentUser?.role || '').toLowerCase();
    if (role === 'staff') return String(currentUser?.businessId || '');
    return String(currentUser?.id || '');
  }, [currentUser?.businessId, currentUser?.id, currentUser?.role]);

  const storageKey = useMemo(() => `systemPreferences:${businessId || 'default'}`, [businessId]);
  const profileInfoKey = useMemo(() => `profileInfo:${businessId || 'default'}`, [businessId]);

  const defaultPrefs = useMemo(
    () => ({
      general: {
        timezone: 'Africa/Dar_es_Salaam',
        dateFormat: 'DD/MM/YYYY',
        enableMultiStore: false
      },
      sales: {
        enableTax: true,
        defaultTaxRate: '18',
        allowDiscounts: true,
        requireApprovalForRefund: true,
        autoPrintReceipt: true,
        autoSendSmsReceipt: false,
        allowNegativeStock: false
      },
      inventory: {
        enableLowStockAlerts: true,
        defaultReorderLevel: '10',
        trackExpiryDates: false,
        trackBatchNumbers: false,
        autoDeductStockOnSale: true
      },
      notifications: {
        sendLowStockSms: false,
        sendDailySalesReport: false,
        notifyNewSale: true,
        notifyNewPurchase: true,
        sendEmailAlerts: true,
        sendWhatsAppAlerts: false
      },
      localization: {
        language: 'en',
        numberFormat: '1,234.56',
        decimalPlaces: '2',
        currencySymbolPosition: 'before'
      },
      appearance: {
        themeMode: 'system'
      },
      security: {
        sessionTimeout: '30',
        requirePinForDelete: true,
        requirePinForRefund: true,
        enableTwoFactorAuthentication: false
      }
    }),
    []
  );

  const [tab, setTab] = useState('profile');
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(defaultPrefs));
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [saveLoading, setSaveLoading] = useState(false);
  const [integrationsConnected, setIntegrationsConnected] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [businessLogo, setBusinessLogo] = useState('');
  const [profileDraft, setProfileDraft] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: '',
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    poBox: '',
    fax: '',
    address: '',
    tin: ''
  });
  const [cropper, setCropper] = useState({ open: false, src: '', zoom: 1.2, offsetX: 0, offsetY: 0 });
  const [cropperImage, setCropperImage] = useState(null);
  const cropCanvasRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const cropUi = useMemo(() => ({ canvasSize: 260, maskSize: 210 }), []);

  useEffect(() => {
    setIntegrationsConnected(false);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const parsed = await settingsApi.get(defaultPrefs);
        if (!alive) return;
        const merged = {
          ...defaultPrefs,
          ...(parsed && typeof parsed === 'object' ? parsed : {})
        };
        setPrefs(merged);
        setSavedSnapshot(JSON.stringify(merged));
      })
      .catch(() => {
        setPrefs(defaultPrefs);
        setSavedSnapshot(JSON.stringify(defaultPrefs));
      });
    return () => {
      alive = false;
    };
  }, [defaultPrefs, storageKey]);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const nextCompanyInfo = await businessApi.get();
        if (!alive) return;
        setCompanyInfo(nextCompanyInfo && typeof nextCompanyInfo === 'object' ? nextCompanyInfo : {});
      })
      .catch(() => {
        if (!alive) return;
        setCompanyInfo(localStore.get('companyInfo', {}));
      });
    return () => {
      alive = false;
    };
  }, [currentUser?.businessId]);

  useEffect(() => {
    const next = String(initialTab || '').trim();
    if (!next) return;
    const allowed = new Set(['profile', 'general', 'sales', 'inventory', 'notifications', 'localization', 'appearance', 'security']);
    if (!allowed.has(next)) return;
    setTab(next);
  }, [initialTab]);

  useEffect(() => {
    const params = new URLSearchParams(String(location.search || ''));
    const next = String(params.get('tab') || '').trim();
    if (!next) return;
    const allowed = new Set(['profile', 'general', 'sales', 'inventory', 'notifications', 'localization', 'appearance', 'security']);
    if (!allowed.has(next)) return;
    setTab(next);
  }, [location.search]);

  useEffect(() => {
    if (!currentUser) return;
    if (profileEdit) return;
    try {
      const stored = localStore.get(profileInfoKey, {}) || {};
      const fullName = String(stored?.fullName || currentUser?.fullName || currentUser?.name || currentUser?.username || '').trim();
      const phone = String(stored?.phone || currentUser?.phone || '').trim();
      const email = String(stored?.email || currentUser?.email || '').trim();
      const companyName = String(stored?.businessName || companyInfo?.companyName || companyInfo?.name || currentUser?.businessName || '').trim();
      const businessPhone = String(stored?.businessPhone || companyInfo?.phone || '').trim();
      const businessEmail = String(stored?.businessEmail || companyInfo?.email || '').trim();
      const poBox = String(stored?.poBox || companyInfo?.poBox || '').trim();
      const fax = String(stored?.fax || companyInfo?.fax || '').trim();
      const address = String(stored?.address || companyInfo?.location || '').trim();
      const tin = String(stored?.tin || companyInfo?.tin || companyInfo?.taxId || '').trim();
      const city = String((() => {
        const loc = String(stored?.city || '').trim() || String(companyInfo?.location || '').trim();
        if (!loc) return '';
        return loc.split(',')[0].trim();
      })()).trim();
      setProfileDraft({
        fullName,
        phone,
        email,
        city,
        businessName: companyName,
        businessPhone,
        businessEmail,
        poBox,
        fax,
        address,
        tin
      });
      setProfilePhoto(String(stored?.profilePhoto || currentUser?.profilePhoto || '').trim());
      setBusinessLogo(String(stored?.businessLogo || companyInfo?.logo || '').trim());
    } catch {}
  }, [companyInfo, currentUser, profileEdit, profileInfoKey]);

  useEffect(() => {
    const onUpdate = () => {
      try {
        setCurrentUser(getCurrentUser());
      } catch {}
    };
    window.addEventListener('storage', onUpdate);
    window.addEventListener('dataUpdated', onUpdate);
    window.addEventListener('companyInfoUpdated', onUpdate);
    return () => {
      window.removeEventListener('storage', onUpdate);
      window.removeEventListener('dataUpdated', onUpdate);
      window.removeEventListener('companyInfoUpdated', onUpdate);
    };
  }, []);

  const dirty = useMemo(() => JSON.stringify(prefs) !== savedSnapshot, [prefs, savedSnapshot]);

  const update = (path, value) => {
    setPrefs((prev) => {
      const next = { ...prev };
      const [a, b] = path.split('.');
      next[a] = { ...(next[a] || {}) };
      next[a][b] = value;
      return next;
    });
    if (path === 'localization.language') {
      try {
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: value } }));
      } catch {}
    }
  };

  const saveNow = async () => {
    const saved = await settingsApi.update(prefs);
    const merged = {
      ...defaultPrefs,
      ...(saved && typeof saved === 'object' ? saved : {})
    };
    setPrefs(merged);
    setSavedSnapshot(JSON.stringify(merged));
    setToast(t('prefs.toastSaved'));
    setTimeout(() => setToast(''), 2000);
  };
  const save = async () => {
    if (!dirty || saveLoading) return;
    setSaveLoading(true);
    try {
      await withMinimumDelay(() => saveNow(), 7000);
    } finally {
      setSaveLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: t('top.profile') },
    { id: 'general', label: t('prefs.tab.general') },
    { id: 'sales', label: t('prefs.tab.sales') },
    { id: 'inventory', label: t('prefs.tab.inventory') },
    { id: 'notifications', label: t('prefs.tab.notifications') },
    { id: 'localization', label: t('prefs.tab.localization') },
    { id: 'appearance', label: t('prefs.tab.appearance') },
    { id: 'security', label: t('prefs.tab.security') }
  ];

  const initials = (() => {
    const full = String(profileDraft.fullName || '').trim();
    if (!full) return 'U';
    const parts = full.split(/\s+/).filter(Boolean);
    return parts.map((p) => String(p || '').slice(0, 1)).join('').slice(0, 2).toUpperCase() || 'U';
  })();

  const planLabel = (() => {
    const status = String(currentUser?.subscriptionPaymentStatus || '').trim().toLowerCase();
    const plan = String(currentUser?.subscriptionPlan || '').trim();
    const planName = plan ? plan.replace(/\b\w/g, (m) => m.toUpperCase()) : 'Plan';
    if (status === 'paid' || status === 'trial') return `Active - ${planName}`;
    if (status) return `${status.replace(/\b\w/g, (m) => m.toUpperCase())} - ${planName}`;
    return `Active - ${planName}`;
  })();

  const writeCurrentUser = (nextUser) => {
    const payload = nextUser && typeof nextUser === 'object' ? nextUser : null;
    try {
      window.localStorage.setItem('currentUser', JSON.stringify(payload));
    } catch {}
  };

  const saveProfile = async () => {
    if (profileSaving) return;
    setProfileSaving(true);
    try {
      await withMinimumDelay(async () => {
        const nextUser = await accountApi.updateCurrentUser({
          fullName: String(profileDraft.fullName || '').trim(),
          phone: String(profileDraft.phone || '').trim(),
          email: String(profileDraft.email || '').trim(),
          profilePhoto: String(profilePhoto || '').trim()
        });
        writeCurrentUser(nextUser);
        setCurrentUser(nextUser);

        const nextCompany = await businessApi.update({
          ...companyInfo,
          companyName: String(profileDraft.businessName || companyInfo?.companyName || companyInfo?.name || '').trim(),
          phone: String(profileDraft.businessPhone || companyInfo?.phone || '').trim(),
          email: String(profileDraft.businessEmail || companyInfo?.email || '').trim(),
          poBox: String(profileDraft.poBox || companyInfo?.poBox || '').trim(),
          fax: String(profileDraft.fax || companyInfo?.fax || '').trim(),
          location: String(profileDraft.address || companyInfo?.location || '').trim(),
          tin: String(profileDraft.tin || companyInfo?.tin || companyInfo?.taxId || '').trim(),
          taxId: String(profileDraft.tin || companyInfo?.taxId || '').trim(),
          logo: String(businessLogo || companyInfo?.logo || '').trim()
        });
        setCompanyInfo(nextCompany);
      }, 7000);

      try {
        const nextProfile = {
          fullName: String(profileDraft.fullName || '').trim(),
          phone: String(profileDraft.phone || '').trim(),
          email: String(profileDraft.email || '').trim(),
          city: String(profileDraft.city || '').trim(),
          businessName: String(profileDraft.businessName || '').trim(),
          businessPhone: String(profileDraft.businessPhone || '').trim(),
          businessEmail: String(profileDraft.businessEmail || '').trim(),
          poBox: String(profileDraft.poBox || '').trim(),
          fax: String(profileDraft.fax || '').trim(),
          address: String(profileDraft.address || '').trim(),
          tin: String(profileDraft.tin || '').trim(),
          profilePhoto: String(profilePhoto || '').trim(),
          businessLogo: String(businessLogo || '').trim()
        };
        localStore.set(profileInfoKey, nextProfile, { silent: true });
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}
      setProfileEdit(false);
      setToast(t('prefs.toastSaved'));
      setTimeout(() => setToast(''), 2000);
    } finally {
      setProfileSaving(false);
    }
  };

  const openCropper = (dataUrl) => {
    const src = String(dataUrl || '').trim();
    if (!src) return;
    setCropper({ open: true, src, zoom: 1.2, offsetX: 0, offsetY: 0 });
    const img = new Image();
    img.onload = () => setCropperImage(img);
    img.src = src;
  };

  const pickPhoto = (file) => {
    const f = file instanceof File ? file : null;
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '').trim();
      if (!src) return;
      openCropper(src);
    };
    reader.readAsDataURL(f);
  };

  const closeCropper = () => {
    setCropper({ open: false, src: '', zoom: 1.2, offsetX: 0, offsetY: 0 });
    setCropperImage(null);
    try {
      dragRef.current.dragging = false;
    } catch {}
  };

  const drawCropPreview = useRef(() => {});
  drawCropPreview.current = () => {
    const canvas = cropCanvasRef.current;
    const img = cropperImage;
    if (!canvas || !img || !cropper.open) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    const baseScale = Math.max(size / img.width, size / img.height);
    const scale = baseScale * Number(cropper.zoom || 1);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = size / 2 - dw / 2 + Number(cropper.offsetX || 0);
    const dy = size / 2 - dh / 2 + Number(cropper.offsetY || 0);
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  useEffect(() => {
    drawCropPreview.current();
  }, [cropper.open, cropper.offsetX, cropper.offsetY, cropper.zoom, cropperImage]);

  const applyCrop = () => {
    const img = cropperImage;
    if (!img) return;
    const outSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, outSize, outSize);
    ctx.save();
    ctx.beginPath();
    ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const baseScale = Math.max(outSize / img.width, outSize / img.height);
    const scale = baseScale * Number(cropper.zoom || 1);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = outSize / 2 - dw / 2 + Number(cropper.offsetX || 0) * (outSize / Number(cropUi.canvasSize || 260));
    const dy = outSize / 2 - dh / 2 + Number(cropper.offsetY || 0) * (outSize / Number(cropUi.canvasSize || 260));
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setProfilePhoto(dataUrl);
    } catch {}
    closeCropper();
  };

  if (!currentUser) {
    return <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-700">{t('prefs.loginRequired')}</div>;
  }

  return (
    <div className="w-full">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-gray-900">{t('prefs.headerTitle')}</div>
              <div className="mt-1 text-sm text-gray-600">{t('prefs.headerSubtitle')}</div>
            </div>
            {integrationsConnected ? (
              <div className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-600" />
                {t('prefs.connected')}
              </div>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="border-b lg:border-b-0 lg:border-r border-gray-200 bg-white flex flex-col">
            <div className="px-3 py-5 flex-1 overflow-y-auto">
              <div className="space-y-1">
                {tabs.map((t) => {
                  const active = tab === t.id;
                  const lockedTab = false;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      data-no-loading="true"
                      onClick={() => {
                        setTab(t.id);
                      }}
                      className={
                        lockedTab
                          ? 'w-full text-left px-4 py-2.5 rounded-xl text-gray-400 border border-transparent cursor-not-allowed opacity-60 flex items-center justify-between'
                          : active
                          ? 'w-full text-left px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-800 font-semibold transition duration-200'
                          : 'w-full text-left px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition duration-200'
                      }
                    >
                      <span>{t.label}</span>
                      {lockedTab ? <RiLock2Line size={16} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-white">
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saveLoading}
                className={
                  dirty && !saveLoading
                    ? 'w-full px-6 py-3 rounded-2xl bg-green-600 text-white text-base font-semibold shadow-sm hover:bg-green-700 transition duration-200 inline-flex items-center justify-center gap-2'
                    : dirty && saveLoading
                      ? 'w-full px-6 py-3 rounded-2xl bg-green-600/70 text-white text-base font-semibold cursor-not-allowed transition duration-200 inline-flex items-center justify-center gap-2'
                    : 'w-full px-6 py-3 rounded-2xl bg-gray-200 text-gray-500 text-base font-semibold cursor-not-allowed transition duration-200'
                }
              >
                <span>{t('prefs.saveChanges')}</span>
              </button>
            </div>
          </div>

          <div className="bg-gray-50">
            <div className="p-8">
              {tab === 'profile' ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-500 flex items-center justify-center text-green-700 font-extrabold text-xl">
                              {profilePhoto ? <img src={profilePhoto} alt="" className="w-full h-full object-cover rounded-full" /> : initials}
                            </div>
                            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-600 border-2 border-white" />
                            {profileEdit ? (
                              <label className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center cursor-pointer">
                                <span className="text-green-700 font-extrabold text-xs">✎</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e?.target?.files?.[0] || null;
                                    if (!f) return;
                                    pickPhoto(f);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <div className="text-lg font-extrabold text-gray-900 truncate">{profileDraft.fullName || '—'}</div>
                            <div className="mt-1 text-sm text-gray-600">
                              {(profileDraft.businessName || '—')}{profileDraft.address ? ` - ${profileDraft.address}` : ''}
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              {planLabel}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50"
                            onClick={() => setProfileEdit((v) => !v)}
                            disabled={profileSaving}
                          >
                            {profileEdit ? 'Cancel' : 'Edit profile'}
                          </button>
                          {profileEdit ? (
                            <button
                              type="button"
                              className={profileSaving ? 'px-4 py-2 rounded-xl bg-green-600/70 text-white font-semibold cursor-not-allowed inline-flex items-center gap-2' : 'px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 inline-flex items-center gap-2'}
                              onClick={saveProfile}
                              disabled={profileSaving}
                            >
                              <span>Save Changes</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200 text-xs font-extrabold tracking-widest text-gray-500">PERSONAL</div>
                      <div className="divide-y divide-gray-100">
                        {[
                          { k: 'Full name', field: 'fullName' },
                          { k: 'Phone', field: 'phone' },
                          { k: 'Email', field: 'email' },
                          { k: 'City', field: 'city' }
                        ].map((r) => (
                          <div key={r.k} className="px-6 py-4 flex items-center justify-between gap-6">
                            <div className="text-sm text-gray-600">{r.k}</div>
                            <div className="text-sm font-semibold text-gray-900 text-right min-w-[220px]">
                              {profileEdit ? (
                                <input
                                  value={profileDraft[r.field] || ''}
                                  onChange={(e) => setProfileDraft((p) => ({ ...p, [r.field]: e.target.value }))}
                                  className="w-full max-w-[360px] px-3 py-2 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                  placeholder={r.field === 'phone' ? '+255 7XX XXX XXX' : ''}
                                />
                              ) : (
                                <span>{String(profileDraft[r.field] || '—')}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200 text-xs font-extrabold tracking-widest text-gray-500">BUSINESS</div>
                      <div className="divide-y divide-gray-100">
                        <div className="px-6 py-4 flex items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-500 overflow-hidden flex items-center justify-center">
                              {businessLogo ? <img src={businessLogo} alt="" className="w-full h-full object-cover rounded-full" /> : <div className="w-7 h-7 rounded bg-gray-200" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900">Business logo</div>
                              <div className="text-xs text-gray-600">Logo used on invoices</div>
                            </div>
                          </div>
                          {profileEdit ? (
                            <label className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 cursor-pointer">
                              Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e?.target?.files?.[0] || null;
                                  if (!f) return;
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    const src = String(reader.result || '').trim();
                                    if (!src) return;
                                    setBusinessLogo(src);
                                  };
                                  reader.readAsDataURL(f);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          ) : null}
                        </div>
                        {[
                          { k: 'Business name', field: 'businessName' },
                          { k: 'Business phone', field: 'businessPhone' },
                          { k: 'Business email', field: 'businessEmail', placeholder: 'Not set' },
                          { k: 'P.O. Box', field: 'poBox', placeholder: 'Not set' },
                          { k: 'Fax', field: 'fax', placeholder: 'Not set' },
                          { k: 'Address', field: 'address' },
                          { k: 'TIN number', field: 'tin', placeholder: 'Not set' }
                        ].map((r) => (
                          <div key={r.k} className="px-6 py-4 flex items-center justify-between gap-6">
                            <div className="text-sm text-gray-600">{r.k}</div>
                            <div className="text-sm font-semibold text-gray-900 text-right min-w-[220px]">
                              {profileEdit ? (
                                <input
                                  value={profileDraft[r.field] || ''}
                                  onChange={(e) => setProfileDraft((p) => ({ ...p, [r.field]: e.target.value }))}
                                  className="w-full max-w-[360px] px-3 py-2 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                  placeholder={r.placeholder || ''}
                                />
                              ) : (
                                <span>{String(profileDraft[r.field] || r.placeholder || '—')}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {cropper.open ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                      <button type="button" className="absolute inset-0 bg-transparent" onClick={closeCropper} />
                      <div className="relative w-full max-w-[420px] rounded-3xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-lg font-extrabold text-gray-900">Crop photo</div>
                              <div className="mt-1 text-sm text-gray-600">Drag to reposition and use zoom for a good view.</div>
                            </div>
                            <button type="button" className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200 hover:bg-gray-100 font-extrabold text-gray-700" onClick={closeCropper}>
                              ×
                            </button>
                          </div>

                          <div className="mt-5 flex items-center justify-center">
                            <div className="relative w-[260px] h-[260px] rounded-2xl border border-gray-200 bg-white overflow-hidden">
                              <canvas
                                ref={cropCanvasRef}
                                width={cropUi.canvasSize}
                                height={cropUi.canvasSize}
                                className="w-[260px] h-[260px] touch-none"
                                onPointerDown={(e) => {
                                  if (!cropper.open) return;
                                  try {
                                    e.currentTarget.setPointerCapture(e.pointerId);
                                  } catch {}
                                  dragRef.current.dragging = true;
                                  dragRef.current.startX = e.clientX;
                                  dragRef.current.startY = e.clientY;
                                  dragRef.current.baseX = Number(cropper.offsetX || 0);
                                  dragRef.current.baseY = Number(cropper.offsetY || 0);
                                }}
                                onPointerMove={(e) => {
                                  if (!dragRef.current.dragging) return;
                                  const dx = e.clientX - dragRef.current.startX;
                                  const dy = e.clientY - dragRef.current.startY;
                                  setCropper((p) => ({ ...p, offsetX: dragRef.current.baseX + dx, offsetY: dragRef.current.baseY + dy }));
                                }}
                                onPointerUp={() => {
                                  dragRef.current.dragging = false;
                                }}
                                onPointerCancel={() => {
                                  dragRef.current.dragging = false;
                                }}
                              />
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="rounded-full border-2 border-white" style={{ width: cropUi.maskSize, height: cropUi.maskSize }} />
                              </div>
                            </div>
                          </div>

                          <div className="mt-5">
                            <div className="text-sm font-semibold text-gray-900">Zoom</div>
                            <input
                              type="range"
                              min="1"
                              max="3"
                              step="0.01"
                              value={Number(cropper.zoom || 1)}
                              onChange={(e) => setCropper((p) => ({ ...p, zoom: Number(e.target.value) }))}
                              className="mt-2 w-full"
                            />
                          </div>

                          <div className="mt-6 flex items-center justify-end gap-3">
                            <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 font-semibold hover:bg-gray-50" onClick={closeCropper}>
                              Cancel
                            </button>
                            <button type="button" className="px-5 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700" onClick={applyCrop}>
                              Use photo
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {tab === 'general' ? (
                <div className="space-y-6">
                  <Card title={t('prefs.card.defaults.title')} subtitle={t('prefs.card.defaults.subtitle')}>
                    <SelectRow
                      label={t('prefs.general.timezone.label')}
                      description={t('prefs.general.timezone.desc')}
                      value={prefs.general.timezone}
                      onChange={(v) => update('general.timezone', v)}
                      options={[
                        { value: 'Africa/Dar_es_Salaam', label: 'Africa/Dar es Salaam' },
                        { value: 'Africa/Nairobi', label: 'Africa/Nairobi' },
                        { value: 'UTC', label: 'UTC' }
                      ]}
                    />
                    <SelectRow
                      label={t('prefs.general.dateFormat.label')}
                      description={t('prefs.general.dateFormat.desc')}
                      value={prefs.general.dateFormat}
                      onChange={(v) => update('general.dateFormat', v)}
                      options={[
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
                      ]}
                    />
                  </Card>

                  <Card title={t('prefs.card.operations.title')} subtitle={t('prefs.card.operations.subtitle')}>
                    <Toggle
                      label={t('prefs.general.enableMultiStore.label')}
                      description={t('prefs.general.enableMultiStore.desc')}
                      checked={Boolean(prefs.general.enableMultiStore)}
                      onChange={(v) => update('general.enableMultiStore', Boolean(v))}
                      tooltip={t('prefs.general.enableMultiStore.tip')}
                    />
                  </Card>
                </div>
              ) : null}

              {tab === 'sales' ? (
                <div className="space-y-6">
                  <Card title={t('prefs.card.taxPricing.title')} subtitle={t('prefs.card.taxPricing.subtitle')}>
                    <Toggle
                      label={t('prefs.sales.enableTax.label')}
                      description={t('prefs.sales.enableTax.desc')}
                      checked={Boolean(prefs.sales.enableTax)}
                      onChange={(v) => update('sales.enableTax', Boolean(v))}
                    />
                    <SelectRow
                      label={t('prefs.sales.defaultTaxRate.label')}
                      description={t('prefs.sales.defaultTaxRate.desc')}
                      value={prefs.sales.defaultTaxRate}
                      onChange={(v) => update('sales.defaultTaxRate', v)}
                      options={[
                        { value: '0', label: '0%' },
                        { value: '5', label: '5%' },
                        { value: '10', label: '10%' },
                        { value: '18', label: '18% (VAT)' }
                      ]}
                      tooltip={t('prefs.sales.defaultTaxRate.tip')}
                    />
                    <Toggle
                      label={t('prefs.sales.allowDiscounts.label')}
                      description={t('prefs.sales.allowDiscounts.desc')}
                      checked={Boolean(prefs.sales.allowDiscounts)}
                      onChange={(v) => update('sales.allowDiscounts', Boolean(v))}
                    />
                    <Toggle
                      label={t('prefs.sales.requireApprovalForRefund.label')}
                      description={t('prefs.sales.requireApprovalForRefund.desc')}
                      checked={Boolean(prefs.sales.requireApprovalForRefund)}
                      onChange={(v) => update('sales.requireApprovalForRefund', Boolean(v))}
                      tooltip={t('prefs.sales.requireApprovalForRefund.tip')}
                    />
                  </Card>

                  <Card title={t('prefs.card.automation.title')} subtitle={t('prefs.card.automation.subtitle')}>
                    <Toggle
                      label={t('prefs.sales.autoPrintReceipt.label')}
                      description={t('prefs.sales.autoPrintReceipt.desc')}
                      checked={Boolean(prefs.sales.autoPrintReceipt)}
                      onChange={(v) => update('sales.autoPrintReceipt', Boolean(v))}
                    />
                    <Toggle
                      label={t('prefs.sales.autoSendSmsReceipt.label')}
                      description={t('prefs.sales.autoSendSmsReceipt.desc')}
                      checked={Boolean(prefs.sales.autoSendSmsReceipt)}
                      onChange={(v) => update('sales.autoSendSmsReceipt', Boolean(v))}
                      tooltip={t('prefs.sales.autoSendSmsReceipt.tip')}
                    />
                    <Toggle
                      label={t('prefs.sales.allowNegativeStock.label')}
                      description={t('prefs.sales.allowNegativeStock.desc')}
                      checked={Boolean(prefs.sales.allowNegativeStock)}
                      danger
                      tooltip={t('prefs.sales.allowNegativeStock.tip')}
                      onChange={(v) => {
                        const next = Boolean(v);
                        if (next) {
                          setConfirm({
                            open: true,
                            title: t('prefs.sales.allowNegativeStock.confirmTitle'),
                            message: t('prefs.sales.allowNegativeStock.confirmMsg'),
                            onConfirm: () => {
                              update('sales.allowNegativeStock', true);
                              setConfirm({ open: false, title: '', message: '', onConfirm: null });
                            }
                          });
                          return;
                        }
                        update('sales.allowNegativeStock', false);
                      }}
                    />
                  </Card>
                </div>
              ) : null}

              {tab === 'inventory' ? (
                <div className="space-y-6">
                  <Card title={t('prefs.card.stockTracking.title')} subtitle={t('prefs.card.stockTracking.subtitle')}>
                    <Toggle
                      label={t('prefs.inventory.enableLowStockAlerts.label')}
                      description={t('prefs.inventory.enableLowStockAlerts.desc')}
                      checked={Boolean(prefs.inventory.enableLowStockAlerts)}
                      onChange={(v) => update('inventory.enableLowStockAlerts', Boolean(v))}
                    />
                    <SelectRow
                      label={t('prefs.inventory.defaultReorderLevel.label')}
                      description={t('prefs.inventory.defaultReorderLevel.desc')}
                      value={prefs.inventory.defaultReorderLevel}
                      onChange={(v) => update('inventory.defaultReorderLevel', v)}
                      options={[
                        { value: '5', label: t('prefs.inventory.defaultReorderLevel.opt5') },
                        { value: '10', label: t('prefs.inventory.defaultReorderLevel.opt10') },
                        { value: '25', label: t('prefs.inventory.defaultReorderLevel.opt25') },
                        { value: '50', label: t('prefs.inventory.defaultReorderLevel.opt50') }
                      ]}
                    />
                    <Toggle
                      label={t('prefs.inventory.trackExpiryDates.label')}
                      description={t('prefs.inventory.trackExpiryDates.desc')}
                      checked={Boolean(prefs.inventory.trackExpiryDates)}
                      onChange={(v) => update('inventory.trackExpiryDates', Boolean(v))}
                      tooltip={t('prefs.inventory.trackExpiryDates.tip')}
                    />
                    <Toggle
                      label={t('prefs.inventory.trackBatchNumbers.label')}
                      description={t('prefs.inventory.trackBatchNumbers.desc')}
                      checked={Boolean(prefs.inventory.trackBatchNumbers)}
                      onChange={(v) => update('inventory.trackBatchNumbers', Boolean(v))}
                      tooltip={t('prefs.inventory.trackBatchNumbers.tip')}
                    />
                  </Card>

                  <Card title={t('prefs.card.automation.title')} subtitle={t('prefs.card.automation.subtitle')}>
                    <Toggle
                      label={t('prefs.inventory.autoDeductStockOnSale.label')}
                      description={t('prefs.inventory.autoDeductStockOnSale.desc')}
                      checked={Boolean(prefs.inventory.autoDeductStockOnSale)}
                      onChange={(v) => update('inventory.autoDeductStockOnSale', Boolean(v))}
                    />
                  </Card>
                </div>
              ) : null}

              {tab === 'notifications' ? (
                <div className="space-y-6">
                  <Card title={t('prefs.card.alerts.title')} subtitle={t('prefs.card.alerts.subtitle')}>
                    <Toggle
                      label={t('prefs.notifications.sendLowStockSms.label')}
                      description={t('prefs.notifications.sendLowStockSms.desc')}
                      checked={Boolean(prefs.notifications.sendLowStockSms)}
                      onChange={(v) => update('notifications.sendLowStockSms', Boolean(v))}
                      tooltip={t('prefs.notifications.sendLowStockSms.tip')}
                    />
                    <Toggle
                      label={t('prefs.notifications.sendDailySalesReport.label')}
                      description={t('prefs.notifications.sendDailySalesReport.desc')}
                      checked={Boolean(prefs.notifications.sendDailySalesReport)}
                      onChange={(v) => update('notifications.sendDailySalesReport', Boolean(v))}
                    />
                    <Toggle
                      label={t('prefs.notifications.notifyNewSale.label')}
                      description={t('prefs.notifications.notifyNewSale.desc')}
                      checked={Boolean(prefs.notifications.notifyNewSale)}
                      onChange={(v) => update('notifications.notifyNewSale', Boolean(v))}
                    />
                    <Toggle
                      label={t('prefs.notifications.notifyNewPurchase.label')}
                      description={t('prefs.notifications.notifyNewPurchase.desc')}
                      checked={Boolean(prefs.notifications.notifyNewPurchase)}
                      onChange={(v) => update('notifications.notifyNewPurchase', Boolean(v))}
                    />
                    <Toggle
                      label={t('prefs.notifications.sendEmailAlerts.label')}
                      description={t('prefs.notifications.sendEmailAlerts.desc')}
                      checked={Boolean(prefs.notifications.sendEmailAlerts)}
                      onChange={(v) => update('notifications.sendEmailAlerts', Boolean(v))}
                    />
                    <Toggle
                      label={t('prefs.notifications.sendWhatsAppAlerts.label')}
                      description={t('prefs.notifications.sendWhatsAppAlerts.desc')}
                      checked={Boolean(prefs.notifications.sendWhatsAppAlerts)}
                      onChange={(v) => update('notifications.sendWhatsAppAlerts', Boolean(v))}
                      tooltip={t('prefs.notifications.sendWhatsAppAlerts.tip')}
                    />
                  </Card>
                </div>
              ) : null}

              {tab === 'localization' ? (
                <div className="space-y-6">
                  <Card title={t('prefs.card.localization.title')} subtitle={t('prefs.card.localization.subtitle')}>
                    <SelectRow
                      label={t('prefs.localization.language.label')}
                      description={t('prefs.localization.language.desc')}
                      value={prefs.localization.language}
                      onChange={(v) => update('localization.language', v)}
                      options={[
                        { value: 'sw', label: 'Kiswahili' },
                        { value: 'en', label: 'English' }
                      ]}
                    />
                    <SelectRow
                      label={t('prefs.localization.numberFormat.label')}
                      description={t('prefs.localization.numberFormat.desc')}
                      value={prefs.localization.numberFormat}
                      onChange={(v) => update('localization.numberFormat', v)}
                      options={[
                        { value: '1,234.56', label: '1,234.56' },
                        { value: '1.234,56', label: '1.234,56' },
                        { value: '1234.56', label: '1234.56' }
                      ]}
                    />
                    <SelectRow
                      label={t('prefs.localization.decimalPlaces.label')}
                      description={t('prefs.localization.decimalPlaces.desc')}
                      value={prefs.localization.decimalPlaces}
                      onChange={(v) => update('localization.decimalPlaces', v)}
                      options={[
                        { value: '0', label: '0' },
                        { value: '2', label: '2' },
                        { value: '3', label: '3' }
                      ]}
                    />
                    <SelectRow
                      label={t('prefs.localization.currencySymbolPosition.label')}
                      description={t('prefs.localization.currencySymbolPosition.desc')}
                      value={prefs.localization.currencySymbolPosition}
                      onChange={(v) => update('localization.currencySymbolPosition', v)}
                      options={[
                        { value: 'before', label: t('prefs.localization.currencySymbolPosition.before') },
                        { value: 'after', label: t('prefs.localization.currencySymbolPosition.after') }
                      ]}
                    />
                  </Card>
                </div>
              ) : null}

              {tab === 'appearance' ? (
                <div className="space-y-6">
                  <Card title={t('prefs.card.appearance.title')} subtitle={t('prefs.card.appearance.subtitle')}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <ThemeCard
                        title={t('prefs.appearance.lightMode')}
                        mode="light"
                        active={prefs.appearance.themeMode === 'light'}
                        onClick={() => update('appearance.themeMode', 'light')}
                      />
                      <ThemeCard
                        title={t('prefs.appearance.darkMode')}
                        mode="dark"
                        active={prefs.appearance.themeMode === 'dark'}
                        onClick={() => update('appearance.themeMode', 'dark')}
                      />
                      <ThemeCard
                        title={t('prefs.appearance.systemMode')}
                        mode="system"
                        active={prefs.appearance.themeMode === 'system'}
                        onClick={() => update('appearance.themeMode', 'system')}
                      />
                    </div>
                  </Card>
                </div>
              ) : null}

              {tab === 'security' ? (
                <div className="space-y-6">
                  <Card title={t('prefs.card.security.title')} subtitle={t('prefs.card.security.subtitle')}>
                    <SelectRow
                      label={t('prefs.security.sessionTimeout.label')}
                      description={t('prefs.security.sessionTimeout.desc')}
                      value={prefs.security.sessionTimeout}
                      onChange={(v) => update('security.sessionTimeout', v)}
                      options={[
                        { value: '15', label: t('prefs.security.sessionTimeout.opt15') },
                        { value: '30', label: t('prefs.security.sessionTimeout.opt30') },
                        { value: '60', label: t('prefs.security.sessionTimeout.opt60') },
                        { value: '120', label: t('prefs.security.sessionTimeout.opt120') }
                      ]}
                    />
                    <Toggle
                      label={t('prefs.security.requirePinForDelete.label')}
                      description={t('prefs.security.requirePinForDelete.desc')}
                      checked={Boolean(prefs.security.requirePinForDelete)}
                      onChange={(v) => update('security.requirePinForDelete', Boolean(v))}
                      tooltip={t('prefs.common.recommended')}
                    />
                    <Toggle
                      label={t('prefs.security.requirePinForRefund.label')}
                      description={t('prefs.security.requirePinForRefund.desc')}
                      checked={Boolean(prefs.security.requirePinForRefund)}
                      onChange={(v) => update('security.requirePinForRefund', Boolean(v))}
                      tooltip={t('prefs.common.recommended')}
                    />
                    <Toggle
                      label={t('prefs.security.enableTwoFactorAuthentication.label')}
                      description={t('prefs.security.enableTwoFactorAuthentication.desc')}
                      checked={Boolean(prefs.security.enableTwoFactorAuthentication)}
                      onChange={(v) => update('security.enableTwoFactorAuthentication', Boolean(v))}
                      tooltip={t('prefs.security.enableTwoFactorAuthentication.tip')}
                    />
                  </Card>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="px-4 py-3 rounded-2xl bg-gray-900 text-white shadow-xl border border-white/10 transition duration-200">
            <div className="text-sm font-semibold">{toast}</div>
          </div>
        </div>
      ) : null}

      {confirm.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setConfirm({ open: false, title: '', message: '', onConfirm: null })} />
          <div className="relative w-[94vw] max-w-[520px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900">{confirm.title}</div>
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition duration-200"
                onClick={() => setConfirm({ open: false, title: '', message: '', onConfirm: null })}
              >
                {t('common.close')}
              </button>
            </div>
            <div className="p-5">
              <div className="text-sm text-gray-700">{confirm.message}</div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition duration-200"
                  onClick={() => setConfirm({ open: false, title: '', message: '', onConfirm: null })}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition duration-200"
                  onClick={() => {
                    const fn = confirm.onConfirm;
                    if (typeof fn === 'function') fn();
                  }}
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
