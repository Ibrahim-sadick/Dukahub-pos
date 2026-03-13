import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { RiLock2Line, RiShoppingCart2Line, RiUser3Line } from 'react-icons/ri';
import { authApi } from '../services/backendApi';

const Login = ({ onLogin, layout = 'full', onNavigateSignUp }) => {
  const normalizeTzPhone = (raw) => {
    const digits = String(raw || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    const local = (() => {
      if (digits.startsWith('255')) return digits.slice(3);
      if (digits.startsWith('0')) return digits.slice(1);
      return digits;
    })().replace(/^0+/, '');
    if (local.length !== 9) return '';
    if (!(local.startsWith('6') || local.startsWith('7'))) return '';
    return `255${local}`;
  };

  const [loginMode, setLoginMode] = useState('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [companyName, setCompanyName] = useState('');
  const [staffAuth, setStaffAuth] = useState(null);
  const [staffPasswordChange, setStaffPasswordChange] = useState({ open: false, user: null, newPassword: '', confirmPassword: '', error: '' });

  useEffect(() => {
    const remembered = localStorage.getItem('rememberMe') === 'true';
    let prefillPhone = '';
    try {
      prefillPhone = String(sessionStorage.getItem('prefillLoginPhone') || '').trim();
      if (prefillPhone) sessionStorage.removeItem('prefillLoginPhone');
    } catch {}
    if (!normalizeTzPhone(prefillPhone)) {
      prefillPhone = String(localStorage.getItem('lastLoginPhone') || '').trim();
    }
    if (!normalizeTzPhone(prefillPhone)) {
      const legacy = String(localStorage.getItem('lastLoginEmail') || '').trim();
      if (normalizeTzPhone(legacy)) prefillPhone = legacy;
    }

    if (prefillPhone) {
      setFormData((prev) => ({ ...prev, email: prefillPhone, rememberMe: remembered || prev.rememberMe }));
    } else if (remembered) {
      const current = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (current) {
        setFormData((prev) => ({ ...prev, email: current.phone || '', rememberMe: true }));
        onLogin && onLogin();
      } else {
        setFormData((prev) => ({ ...prev, rememberMe: true }));
      }
    } else {
      const sessionUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      if (sessionUser) {
        setFormData((prev) => ({ ...prev, email: sessionUser.phone || '', rememberMe: false }));
        onLogin && onLogin();
      }
    }
    const companyInfo = JSON.parse(localStorage.getItem('companyInfo') || '{}');
    if (companyInfo.companyName) {
      setCompanyName(companyInfo.companyName);
    }
  }, [onLogin]);
  
  const businesses = useMemo(() => {
    let users = [];
    let profiles = [];
    try {
      const u = JSON.parse(localStorage.getItem('users') || '[]');
      users = Array.isArray(u) ? u : [];
    } catch {}
    try {
      const b = JSON.parse(localStorage.getItem('businesses') || '[]');
      profiles = Array.isArray(b) ? b : [];
    } catch {}

    const admins = users
      .filter((u) => String(u?.role || '').toLowerCase() === 'admin')
      .map((u) => {
        const p = profiles.find((x) => String(x?.businessId) === String(u.id));
        return {
          businessId: String(u.id),
          companyName: String(p?.companyName || u.companyName || '').trim(),
          logo: p?.logo || '',
          location: p?.location || u.location || '',
          taxId: p?.taxId || u.taxId || ''
        };
      })
      .filter((b) => b.companyName);

    admins.sort((a, b) => a.companyName.localeCompare(b.companyName));
    return admins;
  }, []);

  const handleChange = (e) => {
    const { name: field, value: fieldValue, type, checked } = e.target;
    let nextValue = type === 'checkbox' ? checked : fieldValue;
    if (field === 'email' && loginMode === 'admin') {
      const raw = String(fieldValue || '');
      const digits = raw.replace(/[^0-9]/g, '');
      if (!digits) nextValue = '+255 ';
      else {
        const withoutCountry = digits.startsWith('255') ? digits.slice(3) : digits;
        const local = String(withoutCountry || '').replace(/^0+/, '');
        nextValue = `+255 ${local}`;
      }
    }
    setFormData(prev => ({
      ...prev,
      [field]: nextValue
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const setCompanyInfoForBusinessId = (businessId) => {
    const selected = businesses.find((b) => String(b.businessId) === String(businessId));
    if (!selected) return;
    let existingCompany = {};
    try {
      const raw = JSON.parse(localStorage.getItem('companyInfo') || '{}');
      existingCompany = raw && typeof raw === 'object' ? raw : {};
    } catch {}
    localStorage.setItem(
      'companyInfo',
      JSON.stringify({
        ...existingCompany,
        companyName: selected.companyName || existingCompany.companyName || '',
        tin: selected.taxId || existingCompany.tin || existingCompany.taxId || '',
        taxId: selected.taxId || existingCompany.taxId || '',
        location: selected.location || existingCompany.location || '',
        logo: selected.logo || existingCompany.logo || ''
      })
    );
    try {
      window.dispatchEvent(new CustomEvent('companyInfoUpdated'));
    } catch {}
    setCompanyName(selected.companyName || '');
  };

  const finalizeLogin = (user) => {
    const nowIso = new Date().toISOString();
    try {
      let users = JSON.parse(localStorage.getItem('users') || '[]');
      users = Array.isArray(users) ? users : [];
      const idx = users.findIndex((x) => String(x?.id || '') === String(user?.id || '') && String(x?.role || '').toLowerCase() === String(user?.role || '').toLowerCase());
      if (idx >= 0) {
        users[idx] = { ...users[idx], lastLoginAt: nowIso };
        localStorage.setItem('users', JSON.stringify(users));
        user = users[idx];
      }
    } catch {}

    if (loginMode === 'staff') {
      setCompanyInfoForBusinessId(String(user?.businessId || ''));
    } else if (loginMode === 'admin') {
      setCompanyInfoForBusinessId(String(user?.id || ''));
    }

    if (formData.rememberMe) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      sessionStorage.removeItem('currentUser');
    } else {
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.removeItem('currentUser');
    }
    if (loginMode === 'staff') {
      localStorage.setItem('lastStaffEmployeeId', String(user?.staffEmployeeId || ''));
      localStorage.setItem('lastStaffBusinessId', String(user?.businessId || ''));
    } else {
      localStorage.setItem('lastLoginPhone', user.phone || formData.email || '');
      localStorage.setItem('lastLoginEmail', user.email || '');
      localStorage.removeItem('lastStaffBusinessId');
      localStorage.removeItem('lastStaffEmployeeId');
    }
    if (formData.rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }
    onLogin();
  };

  // eslint-disable-next-line no-unused-vars
  const openStaffPasswordChange = (user) => {
    setStaffPasswordChange({ open: true, user, newPassword: '', confirmPassword: '', error: '' });
  };

  // eslint-disable-next-line no-unused-vars
  const staffNeedsPasswordChange = (user) => {
    if (!user) return false;
    if (user?.accessEnabled === false) return false;
    if (user?.forcePasswordChange === true) return true;
    return false;
  };

  const handleStaffPasswordChangeSubmit = (e) => {
    e.preventDefault();
    const user = staffPasswordChange.user;
    if (!user) return;
    const p = String(staffPasswordChange.newPassword || '');
    const c = String(staffPasswordChange.confirmPassword || '');
    if (!p || p.length < 6) {
      setStaffPasswordChange((prev) => ({ ...prev, error: 'Password must be at least 6 characters' }));
      return;
    }
    if (p !== c) {
      setStaffPasswordChange((prev) => ({ ...prev, error: 'Passwords do not match' }));
      return;
    }

    try {
      let users = JSON.parse(localStorage.getItem('users') || '[]');
      users = Array.isArray(users) ? users : [];
      const idx = users.findIndex((x) => String(x?.id || '') === String(user?.id || ''));
      if (idx >= 0) {
        users[idx] = {
          ...users[idx],
          password: p,
          forcePasswordChange: false,
          lastPasswordChangeAt: new Date().toISOString()
        };
        localStorage.setItem('users', JSON.stringify(users));
        setStaffPasswordChange({ open: false, user: null, newPassword: '', confirmPassword: '', error: '' });
        setStaffAuth(null);
        finalizeLogin(users[idx]);
        return;
      }
    } catch {}
    setStaffPasswordChange((prev) => ({ ...prev, error: 'Unable to update password. Try again.' }));
  };

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const startedAt = Date.now();
    const delayToFiveSeconds = async () => {
      const elapsed = Date.now() - startedAt;
      const remaining = 5000 - elapsed;
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
    };

    const emailTrimmed = String(formData.email || '').trim();
    const passwordTrimmed = String(formData.password || '').trim();

    const newErrors = {};
    if (!emailTrimmed) {
      newErrors.email = loginMode === 'staff' ? 'Employee ID is required' : 'Phone number is required';
    } else if (loginMode === 'admin' && !normalizeTzPhone(emailTrimmed)) {
      newErrors.email = 'Phone number is invalid';
    }
    if (!passwordTrimmed) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setIsSubmitting(true);

    if (loginMode === 'admin') {
      try {
        await authApi.loginAdmin({ phone: emailTrimmed, password: passwordTrimmed, rememberMe: Boolean(formData.rememberMe) });
        try {
          if (formData.rememberMe) localStorage.setItem('rememberMe', 'true');
          else localStorage.removeItem('rememberMe');
        } catch {}
        await delayToFiveSeconds();
        onLogin && onLogin();
      } catch (err) {
        await delayToFiveSeconds();
        setErrors({ general: String(err?.message || 'Invalid Phone Number or Password') });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const employeeId = emailTrimmed;
    try {
      const res = await authApi.loginStaff({ employeeId, password: passwordTrimmed, rememberMe: Boolean(formData.rememberMe) });
      if (res?.selectionRequired && Array.isArray(res?.options) && res.options.length > 0) {
        const options = res.options
          .map((o) => ({
            user: { businessId: String(o.businessId || '') },
            businessId: String(o.businessId || ''),
            companyName: String(o.businessName || `Business ${String(o.businessId || '')}`),
            location: String(o.workspaceName || '')
          }))
          .sort((a, b) => a.companyName.localeCompare(b.companyName));
        setStaffAuth({ employeeId, password: passwordTrimmed, rememberMe: Boolean(formData.rememberMe), options });
        setIsSubmitting(false);
        return;
      }
      try {
        if (formData.rememberMe) localStorage.setItem('rememberMe', 'true');
        else localStorage.removeItem('rememberMe');
      } catch {}
      await delayToFiveSeconds();
      onLogin && onLogin();
    } catch (err) {
      await delayToFiveSeconds();
      setErrors({ general: String(err?.message || 'Invalid Employee ID or Password') });
      setIsSubmitting(false);
    }
  };

  const isEmbedded = layout === 'embedded';
  const rightCard = (
    <div className="w-full max-w-xl mx-auto relative">
      {!isEmbedded ? <div className="absolute -inset-6 rounded-[28px] bg-white shadow-2xl shadow-gray-300/70 -z-10" /> : null}
      {!isEmbedded ? <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-b from-white/70 to-transparent -z-10" /> : null}
      <div
        className={
          isEmbedded
            ? 'relative p-0 bg-transparent border-0 shadow-none flex flex-col'
            : 'bg-white border border-gray-200 rounded-2xl p-10 shadow-sm relative flex flex-col'
        }
      >
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
              <div className="w-28 h-28 rounded-full bg-green-600 flex items-center justify-center">
                <RiShoppingCart2Line className="text-white" size={60} />
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{companyName || 'Welcome Back'}</h2>
          <p className="text-base text-gray-600">{companyName ? 'Enter your password to continue' : 'Sign in to your account'}</p>
        </div>
        <div className="flex-1">
          {loginMode === 'staff' && staffAuth?.options?.length ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">Select workspace</div>
                <div className="text-xs text-gray-600">Choose your assigned business</div>
              </div>
              <div className="space-y-2">
                {staffAuth.options.map((o) => (
                  <button
                    key={`${o.businessId}_${String(o.user?.id || '')}`}
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50"
                    disabled={isSubmitting}
                    onClick={async () => {
                      const auth = staffAuth;
                      setStaffAuth(null);
                      setIsSubmitting(true);
                      const startedAt = Date.now();
                      const elapsed = Date.now() - startedAt;
                      const remaining = 5000 - elapsed;
                      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
                      try {
                        await authApi.loginStaff({
                          employeeId: String(auth?.employeeId || ''),
                          password: String(auth?.password || ''),
                          businessId: o.businessId,
                          rememberMe: Boolean(auth?.rememberMe)
                        });
                        try {
                          if (auth?.rememberMe) localStorage.setItem('rememberMe', 'true');
                          else localStorage.removeItem('rememberMe');
                        } catch {}
                        onLogin && onLogin();
                      } catch (err) {
                        setErrors({ general: String(err?.message || 'Unable to login. Try again.') });
                        setStaffAuth(auth);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  >
                    <div className="min-w-0 text-left">
                      <div className="text-sm font-semibold text-gray-900 truncate">{o.companyName}</div>
                      {o.location ? <div className="text-xs text-gray-600 truncate">{o.location}</div> : null}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                      <RiShoppingCart2Line className="text-white" size={18} />
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50"
                onClick={() => {
                  setStaffAuth(null);
                  setErrors({});
                }}
              >
                Back
              </button>
            </div>
          ) : staffPasswordChange.open ? (
            <form onSubmit={handleStaffPasswordChangeSubmit} className="space-y-4">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">Change Password</div>
                <div className="text-xs text-gray-600">Required for first login</div>
              </div>
              {staffPasswordChange.error ? (
                <div className="bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded">
                  {staffPasswordChange.error}
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={staffPasswordChange.newPassword}
                  onChange={(e) => setStaffPasswordChange((prev) => ({ ...prev, newPassword: String(e.target.value || ''), error: '' }))}
                  className="w-full px-5 py-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={staffPasswordChange.confirmPassword}
                  onChange={(e) => setStaffPasswordChange((prev) => ({ ...prev, confirmPassword: String(e.target.value || ''), error: '' }))}
                  className="w-full px-5 py-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300"
                  placeholder="Confirm new password"
                />
              </div>
            <button type="submit" className="w-full py-4 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 bg-green-600 text-white hover:bg-green-700 transition">
              Update Password
            </button>
            <button
              type="button"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50"
              onClick={() => setStaffPasswordChange({ open: false, user: null, newPassword: '', confirmPassword: '', error: '' })}
            >
              Cancel
            </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded">
                {errors.general}
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('admin');
                  setErrors({});
                  setStaffAuth(null);
                  setStaffPasswordChange({ open: false, user: null, newPassword: '', confirmPassword: '', error: '' });
                  setCompanyName('');
                }}
                className={loginMode === 'admin' ? 'px-4 py-2 rounded-lg bg-green-600 text-white text-sm' : 'px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm'}
              >
                Admin Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('staff');
                  setErrors({});
                  setStaffAuth(null);
                  setStaffPasswordChange({ open: false, user: null, newPassword: '', confirmPassword: '', error: '' });
                  setCompanyName('');
                }}
                className={loginMode === 'staff' ? 'px-4 py-2 rounded-lg bg-green-600 text-white text-sm' : 'px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm'}
              >
                Login as Staff
              </button>
            </div>

            <div>
              {loginMode === 'staff' ? (
                <>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <div
                    className={`mt-1 flex items-center gap-3 rounded-full border px-5 py-4 bg-gray-50 focus-within:ring-2 focus-within:ring-green-500 ${
                      errors.email ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                    }`}
                  >
                    <RiUser3Line className="text-gray-500" size={18} />
                    <input
                      type="text"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-500"
                      placeholder="Enter your Employee ID"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </>
              ) : (
                <>
                  <label className="text-sm font-semibold text-gray-900">Phone Number <span className="text-red-500">*</span></label>
                  <div className={`mt-2 flex items-center border rounded-2xl overflow-hidden bg-white ${errors.email ? 'border-red-300 bg-red-50/40' : 'border-green-200'}`}>
                    <div className="px-4 py-3 text-sm font-semibold text-green-700 bg-green-50 border-r border-green-200 whitespace-nowrap flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      TZ +255
                    </div>
                    <input
                      type="tel"
                      id="email"
                      name="email"
                      value={String(formData.email || '').replace(/[^0-9]/g, '').replace(/^255/, '').replace(/^0+/, '')}
                      onChange={handleChange}
                      className="w-full px-4 py-3 outline-none text-gray-900 placeholder-gray-400"
                      placeholder="7XX XXX XXX"
                      inputMode="numeric"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-2">{errors.email}</p>}
                </>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div
                className={`mt-1 flex items-center gap-3 rounded-full border px-5 py-4 bg-gray-50 focus-within:ring-2 focus-within:ring-green-500 ${
                  errors.password ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                }`}
              >
                <RiLock2Line className="text-gray-500" size={18} />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-500"
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <Link to="/reset-password" className="text-sm text-green-600 hover:text-green-500">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 bg-green-600 text-white transition ${
                isSubmitting ? 'opacity-80 cursor-not-allowed' : 'hover:bg-green-700'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {isSubmitting ? <span className="w-5 h-5 rounded-full border-2 border-white/70 border-t-white animate-spin" /> : null}
                <span>Log In</span>
              </span>
            </button>

            <div className="mt-4 text-center">
              <Link
                to="/signup"
                className="text-sm text-gray-700 hover:text-gray-900 underline"
                onClick={(e) => {
                  if (!onNavigateSignUp) return;
                  e.preventDefault();
                  onNavigateSignUp();
                }}
              >
                Create a new account
              </Link>
            </div>
            </form>
          )}
        </div>

        <div className="pt-6 mt-6 border-t border-gray-100 text-[11px] text-gray-500 text-center">
          <span>© Dukahub 2026</span>
          <span className="mx-2">||</span>
          <span>Privacy &amp; Terms</span>
          <span className="mx-2">||</span>
          <span>Designed &amp; Developed by </span>
          <a
            href="https://ibrahdeveloper.netlify.app/"
            target="_blank"
            rel="noreferrer"
            className="text-green-700 font-semibold hover:text-green-800 underline"
          >
            Ibrahim S.
          </a>
        </div>
      </div>
    </div>
  );

  return (
    layout === 'embedded' ? (
      rightCard
    ) : (
    <div className="min-h-screen bg-gray-50 grid grid-cols-1 md:grid-cols-2">
      {/* Left design panel */}
      <div className="hidden md:block relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/istockphoto-1475954281-612x612.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute top-4 left-6 z-10">
          <div className="inline-flex items-end gap-4 leading-none drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]">
            <span className="text-6xl font-extrabold tracking-tight text-green-300">Duka</span>
            <span className="relative text-6xl font-extrabold tracking-tight text-white pr-12">
              Hubnow
              <span className="absolute -top-3 right-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600 shadow-md shadow-black/30">
                <RiShoppingCart2Line className="text-white" size={18} />
              </span>
            </span>
          </div>
          <div className="mt-4 text-sm text-white/90">Smart business insights at a glance</div>
        </div>
        <div className="absolute inset-0 z-0 flex items-start justify-start px-10 pt-20">
          <div className="space-y-10">
            <div className="flex items-start gap-10">
              <div className="w-[14rem] rounded-2xl bg-white/95 shadow-2xl shadow-black/30 border border-white/30 backdrop-blur p-2 transform rotate-12 origin-bottom-left transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:rotate-8">
                <div className="flex items-center justify-between">
                  <div className="text-gray-900 font-semibold text-xs">Monthly Statistics</div>
                  <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">May</div>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5 h-10 items-end">
                  <div className="bg-green-200 rounded-md" style={{ height: '60%' }} />
                  <div className="bg-orange-200 rounded-md" style={{ height: '80%' }} />
                  <div className="bg-pink-200 rounded-md" style={{ height: '45%' }} />
                  <div className="bg-blue-200 rounded-md" style={{ height: '70%' }} />
                </div>
              </div>

              <div className="w-[12.5rem] rounded-2xl bg-white/95 shadow-2xl shadow-black/30 border border-white/30 backdrop-blur p-1.5 transform -rotate-12 origin-bottom-right transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:-rotate-8">
                <div className="text-gray-900 font-semibold text-xs mb-2">Overview</div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-2 py-1.5">
                    <span className="text-gray-700 text-xs">Sales</span>
                    <span className="text-green-700 text-xs font-semibold">TZS 548,915</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 px-2 py-1.5">
                    <span className="text-gray-700 text-xs">Orders</span>
                    <span className="text-blue-700 text-xs font-semibold">367</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-[26rem] text-left mt-4">
              <h1 className="text-5xl font-bold leading-[0.98] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]">
                <span>Start Selling </span>
                <span className="text-green-300">Smarter</span>
                <span> Today with </span>
                <span className="inline-flex items-center gap-2 align-baseline">
                  <span className="inline-flex items-center leading-none">
                    <span className="text-green-300">Duka</span>
                    <span className="mx-1.5" />
                    <span className="text-white">Hubnow</span>
                  </span>
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-600 shadow-md shadow-black/30">
                    <RiShoppingCart2Line className="text-white" size={18} />
                  </span>
                </span>
                <span className="block mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_22px_rgba(0,0,0,0.7)]">
                  <span className="block">All-in-one POS</span>
                  <span className="block text-green-300">Shops</span>
                  <span className="block">Inventory</span>
                  <span className="block">and reports</span>
                </span>
              </h1>
              <p className="mt-6 text-base text-white/90 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                Set up your point of sale system in minutes.
                <br />
                Manage sales, inventory, and reports all in one place.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Right login form */}
      <div className="flex items-center justify-center py-14 px-6 lg:px-10">
        <div className="w-full max-w-2xl">{rightCard}</div>
      </div>
    </div>
    )
  );
};

export default Login;
