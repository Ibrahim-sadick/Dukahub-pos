import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const Settings = () => {
  const [companyInfo, setCompanyInfo] = useState({
    companyName: '',
    tin: '',
    location: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    businessDescription: ''
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
    location: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    businessDescription: ''
  });
  const [editProfilePhoto, setEditProfilePhoto] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [cropper, setCropper] = useState({ open: false, src: '', zoom: 1.2, offsetX: 0, offsetY: 0 });
  const [cropperImage, setCropperImage] = useState(null);
  const cropperCanvasRef = useRef(null);
  const cropperDragRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || 'null') || JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('companyInfo') || '{}');
      setCompanyInfo((prev) => ({
        ...prev,
        ...(saved && typeof saved === 'object' ? saved : {}),
        tin: String(saved?.tin || saved?.taxId || prev.tin || '').trim()
      }));
      if (saved?.logo) setLogoPreview(saved.logo);
    } catch {}

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
    else {
      try {
        const all = JSON.parse(localStorage.getItem('users') || '[]');
        const list = Array.isArray(all) ? all : [];
        const found = list.find((u) => String(u?.id || '') === String(currentUser?.id || '') && String(u?.profilePhoto || '').trim());
        if (found?.profilePhoto) setProfilePhotoPreview(String(found.profilePhoto || '').trim());
      } catch {}
    }
  }, [currentUser]);

  const initials = useMemo(() => {
    const n = String(accountInfo.fullName || '').trim();
    if (!n) return 'U';
    const parts = n.split(' ').filter(Boolean);
    return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'U';
  }, [accountInfo.fullName]);

  const profilePreviewFields = useMemo(() => {
    const firstName = String(accountInfo.fullName || '').trim().split(' ').filter(Boolean)[0] || '';
    const lastName = String(accountInfo.fullName || '').trim().split(' ').filter(Boolean).slice(1).join(' ');
    return [
      { label: 'First name', value: firstName || '—' },
      { label: 'Last name', value: lastName || '—' },
      { label: 'Mobile number', value: accountInfo.mobileNumber || '—' },
      { label: 'Email address', value: accountInfo.email || '—' }
    ];
  }, [accountInfo.email, accountInfo.fullName, accountInfo.mobileNumber]);

  const companyPreviewFields = useMemo(() => {
    return [
      { label: 'Business name', value: companyInfo.companyName || '—' },
      { label: 'TIN', value: companyInfo.tin || '—' },
      { label: 'Location', value: companyInfo.location || '—' },
      { label: 'Business phone', value: companyInfo.phone || '—' },
      { label: 'Business email', value: companyInfo.email || '—' },
      { label: 'Website', value: companyInfo.website || '—' }
    ];
  }, [companyInfo.companyName, companyInfo.email, companyInfo.location, companyInfo.phone, companyInfo.tin, companyInfo.website]);

  const openEdit = () => {
    setEditAccount({
      fullName: String(accountInfo.fullName || ''),
      email: String(accountInfo.email || ''),
      mobileNumber: String(accountInfo.mobileNumber || '')
    });
    setEditCompany({
      companyName: String(companyInfo.companyName || ''),
      tin: String(companyInfo.tin || ''),
      location: String(companyInfo.location || ''),
      phone: String(companyInfo.phone || ''),
      email: String(companyInfo.email || ''),
      website: String(companyInfo.website || ''),
      logo: String(companyInfo.logo || ''),
      businessDescription: String(companyInfo.businessDescription || '')
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

  const saveEdit = () => {
    const nextAccount = {
      fullName: String(editAccount.fullName || '').trim(),
      email: String(editAccount.email || '').trim(),
      mobileNumber: String(editAccount.mobileNumber || '').trim()
    };
    const nextCompany = {
      ...editCompany,
      companyName: String(editCompany.companyName || '').trim(),
      tin: String(editCompany.tin || '').trim(),
      location: String(editCompany.location || '').trim(),
      phone: String(editCompany.phone || '').trim(),
      email: String(editCompany.email || '').trim(),
      website: String(editCompany.website || '').trim(),
      businessDescription: String(editCompany.businessDescription || '').trim(),
      logo: String(editLogo || editCompany.logo || '').trim()
    };

    setAccountInfo(nextAccount);
    setCompanyInfo(nextCompany);
    setProfilePhotoPreview(String(editProfilePhoto || '').trim());
    setLogoPreview(String(nextCompany.logo || '').trim());

    try {
      localStorage.setItem('companyInfo', JSON.stringify(nextCompany));
    } catch {}

    try {
      const storedLocal = localStorage.getItem('currentUser') || '';
      const useLocal = Boolean(storedLocal && storedLocal !== 'null');
      const existing = useLocal
        ? JSON.parse(storedLocal || 'null')
        : JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      if (existing) {
        const nextUser = {
          ...existing,
          fullName: nextAccount.fullName || existing.fullName,
          email: nextAccount.email || existing.email,
          phone: nextAccount.mobileNumber || existing.phone,
          profilePhoto: String(editProfilePhoto || existing.profilePhoto || '').trim()
        };
        if (useLocal) localStorage.setItem('currentUser', JSON.stringify(nextUser));
        else sessionStorage.setItem('currentUser', JSON.stringify(nextUser));

        try {
          const all = JSON.parse(localStorage.getItem('users') || '[]');
          const list = Array.isArray(all) ? all : [];
          const idx = list.findIndex((u) => String(u?.id || '') === String(existing.id || ''));
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...nextUser };
            localStorage.setItem('users', JSON.stringify(list));
          }
        } catch {}
      }
    } catch {}

    setEditOpen(false);
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
          <button type="button" className="w-full px-4 py-3 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 hover:bg-white/75 font-semibold text-gray-900" onClick={closeEdit}>
            Cancel
          </button>
          <button type="button" className="w-full px-4 py-3 rounded-2xl bg-green-600/85 backdrop-blur-xl border border-white/30 text-white hover:bg-green-600 font-semibold" onClick={saveEdit}>
            Save
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                  {profilePhotoPreview ? (
                    <img src={profilePhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-extrabold text-gray-700">{initials}</div>
                  )}
                </div>
                <div>
                  <div className="text-base font-extrabold text-gray-900">{accountInfo.fullName || '—'}</div>
                  <div className="mt-1 text-sm text-gray-600">{accountInfo.email || '—'}</div>
                </div>
              </div>
              <button type="button" className="text-sm font-semibold text-green-700 border-b border-green-700 hover:text-green-800 hover:border-green-800" onClick={openEdit}>
                Edit
              </button>
            </div>

            <div className="mt-6 bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <div className="text-sm font-semibold text-gray-900">Profile information</div>
              </div>
              <div className="divide-y divide-gray-200">
                {profilePreviewFields.map((f) => (
                  <div key={f.label} className="px-5 py-4">
                    <div className="text-xs font-semibold text-gray-700">{f.label}</div>
                    <div className="mt-1 text-sm text-gray-900">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Business profile</div>
                <div className="mt-1 text-xs text-gray-600">{companyInfo.companyName || '—'}</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
                {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <div className="w-6 h-6 rounded bg-gray-900/10" />}
              </div>
            </div>

            {companyInfo.businessDescription ? (
              <div className="mt-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3">
                {companyInfo.businessDescription}
              </div>
            ) : null}

            <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="divide-y divide-gray-200">
                {companyPreviewFields.map((f) => (
                  <div key={f.label} className="px-5 py-4">
                    <div className="text-xs font-semibold text-gray-700">{f.label}</div>
                    <div className="mt-1 text-sm text-gray-900">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {cropperModal}
      {editModal}
    </div>
  );
};

export default Settings;
