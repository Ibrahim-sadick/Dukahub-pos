import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SystemPreferences from './SystemPreferences';
import { getCurrentUserSync } from '../services/authApi';
import { accountApi } from '../services/accountApi';
import { businessApi } from '../services/businessApi';
import { salesApi } from '../services/salesApi';
import { withMinimumDelay } from '../utils/loadingDelay';

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
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
  set(key, value, options) {
    void safeJsonParse;
    const k = String(key || '');
    if (!k) return false;
    let ok = false;
    try {
      window.localStorage.setItem(k, JSON.stringify(value));
      ok = true;
      return true;
    } catch {
      return false;
    } finally {
      if (ok && !options?.silent) {
        try {
          window.dispatchEvent(new CustomEvent('dataUpdated'));
        } catch {}
      }
    }
  }
};

const getStoredJson = (key, fallback) => localStore.get(key, fallback);

const resetAllLocalData = () => {
  const exactKeys = new Set([
    'currentUser',
    'companyInfo',
    'inventoryItems',
    'sales',
    'salesOrders',
    'invoicedSales',
    'creditSales',
    'expenses',
    'purchases',
    'customers',
    'suppliers',
    'damagedStocks',
    'fixedAssets',
    'users',
    'dh_local_staff_records',
    'signupDraft',
    'signupOtpHistory',
    'dh_periodClosings',
    'systemActivity',
    'systemLogsCutoff',
    'systemLogsReadAt'
  ]);
  const prefixes = ['stockIn_', 'stockOut_', 'billingHistory:', 'production_', 'closing_'];
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k) keys.push(k);
    }
    keys.forEach((k) => {
      const key = String(k || '');
      if (exactKeys.has(key)) {
        window.localStorage.removeItem(key);
        return;
      }
      if (prefixes.some((p) => key.startsWith(p))) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {}
  try {
    window.sessionStorage.clear();
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('systemActivityUpdated'));
    window.dispatchEvent(new CustomEvent('dataUpdated'));
  } catch {}
};

const fmtDate = (iso) => {
  const v = String(iso || '').trim();
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString();
  } catch {
    return v;
  }
};

const daysUntil = (iso) => {
  const raw = String(iso || '').trim();
  if (!raw) return null;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  const diff = Math.floor((t - Date.now()) / (24 * 60 * 60 * 1000));
  return Number.isFinite(diff) ? diff : null;
};

const Settings = () => {
  const navigate = useNavigate();
  const [companyInfo, setCompanyInfo] = useState({
    companyName: '',
    tin: '',
    vrn: '',
    location: '',
    phone: '',
    email: '',
    poBox: '',
    fax: '',
    website: '',
    logo: '',
    businessDescription: '',
    receiptFooterMessage: ''
  });

  const [accountInfo, setAccountInfo] = useState({
    fullName: '',
    email: '',
    mobileNumber: ''
  });

  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editAccount, setEditAccount] = useState({ fullName: '', email: '', mobileNumber: '' });
  const [editCompany, setEditCompany] = useState({
    companyName: '',
    tin: '',
    vrn: '',
    location: '',
    phone: '',
    email: '',
    poBox: '',
    fax: '',
    website: '',
    logo: '',
    businessDescription: '',
    receiptFooterMessage: ''
  });
  const [editProfilePhoto, setEditProfilePhoto] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [cropper, setCropper] = useState({ open: false, src: '', zoom: 1.2, offsetX: 0, offsetY: 0 });
  const [cropperImage, setCropperImage] = useState(null);
  const cropperCanvasRef = useRef(null);
  const cropperDragRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const [currentUser, setCurrentUser] = useState(() => getCurrentUserSync());
  const [section, setSection] = useState(() => {
    try {
      return String(window.localStorage.getItem('settingsSection') || 'profile');
    } catch {
      return 'profile';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('settingsSection', String(section || 'profile'));
    } catch {}
  }, [section]);

  useEffect(() => {
    const refreshUser = () => {
      try {
        const u = getCurrentUserSync();
        setCurrentUser(u || null);
      } catch {}
    };
    window.addEventListener('dataUpdated', refreshUser);
    window.addEventListener('companyInfoUpdated', refreshUser);
    refreshUser();
    return () => {
      window.removeEventListener('dataUpdated', refreshUser);
      window.removeEventListener('companyInfoUpdated', refreshUser);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const saved = await businessApi.get();
        if (!alive) return;
        setCompanyInfo((prev) => ({
          ...prev,
          ...(saved && typeof saved === 'object' ? saved : {}),
          tin: String(saved?.tin || saved?.taxId || prev.tin || '').trim()
        }));
        if (saved?.logo) setLogoPreview(saved.logo);
      })
      .catch(() => {
        if (!alive) return;
        const saved = getStoredJson('companyInfo', {});
        setCompanyInfo((prev) => ({
          ...prev,
          ...(saved && typeof saved === 'object' ? saved : {}),
          tin: String(saved?.tin || saved?.taxId || prev.tin || '').trim()
        }));
      });

    const fullName = String(currentUser?.fullName || currentUser?.name || currentUser?.username || '').trim();
    const email = String(currentUser?.email || '').trim();
    const mobileNumber = String(currentUser?.phone || '').trim();
    const profilePhoto = String(currentUser?.profilePhoto || '').trim();
    setAccountInfo((prev) => ({
      ...prev,
      fullName,
      email,
      mobileNumber
    }));
    if (profilePhoto) setProfilePhotoPreview(profilePhoto);
    return () => {
      alive = false;
    };
  }, [currentUser]);

  const initials = useMemo(() => {
    const n = String(accountInfo.fullName || '').trim();
    if (!n) return 'U';
    const parts = n.split(' ').filter(Boolean);
    return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'U';
  }, [accountInfo.fullName]);
  const [salesCount, setSalesCount] = useState(0);

  const stats = useMemo(() => {
    const createdAt = String(currentUser?.createdAt || '').trim();
    const daysActive = createdAt ? Math.max(1, Math.ceil((Date.now() - Date.parse(createdAt)) / (24 * 60 * 60 * 1000))) : 1;
    return { salesCount, daysActive };
  }, [currentUser?.createdAt, salesCount]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve()
      .then(async () => {
        const list = await salesApi.list().catch(() => []);
        if (!mounted) return;
        setSalesCount(Array.isArray(list) ? list.length : 0);
      })
      .catch(() => {
        if (!mounted) return;
        setSalesCount(0);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const subscriptionSummary = useMemo(() => {
    const plan = String(currentUser?.subscriptionPlan || companyInfo?.subscriptionPlan || '').trim() || '—';
    const status = String(currentUser?.subscriptionPaymentStatus || companyInfo?.subscriptionPaymentStatus || '').trim() || '—';
    const endsAt = String(currentUser?.subscriptionEndsAt || companyInfo?.subscriptionEndsAt || '').trim();
    const trialEndsAt = String(currentUser?.subscriptionTrialEndsAt || companyInfo?.subscriptionTrialEndsAt || '').trim();
    const statusLower = String(status || '').trim().toLowerCase();
    const nextDate = (() => {
      if (trialEndsAt) return trialEndsAt;
      if (endsAt) return endsAt;
      if (statusLower === 'trial') {
        const base = String(currentUser?.subscriptionStartedAt || currentUser?.createdAt || '').trim();
        const t = Date.parse(base);
        if (Number.isFinite(t)) {
          const d = new Date(t + 7 * 24 * 60 * 60 * 1000);
          return d.toISOString();
        }
      }
      return '';
    })();
    return { plan, status, nextDate };
  }, [
    companyInfo?.subscriptionEndsAt,
    companyInfo?.subscriptionPaymentStatus,
    companyInfo?.subscriptionPlan,
    companyInfo?.subscriptionTrialEndsAt,
    currentUser?.createdAt,
    currentUser?.subscriptionEndsAt,
    currentUser?.subscriptionPaymentStatus,
    currentUser?.subscriptionPlan,
    currentUser?.subscriptionStartedAt,
    currentUser?.subscriptionTrialEndsAt
  ]);

  const subscriptionDaysLeft = useMemo(() => {
    const d = daysUntil(subscriptionSummary.nextDate);
    return d == null ? null : Math.max(0, d);
  }, [subscriptionSummary.nextDate]);

  const profileBioKey = useMemo(() => `profileBio:${String(currentUser?.id || 'default')}`, [currentUser?.id]);
  const [profileDraft, setProfileDraft] = useState({ firstName: '', lastName: '', phone: '', email: '', bio: '' });
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [companyDraft, setCompanyDraft] = useState({ companyName: '', phone: '', email: '', location: '', tin: '', vrn: '', receiptFooterMessage: '' });
  const [companyEditing, setCompanyEditing] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);

  useEffect(() => {
    if (profileEditing) return;
    const full = String(accountInfo.fullName || '').trim();
    const parts = full.split(' ').filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ');
    let bio = '';
    try {
      bio = String(localStore.get(profileBioKey, '') || '');
    } catch {
      bio = '';
    }
    setProfileDraft({
      firstName,
      lastName,
      phone: String(accountInfo.mobileNumber || ''),
      email: String(accountInfo.email || ''),
      bio
    });
  }, [accountInfo.email, accountInfo.fullName, accountInfo.mobileNumber, profileBioKey, profileEditing]);

  useEffect(() => {
    if (companyEditing) return;
    setCompanyDraft({
      companyName: String(companyInfo.companyName || '').trim(),
      phone: String(companyInfo.phone || '').trim(),
      email: String(companyInfo.email || '').trim(),
      location: String(companyInfo.location || '').trim(),
      tin: String(companyInfo.tin || companyInfo.taxId || '').trim(),
      vrn: String(companyInfo.vrn || '').trim(),
      receiptFooterMessage: String(companyInfo.receiptFooterMessage || '').trim()
    });
  }, [companyEditing, companyInfo.companyName, companyInfo.email, companyInfo.location, companyInfo.phone, companyInfo.taxId, companyInfo.tin, companyInfo.receiptFooterMessage, companyInfo.vrn]);

  const setProfileField = (key, value) => {
    setProfileDraft((p) => ({ ...p, [key]: value }));
  };

  const cancelProfileEdit = () => {
    setProfileEditing(false);
    const full = String(accountInfo.fullName || '').trim();
    const parts = full.split(' ').filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ');
    let bio = '';
    try {
      bio = String(localStore.get(profileBioKey, '') || '');
    } catch {
      bio = '';
    }
    setProfileDraft({
      firstName,
      lastName,
      phone: String(accountInfo.mobileNumber || ''),
      email: String(accountInfo.email || ''),
      bio
    });
  };

  const setCompanyField = (key, value) => {
    setCompanyDraft((p) => ({ ...p, [key]: value }));
  };

  const cancelCompanyEdit = () => {
    setCompanyEditing(false);
    setCompanyDraft({
      companyName: String(companyInfo.companyName || '').trim(),
      phone: String(companyInfo.phone || '').trim(),
      email: String(companyInfo.email || '').trim(),
      location: String(companyInfo.location || '').trim(),
      tin: String(companyInfo.tin || companyInfo.taxId || '').trim(),
      vrn: String(companyInfo.vrn || '').trim(),
      receiptFooterMessage: String(companyInfo.receiptFooterMessage || '').trim()
    });
  };

  const saveCompanyEdit = async () => {
    if (companySaving) return;
    setCompanySaving(true);
    try {
      await withMinimumDelay(async () => {
        const nextCompany = {
          ...companyInfo,
          companyName: String(companyDraft.companyName || '').trim(),
          phone: String(companyDraft.phone || '').trim(),
          email: String(companyDraft.email || '').trim(),
          location: String(companyDraft.location || '').trim(),
          tin: String(companyDraft.tin || '').trim(),
          vrn: String(companyDraft.vrn || '').trim(),
          receiptFooterMessage: String(companyDraft.receiptFooterMessage || '').trim()
        };
        const savedCompany = await businessApi.update(nextCompany);
        setCompanyInfo((prev) => ({
          ...prev,
          ...(savedCompany && typeof savedCompany === 'object' ? savedCompany : {})
        }));
      }, 7000);
      setCompanyEditing(false);
    } finally {
      setCompanySaving(false);
    }
  };

  const saveProfileEdit = async () => {
    if (profileSaving) return;
    setProfileSaving(true);
    try {
      const firstName = String(profileDraft.firstName || '').trim();
      const lastName = String(profileDraft.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const email = String(profileDraft.email || '').trim();
      const phone = String(profileDraft.phone || '').trim();
      const bio = String(profileDraft.bio || '').trim();

      try {
        localStore.set(profileBioKey, bio);
      } catch {}

      const nextUser = await withMinimumDelay(
        () =>
          accountApi.updateCurrentUser({
            fullName: fullName || currentUser?.fullName || currentUser?.name,
            email: email || currentUser?.email,
            phone: phone || currentUser?.phone
          }),
        7000
      );
      setCurrentUser(nextUser);
      setAccountInfo({ fullName, email, mobileNumber: phone });

      setProfileEditing(false);
    } finally {
      setProfileSaving(false);
    }
  };

  const companyPreviewFields = useMemo(() => {
    return [
      { label: 'Business name', value: companyInfo.companyName || '—' },
      { label: 'TIN', value: companyInfo.tin || '—' },
      { label: 'Location', value: companyInfo.location || '—' },
      { label: 'Business phone', value: companyInfo.phone || '—' },
      { label: 'Business email', value: companyInfo.email || '—' },
      { label: 'P.O. Box', value: companyInfo.poBox || '—' },
      { label: 'Fax', value: companyInfo.fax || '—' },
      { label: 'Website', value: companyInfo.website || '—' }
    ];
  }, [companyInfo.companyName, companyInfo.email, companyInfo.fax, companyInfo.location, companyInfo.phone, companyInfo.poBox, companyInfo.tin, companyInfo.website]);

  const openEdit = () => {
    setEditAccount({
      fullName: String(accountInfo.fullName || ''),
      email: String(accountInfo.email || ''),
      mobileNumber: String(accountInfo.mobileNumber || '')
    });
    setEditCompany({
      companyName: String(companyInfo.companyName || ''),
      tin: String(companyInfo.tin || ''),
      vrn: String(companyInfo.vrn || ''),
      location: String(companyInfo.location || ''),
      phone: String(companyInfo.phone || ''),
      email: String(companyInfo.email || ''),
      poBox: String(companyInfo.poBox || ''),
      fax: String(companyInfo.fax || ''),
      website: String(companyInfo.website || ''),
      logo: String(companyInfo.logo || ''),
      businessDescription: String(companyInfo.businessDescription || ''),
      receiptFooterMessage: String(companyInfo.receiptFooterMessage || '')
    });
    setEditProfilePhoto(String(profilePhotoPreview || ''));
    setEditLogo(String(logoPreview || companyInfo.logo || ''));
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
  };

  const handleEditProfilePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = String(ev.target?.result || '');
      if (!src) return;
      setCropper({ open: true, src, zoom: 1.2, offsetX: 0, offsetY: 0 });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleEditLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = String(ev.target?.result || '');
      setEditLogo(data);
      setEditCompany((prev) => ({ ...prev, logo: data }));
    };
    reader.readAsDataURL(file);
  };

  const saveEdit = async () => {
    if (editSaving) return;
    setEditSaving(true);
    const nextAccount = {
      fullName: String(editAccount.fullName || '').trim(),
      email: String(editAccount.email || '').trim(),
      mobileNumber: String(editAccount.mobileNumber || '').trim()
    };
    const nextCompany = {
      ...editCompany,
      companyName: String(editCompany.companyName || '').trim(),
      tin: String(editCompany.tin || '').trim(),
      vrn: String(editCompany.vrn || '').trim(),
      location: String(editCompany.location || '').trim(),
      phone: String(editCompany.phone || '').trim(),
      email: String(editCompany.email || '').trim(),
      poBox: String(editCompany.poBox || '').trim(),
      fax: String(editCompany.fax || '').trim(),
      website: String(editCompany.website || '').trim(),
      businessDescription: String(editCompany.businessDescription || '').trim(),
      receiptFooterMessage: String(editCompany.receiptFooterMessage || '').trim(),
      logo: String(editLogo || editCompany.logo || '').trim()
    };

    try {
      await withMinimumDelay(async () => {
        const [savedUser, savedCompany] = await Promise.all([
          accountApi.updateCurrentUser({
            fullName: nextAccount.fullName || currentUser?.fullName || currentUser?.name,
            email: nextAccount.email || currentUser?.email,
            phone: nextAccount.mobileNumber || currentUser?.phone,
            profilePhoto: String(editProfilePhoto || currentUser?.profilePhoto || '').trim()
          }),
          businessApi.update(nextCompany)
        ]);

        setCurrentUser(savedUser);
        setAccountInfo(nextAccount);
        setCompanyInfo((prev) => ({
          ...prev,
          ...(savedCompany && typeof savedCompany === 'object' ? savedCompany : {})
        }));
        setProfilePhotoPreview(String(savedUser?.profilePhoto || editProfilePhoto || '').trim());
        setLogoPreview(String(savedCompany?.logo || nextCompany.logo || '').trim());
      }, 7000);

      setEditOpen(false);
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    if (!cropper.open || !cropper.src) {
      setCropperImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setCropperImage(img);
    img.src = cropper.src;
  }, [cropper.open, cropper.src]);

  const clampCropOffset = useCallback((img, zoom, offsetX, offsetY, size) => {
    if (!img) return { offsetX, offsetY };
    const z = Math.max(1, Number(zoom || 1));
    const s = Math.max(size / img.width, size / img.height) * z;
    const maxX = Math.max(0, (img.width * s - size) / 2);
    const maxY = Math.max(0, (img.height * s - size) / 2);
    const cx = Math.min(maxX, Math.max(-maxX, Number(offsetX || 0)));
    const cy = Math.min(maxY, Math.max(-maxY, Number(offsetY || 0)));
    return { offsetX: cx, offsetY: cy };
  }, []);

  const drawCropCanvas = useCallback((img, crop, canvas, size) => {
    if (!img || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const z = Math.max(1, Number(crop.zoom || 1));
    const clamped = clampCropOffset(img, z, crop.offsetX, crop.offsetY, size);
    const scale = Math.max(size / img.width, size / img.height) * z;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = size / 2 - drawW / 2 + clamped.offsetX;
    const dy = size / 2 - drawH / 2 + clamped.offsetY;
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, dx, dy, drawW, drawH);
  }, [clampCropOffset]);

  useEffect(() => {
    if (!cropper.open) return;
    const canvas = cropperCanvasRef.current;
    if (!canvas) return;
    const size = 320;
    canvas.width = size;
    canvas.height = size;
    drawCropCanvas(cropperImage, { zoom: cropper.zoom, offsetX: cropper.offsetX, offsetY: cropper.offsetY }, canvas, size);
  }, [cropper.open, cropper.offsetX, cropper.offsetY, cropper.zoom, cropperImage, drawCropCanvas]);

  useEffect(() => {
    if (!cropper.open || !cropperImage) return;
    const clamped = clampCropOffset(cropperImage, cropper.zoom, cropper.offsetX, cropper.offsetY, 320);
    if (clamped.offsetX !== cropper.offsetX || clamped.offsetY !== cropper.offsetY) {
      setCropper((p) => ({ ...p, offsetX: clamped.offsetX, offsetY: clamped.offsetY }));
    }
  }, [clampCropOffset, cropper.open, cropper.zoom, cropper.offsetX, cropper.offsetY, cropperImage]);

  const closeCropper = () => setCropper({ open: false, src: '', zoom: 1.2, offsetX: 0, offsetY: 0 });

  const cropperModal = cropper.open ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={closeCropper} />
      <div className="relative w-[94vw] max-w-[720px] bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-900">Crop photo</div>
          <button type="button" className="px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50" onClick={closeCropper}>
            Close
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-center">
            <div className="relative w-[320px] h-[320px] rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
              <canvas
                ref={cropperCanvasRef}
                className="w-[320px] h-[320px] touch-none select-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  if (!cropperImage) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  cropperDragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, baseX: cropper.offsetX, baseY: cropper.offsetY };
                }}
                onPointerMove={(e) => {
                  const st = cropperDragRef.current;
                  if (!st.dragging) return;
                  const dx = e.clientX - st.startX;
                  const dy = e.clientY - st.startY;
                  setCropper((p) => ({ ...p, offsetX: st.baseX + dx, offsetY: st.baseY + dy }));
                }}
                onPointerUp={(e) => {
                  cropperDragRef.current.dragging = false;
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {}
                  if (!cropperImage) return;
                  const clamped = clampCropOffset(cropperImage, cropper.zoom, cropper.offsetX, cropper.offsetY, 320);
                  setCropper((p) => ({ ...p, offsetX: clamped.offsetX, offsetY: clamped.offsetY }));
                }}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[260px] h-[260px] rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]" />
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <div className="text-sm font-semibold text-gray-900">Zoom</div>
              <input type="range" min="1" max="3" step="0.01" value={cropper.zoom} onChange={(e) => setCropper((p) => ({ ...p, zoom: Number(e.target.value) }))} className="mt-3 w-full" />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Preview</div>
              <div className="mt-3 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white border border-gray-200 overflow-hidden">
                  <canvas
                    width={80}
                    height={80}
                    className="w-16 h-16"
                    ref={(node) => {
                      if (!node || !cropperImage) return;
                      const ctx = node.getContext('2d');
                      if (!ctx) return;
                      const size = 80;
                      const temp = document.createElement('canvas');
                      temp.width = 320;
                      temp.height = 320;
                      drawCropCanvas(cropperImage, cropper, temp, 320);
                      ctx.clearRect(0, 0, size, size);
                      ctx.save();
                      ctx.beginPath();
                      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                      ctx.clip();
                      ctx.drawImage(temp, 0, 0, 320, 320, 0, 0, size, size);
                      ctx.restore();
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600">Drag to position. Use zoom slider to fit.</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50" onClick={closeCropper}>
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                onClick={() => {
                  const canvas = cropperCanvasRef.current;
                  if (canvas) {
                    try {
                      const data = canvas.toDataURL('image/jpeg', 0.92);
                      setEditProfilePhoto(String(data || ''));
                    } catch {}
                  }
                  closeCropper();
                }}
              >
                Save crop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const editModal = editOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={closeEdit} />
      <div className="relative w-full max-w-2xl rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xl font-extrabold text-gray-900">Edit profile</div>
          <button type="button" className="text-sm font-semibold text-gray-700 hover:text-gray-900" onClick={closeEdit}>
            Close
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-900">Personal</div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                {editProfilePhoto ? (
                  <img src={editProfilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-extrabold text-gray-700">{initials}</div>
                )}
              </div>
              <label className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 hover:bg-white/75 text-sm font-semibold text-gray-900 cursor-pointer">
                Upload photo
                <input type="file" accept="image/*" onChange={handleEditProfilePhotoUpload} className="hidden" />
              </label>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700">Full name</div>
              <input
                value={editAccount.fullName}
                onChange={(e) => setEditAccount((p) => ({ ...p, fullName: e.target.value }))}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700">Email</div>
              <input
                type="email"
                value={editAccount.email}
                onChange={(e) => setEditAccount((p) => ({ ...p, email: e.target.value }))}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700">Mobile number</div>
              <input
                value={editAccount.mobileNumber}
                onChange={(e) => setEditAccount((p) => ({ ...p, mobileNumber: e.target.value }))}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-900">Business</div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
                {editLogo ? <img src={editLogo} alt="Logo" className="w-full h-full object-cover" /> : <div className="w-6 h-6 rounded bg-gray-900/10" />}
              </div>
              <label className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 hover:bg-white/75 text-sm font-semibold text-gray-900 cursor-pointer">
                Upload logo
                <input type="file" accept="image/*" onChange={handleEditLogoUpload} className="hidden" />
              </label>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700">Business name</div>
              <input
                value={editCompany.companyName}
                onChange={(e) => setEditCompany((p) => ({ ...p, companyName: e.target.value }))}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-700">TIN</div>
                <input
                  value={editCompany.tin}
                  onChange={(e) => setEditCompany((p) => ({ ...p, tin: e.target.value }))}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700">Location</div>
                <input
                  value={editCompany.location}
                  onChange={(e) => setEditCompany((p) => ({ ...p, location: e.target.value }))}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-700">Business phone</div>
                <input
                  value={editCompany.phone}
                  onChange={(e) => setEditCompany((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700">Business email</div>
                <input
                  type="email"
                  value={editCompany.email}
                  onChange={(e) => setEditCompany((p) => ({ ...p, email: e.target.value }))}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-700">P.O. Box</div>
                <input
                  value={editCompany.poBox}
                  onChange={(e) => setEditCompany((p) => ({ ...p, poBox: e.target.value }))}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700">Fax</div>
                <input
                  value={editCompany.fax}
                  onChange={(e) => setEditCompany((p) => ({ ...p, fax: e.target.value }))}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700">Website</div>
              <input
                value={editCompany.website}
                onChange={(e) => setEditCompany((p) => ({ ...p, website: e.target.value }))}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700">Business description</div>
              <textarea
                rows={3}
                value={editCompany.businessDescription}
                onChange={(e) => setEditCompany((p) => ({ ...p, businessDescription: e.target.value }))}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/60 outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <button type="button" className="w-full px-4 py-3 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 hover:bg-white/75 font-semibold text-gray-900 disabled:opacity-60" onClick={closeEdit} disabled={editSaving}>
            Cancel
          </button>
          <button
            type="button"
            className="w-full px-4 py-3 rounded-2xl bg-green-600/85 backdrop-blur-xl border border-white/30 text-white hover:bg-green-600 font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
            onClick={saveEdit}
            disabled={editSaving}
          >
            <span>{editSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="w-full">
      <div className="space-y-6">
        <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-widest text-gray-500">SETTINGS</div>
              <div className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-900">Account & System</div>
              <div className="mt-2 text-sm text-gray-600">Manage profile, biashara, preferences, notifications, security, and subscription.</div>
            </div>
              <div className="w-full md:w-[520px] flex items-center justify-end gap-3 flex-wrap">
                {section === 'profile' && profileEditing ? (
                  <>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 font-semibold"
                      onClick={cancelProfileEdit}
                      disabled={profileSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-2xl bg-green-600 text-white hover:bg-green-700 font-semibold disabled:opacity-60 inline-flex items-center gap-2"
                      onClick={saveProfileEdit}
                      disabled={profileSaving}
                    >
                      <span>{profileSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </>
                ) : section === 'profile' && companyEditing ? (
                  <>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 font-semibold"
                      onClick={cancelCompanyEdit}
                      disabled={companySaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-2xl bg-green-600 text-white hover:bg-green-700 font-semibold disabled:opacity-60 inline-flex items-center gap-2"
                      onClick={saveCompanyEdit}
                      disabled={companySaving}
                    >
                      <span>{companySaving ? 'Saving...' : 'Save Business Info'}</span>
                    </button>
                  </>
                ) : null}
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full md:w-80 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="profile">Profile</option>
                  <option value="business">Biashara Info</option>
                  <option value="system">System Preference</option>
                  <option value="notification">Notification</option>
                  <option value="security">Security</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
          </div>
        </div>

        {section === 'profile' ? (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
                      {profilePhotoPreview ? (
                        <img src={profilePhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-extrabold text-green-700">{initials}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-gray-900">{accountInfo.fullName || '—'}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                        {(String(currentUser?.role || '').trim() || 'User').replace(/\b\w/g, (m) => m.toUpperCase())}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">{companyInfo.companyName || '—'}</span>
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 font-semibold"
                    onClick={() => navigate('/placeholder/notifications')}
                  >
                    View Activity
                  </button>
                  <label className="px-5 py-2.5 rounded-2xl bg-green-600 text-white hover:bg-green-700 font-semibold cursor-pointer">
                    Edit Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditProfilePhotoUpload} />
                  </label>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white border border-gray-200 p-4">
                  <div className="text-2xl font-extrabold text-gray-900">{stats.salesCount}</div>
                  <div className="mt-1 text-xs text-gray-600">Total Sales</div>
                </div>
                <div className="rounded-2xl bg-white border border-gray-200 p-4">
                  <div className="text-2xl font-extrabold text-gray-900">{stats.daysActive}</div>
                  <div className="mt-1 text-xs text-gray-600">Days Active</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-extrabold text-gray-900">Personal Information</div>
                  <div className="mt-1 text-sm text-gray-600">Update your personal details and contact information</div>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-green-700 hover:text-green-800"
                  onClick={() => setProfileEditing(true)}
                >
                  Edit
                </button>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="text-xs font-semibold text-gray-700">First Name</div>
                  <input
                    value={profileDraft.firstName}
                    disabled={!profileEditing}
                    onChange={(e) => setProfileField('firstName', e.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700">Last Name</div>
                  <input
                    value={profileDraft.lastName}
                    disabled={!profileEditing}
                    onChange={(e) => setProfileField('lastName', e.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700">Phone Number</div>
                  <input
                    value={profileDraft.phone}
                    disabled={!profileEditing}
                    onChange={(e) => setProfileField('phone', e.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700">Email Address</div>
                  <input
                    value={profileDraft.email}
                    disabled={!profileEditing}
                    onChange={(e) => setProfileField('email', e.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-gray-700">Bio / Description</div>
                  <textarea
                    rows={4}
                    value={profileDraft.bio}
                    disabled={!profileEditing}
                    onChange={(e) => setProfileField('bio', e.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-700 font-extrabold">
                      B
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-gray-900">Business Information</div>
                      <div className="mt-1 text-sm text-gray-600">Configure your business details used on receipts and reports</div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-green-700 hover:text-green-800"
                  onClick={() => setCompanyEditing(true)}
                >
                  Edit
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <div className="text-xs font-semibold text-gray-700">Business Name</div>
                  <input
                    value={companyDraft.companyName}
                    disabled={!companyEditing}
                    onChange={(e) => setCompanyField('companyName', e.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Business Phone</div>
                    <input
                      value={companyDraft.phone}
                      disabled={!companyEditing}
                      onChange={(e) => setCompanyField('phone', e.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Business Email</div>
                    <input
                      value={companyDraft.email}
                      disabled={!companyEditing}
                      onChange={(e) => setCompanyField('email', e.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700">Business Address</div>
                  <input
                    value={companyDraft.location}
                    disabled={!companyEditing}
                    onChange={(e) => setCompanyField('location', e.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <div className="text-xs font-semibold text-gray-700">TIN Number</div>
                    <input
                      value={companyDraft.tin}
                      disabled={!companyEditing}
                      onChange={(e) => setCompanyField('tin', e.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                      placeholder="Tax identification number"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700">VRN Number</div>
                    <input
                      value={companyDraft.vrn}
                      disabled={!companyEditing}
                      onChange={(e) => setCompanyField('vrn', e.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                      placeholder="VAT registration number"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700">Receipt Footer Message</div>
                  <textarea
                    rows={3}
                    value={companyDraft.receiptFooterMessage}
                    disabled={!companyEditing}
                    onChange={(e) => setCompanyField('receiptFooterMessage', e.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 resize-none"
                    placeholder="Thank you message shown on receipts"
                  />
                </div>
              </div>
            </div>

            {profileEditing ? <div className="h-2" /> : null}
          </div>
        ) : null}

        {section === 'business' ? (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-extrabold text-gray-900">Business Information</div>
                  <div className="mt-1 text-sm text-gray-600">Configure business details used on receipts and reports</div>
                </div>
                <button type="button" className="px-5 py-2.5 rounded-2xl bg-green-600 text-white hover:bg-green-700 font-semibold" onClick={openEdit}>
                  Edit
                </button>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 rounded-2xl bg-white border border-gray-200 p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-600">Business Name</div>
                    <div className="mt-2 text-base font-semibold text-gray-900 truncate">{companyInfo.companyName || '—'}</div>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
                    {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <div className="w-7 h-7 rounded bg-gray-200" />}
                  </div>
                </div>
                {companyPreviewFields.map((f) => (
                  <div key={f.label} className="rounded-2xl bg-white border border-gray-200 p-4">
                    <div className="text-xs font-semibold text-gray-600">{f.label}</div>
                    <div className="mt-2 text-base font-semibold text-gray-900">{f.value}</div>
                  </div>
                ))}
                {companyInfo.businessDescription ? (
                  <div className="md:col-span-2 rounded-2xl bg-white border border-gray-200 p-4">
                    <div className="text-xs font-semibold text-gray-600">Business Description</div>
                    <div className="mt-2 text-sm text-gray-700">{companyInfo.businessDescription}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {section === 'system' ? (
          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
            <SystemPreferences initialTab="general" />
          </div>
        ) : null}

        {section === 'notification' ? (
          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
            <SystemPreferences initialTab="notifications" />
          </div>
        ) : null}

        {section === 'security' ? (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-lg font-extrabold text-gray-900">Data Cleanup</div>
                  <div className="mt-1 text-sm text-gray-600">Remove old/mock local data stored in this browser only.</div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-semibold"
                    onClick={() => {
                      const ok = window.confirm('Reset all local data? This will clear products, sales, expenses, purchases and will log you out.');
                      if (!ok) return;
                      resetAllLocalData();
                      try {
                        window.location.assign('/login');
                      } catch {
                        window.location.href = '/login';
                      }
                    }}
                  >
                    Reset Local Data
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
              <SystemPreferences initialTab="security" />
            </div>
          </div>
        ) : null}

        {section === 'subscription' ? (
          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-extrabold text-gray-900">Current Plan</div>
                <div className="mt-1 text-sm text-gray-600">Manage your subscription</div>
              </div>
              <button type="button" className="px-5 py-2.5 rounded-2xl bg-green-600 text-white hover:bg-green-700 font-semibold" onClick={() => navigate('/plans')}>
                Manage
              </button>
            </div>
            <div className="mt-6 rounded-2xl bg-green-50 border border-green-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-extrabold text-green-800">{subscriptionSummary.plan}</div>
                  <div className="mt-2 text-sm text-green-700">{subscriptionSummary.status}</div>
                  {String(subscriptionSummary.status || '').trim().toLowerCase() === 'trial' ? (
                    <div className="mt-2 text-xs text-green-700">Trial is 7 days only. After trial, choose a paid plan to continue. Starter begins at TZS 15,000 for 1 month.</div>
                  ) : null}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-white text-green-800 border border-green-200 text-xs font-semibold">
                  {String(subscriptionSummary.status || '').trim().toLowerCase() === 'trial' ? 'Trial' : 'Active'}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white border border-green-200 p-4">
                  <div className="text-xs text-gray-600">Next billing date</div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">{fmtDate(subscriptionSummary.nextDate)}</div>
                </div>
                <div className="rounded-xl bg-white border border-green-200 p-4">
                  <div className="text-xs text-gray-600">Days remaining</div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">{subscriptionDaysLeft == null ? '—' : `${subscriptionDaysLeft} days`}</div>
                </div>
                <div className="rounded-xl bg-white border border-green-200 p-4">
                  <div className="text-xs text-gray-600">Payment reference</div>
                  <div className="mt-2 text-sm font-semibold text-gray-900 break-all">{String(currentUser?.paymentReference || companyInfo?.paymentReference || '').trim() || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {cropperModal}
      {editModal}
    </div>
  );
};

export default Settings;
