// eslint-disable-next-line no-unused-vars
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Phone } from 'lucide-react';
import { RiLock2Line } from 'react-icons/ri';
import { getCurrentUserSync as getStoredCurrentUserSync, loginOwner } from '../services/authApi';

const authApi = {
  getCurrentUserSync() {
    return getStoredCurrentUserSync();
  },
  async loginAdmin({ phone, password, rememberMe }) {
    void rememberMe;
    return loginOwner({ phone, password });
  }
};

const ensureMinimumLoadingTime = async (startedAt, minimumMs = 5000) => {
  const elapsed = Date.now() - Number(startedAt || 0);
  const remaining = Math.max(0, Number(minimumMs || 0) - elapsed);
  if (!remaining) return;
  await new Promise((resolve) => setTimeout(resolve, remaining));
};

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const current = authApi.getCurrentUserSync ? authApi.getCurrentUserSync() : null;
    if (current?.phone) setFormData((prev) => ({ ...prev, email: current.phone }));
    if (current?.businessName) setCompanyName(String(current.businessName || ''));
  }, [onLogin]);

  useEffect(() => {
    try {
      window.localStorage.removeItem('dh_session_expired_message');
      window.sessionStorage.removeItem('dh_session_expired_message');
    } catch {}
  }, []);

  const handleChange = (e) => {
    const { name: field, value: fieldValue, type, checked } = e.target;
    let nextValue = type === 'checkbox' ? checked : fieldValue;
    if (field === 'email') {
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

  // eslint-disable-next-line no-unused-vars
  const finalizeLogin = () => {
    onLogin && onLogin();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const emailTrimmed = String(formData.email || '').trim();
    const passwordTrimmed = String(formData.password || '').trim();

    const newErrors = {};
    if (!emailTrimmed) {
      newErrors.email = 'Phone number is required';
    } else if (!normalizeTzPhone(emailTrimmed)) {
      newErrors.email = 'Phone number is invalid';
    }
    if (!passwordTrimmed) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    const startedAt = Date.now();
    setIsSubmitting(true);
    try {
      await authApi.loginAdmin({ phone: emailTrimmed, password: passwordTrimmed, rememberMe: Boolean(formData.rememberMe) });
      await ensureMinimumLoadingTime(startedAt, 5000);
      onLogin && onLogin();
    } catch (err) {
      await ensureMinimumLoadingTime(startedAt, 5000);
      setErrors({ general: String(err?.message || 'Invalid Phone Number or Password') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEmbedded = layout === 'embedded';
  const logoSrc = useMemo(() => {
    const base = String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
    return encodeURI(`${base}/DUKAHUB 3.png`);
  }, []);
  const rightCard = (
    <div className="w-full max-w-xl mx-auto relative">
      {!isEmbedded ? <div className="absolute -inset-6 rounded-[28px] bg-white shadow-2xl shadow-gray-300/70 -z-10" /> : null}
      {!isEmbedded ? <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-b from-white/70 to-transparent -z-10" /> : null}
      <div
        className={
          isEmbedded
            ? 'relative p-0 bg-transparent border-0 shadow-none flex flex-col'
            : 'bg-white border border-gray-200 rounded-2xl p-8 shadow-sm relative flex flex-col'
        }
      >
        <div className="text-center mb-0">
          <div className="flex justify-center mb-4">
            <img
              src={logoSrc}
              alt="Logo"
              className="h-24 w-auto max-w-full object-contain"
              onError={(e) => {
                e.currentTarget.src = `${String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '')}/favicon-96x96.png`;
              }}
            />
          </div>
          {companyName ? <div className="text-xl font-extrabold text-gray-900 tracking-tight">{companyName}</div> : null}
          <p className="mt-0.5 text-sm text-gray-600">{companyName ? 'Enter your password to continue' : 'Sign in to your account'}</p>
        </div>
        <div className="flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded">
                {errors.general}
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-900">Phone Number <span className="text-red-500">*</span></label>
              <div className={`mt-2 flex items-center border rounded-xl overflow-hidden bg-[#eaf2ff] ${errors.email ? 'border-red-300 bg-red-50/40' : 'border-blue-100'}`}>
                <div className="px-4 py-3 text-sm font-semibold text-green-700 bg-green-50 border-r border-blue-100 whitespace-nowrap flex items-center gap-2">
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
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <div
                className={`flex items-center gap-3 rounded-xl border px-5 py-4 bg-[#eaf2ff] focus-within:ring-2 focus-within:ring-green-500 ${
                  errors.password ? 'border-red-400 bg-red-50/50' : 'border-blue-100'
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
              <Link to="/reset-password" className="text-sm text-red-600 hover:text-red-500 font-semibold">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 bg-green-600 text-white transition shadow-sm ${
                isSubmitting ? 'opacity-80 cursor-not-allowed' : 'hover:bg-green-700'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                <span>{isSubmitting ? 'Logging in...' : 'Log In'}</span>
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
        </div>

        <div className="pt-6 mt-6 border-t border-gray-100 text-[11px] text-gray-500 text-center">
          <span>
            © <span className="text-green-700 font-semibold">Duka</span>
            <span className="font-semibold">Hub</span> 2026
          </span>
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
        <div className="absolute inset-0 bg-[#0b1220]" />
        <img src="/duka5pos.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 z-0 flex items-start justify-start px-10 pt-20">
          <div className="space-y-10">
            <div className="w-[26rem] text-left mt-4">
              <div className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]">
                Get reports for your business connecting with us
              </div>
              <p className="mt-6 text-base text-white/90 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                Set up your point of sale system in minutes.
                <br />
                Manage sales inventory and reports in one place.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Right login form */}
      <div className="flex items-start justify-center pt-6 pb-4 px-6 lg:px-10 bg-gradient-to-b from-white via-gray-50 to-emerald-50">
        <div className="w-full max-w-2xl">{rightCard}</div>
      </div>
    </div>
    )
  );
};

export default Login;
