import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Camera, Eye, EyeOff, KeyRound, ArrowLeft, ArrowRight, Briefcase, Loader2, Phone, User } from 'lucide-react';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';
import { checkSignupPhoneAvailability } from '../services/authApi';
import { setSignupDraft } from '../services/signupDraft';
import { sendOtp } from '../services/otpService';

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const readJson = (key, fallback) => {
  try {
    return safeJsonParse(window.localStorage.getItem(String(key || '')), fallback);
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    window.localStorage.setItem(String(key || ''), JSON.stringify(value));
  } catch {}
};

const removeKey = (key) => {
  try {
    window.localStorage.removeItem(String(key || ''));
  } catch {}
};

const ensureMinimumLoadingTime = async (startedAt, minimumMs = 5000) => {
  const elapsed = Date.now() - Number(startedAt || 0);
  const remaining = Math.max(0, Number(minimumMs || 0) - elapsed);
  if (!remaining) return;
  await new Promise((resolve) => setTimeout(resolve, remaining));
};

const SignUp = ({ layout = 'full', onNavigateLogin, onStepChange }) => {
  const navigate = useNavigate();
  const isEmbedded = layout === 'embedded';
  const logoSrc = React.useMemo(() => {
    const base = String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
    return encodeURI(`${base}/favicon-96x96.png`);
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    taxId: '',
    vatRegistration: '',
    businessAddress: '',
    location: '',
    locationCity: '',
    country: 'Tanzania',
    website: '',
    businessDescription: '',
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '+255 ',
    password: '',
    confirmPassword: '',
    role: 'admin',
    agreeToTerms: false,
    agreeBusinessTerms: false
  });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [renderedStep, setRenderedStep] = useState(1);
  const [slide, setSlide] = useState({ status: 'idle', direction: 'forward', visible: true });
  const [sendOtpPhase, setSendOtpPhase] = useState('idle');
  const slideTimerRef = useRef(null);
  const afterStepChangeRef = useRef(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [otpResendSeconds, setOtpResendSeconds] = useState(0);
  const otpRefs = useRef([]);

  const [logoPreview, setLogoPreview] = useState('');
  const [profilePreview, setProfilePreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const [cropScale, setCropScale] = useState(1.15);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropDragging, setCropDragging] = useState(false);
  const [cropNatural, setCropNatural] = useState({ w: 0, h: 0 });
  const cropImgRef = useRef(null);
  const cropDragRef = useRef({ startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 });

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const logoData = ev.target.result;
        setLogoPreview(logoData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = ev.target.result;
        setCropSrc(String(img || ''));
        setCropScale(1.15);
        setCropOffset({ x: 0, y: 0 });
        setCropNatural({ w: 0, h: 0 });
        setCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const goToStep = (nextStep, options = {}) => {
    const next = Number(nextStep);
    if (!Number.isFinite(next)) return;
    if (next === step) return;
    const direction = next > step ? 'forward' : 'back';

    if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    afterStepChangeRef.current = typeof options.afterEnter === 'function' ? options.afterEnter : null;

    setSlide({ status: 'leaving', direction, visible: false });
    slideTimerRef.current = setTimeout(() => {
      setStep(next);
      setRenderedStep(next);
      setSlide({ status: 'entering', direction, visible: false });
      requestAnimationFrame(() => {
        setSlide({ status: 'idle', direction, visible: true });
      });
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      if (typeof onStepChange === 'function') onStepChange(step);
    } catch {}
  }, [onStepChange, step]);

  useEffect(() => {
    if (step !== renderedStep) return;
    const fn = afterStepChangeRef.current;
    if (typeof fn === 'function') {
      afterStepChangeRef.current = null;
      try {
        fn();
      } catch {}
    }
  }, [renderedStep, step]);

  useEffect(() => {
    const nextCountry = 'Tanzania';
    if (String(formData.country || '').trim() !== nextCountry) {
      setFormData((prev) => ({ ...prev, country: nextCountry }));
      return;
    }
    const loc = String(formData.location || '').trim();
    const city = String(formData.locationCity || '').trim();
    if (!city && loc) {
      const derived = loc.split(',')[0].trim();
      if (derived) setFormData((prev) => ({ ...prev, locationCity: derived }));
    }
  }, [formData.country, formData.location, formData.locationCity]);
 
  

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const nextValue =
        type === 'checkbox'
          ? checked
          : name === 'password' || name === 'confirmPassword'
          ? value
          : name === 'phone'
          ? (() => {
              const raw = String(value || '');
              const digits = raw.replace(/[^0-9]/g, '');
              if (!digits) return '+255 ';
              const withoutCountry = digits.startsWith('255') ? digits.slice(3) : digits;
              const local = String(withoutCountry || '').replace(/^0+/, '');
              return `+255 ${local}`;
            })()
          : value;

      const next = { ...prev, [name]: nextValue };

      if (name === 'locationCity') {
        const city = String(nextValue || '').trim();
        if (next.businessAddress) {
          const addr = String(next.businessAddress || '').trim();
          next.location = city ? `${addr}, ${city}, Tanzania` : addr;
        } else {
          next.location = city ? `${city}, Tanzania` : '';
        }
      }

      if (name === 'firstName' || name === 'lastName') {
        next.fullName = `${String(next.firstName || '').trim()} ${String(next.lastName || '').trim()}`.trim();
      }

      if (name === 'businessAddress') {
        const addr = String(nextValue || '').trim();
        const city = String(next.locationCity || '').trim();
        next.location = addr ? (city ? `${addr}, ${city}, Tanzania` : addr) : (city ? `${city}, Tanzania` : '');
      }

      return next;
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    const phone = (formData.phone || '').trim();
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    const localDigits = String(phoneDigits.startsWith('255') ? phoneDigits.slice(3) : phoneDigits).replace(/^0+/, '');
    if (!localDigits) newErrors.phone = 'Phone number is required';
    else if (localDigits.length !== 9) newErrors.phone = 'Enter a valid Tanzania phone number';
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to continue';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    const firstName = (formData.firstName || '').trim();
    const lastName = (formData.lastName || '').trim();
    if (!firstName) newErrors.firstName = 'First name is required';
    if (!lastName) newErrors.lastName = 'Last name is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (String(formData.password || '').length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors = {};
    const companyName = (formData.companyName || '').trim();
    const locationCity = (formData.locationCity || '').trim();
    if (!companyName) newErrors.companyName = 'Company name is required';
    if (!locationCity) newErrors.locationCity = 'City is required';
    if (!formData.agreeBusinessTerms) newErrors.agreeBusinessTerms = 'Please confirm to continue';
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const generateOtp = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setOtpCode(code);
    setOtpInput('');
    setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
    return code;
  };

  /*
  const sendOtp = async () => {
    const code = generateOtp();
    setOtpResendSeconds(22);
    try {
      alert(`Your OTP code is: ${code}`);
    } catch {}
  };*/
  const normalizeTzPhone255 = (raw) => {
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

  const storeSignupOtp = (phone255, code) => {
    try {
      const key = 'signupOtpHistory';
      const prev = readJson(key, []);
      const list = Array.isArray(prev) ? prev : [];
      const next = [{ phone: phone255, otp: code, sentAt: Date.now(), expiresAt: Date.now() + 10 * 60 * 1000 }, ...list].slice(0, 5);
      writeJson(key, next);
    } catch {}
  };

  const sendOtpNow = async ({ reuseCode } = {}) => {
    const code = String(reuseCode || generateOtp() || '').trim();
    try {
      const phone255 = normalizeTzPhone255(formData.phone);
      if (!phone255) {
        setErrors((prev) => ({ ...prev, phone: 'Phone number is invalid' }));
        return false;
      }
      if (!code || code.length !== 6) throw new Error('Unable to generate OTP');
      await sendOtp({ phone: phone255, otp: code });
      setOtpResendSeconds(30);
      storeSignupOtp(phone255, code);
      setErrors((prev) => ({ ...prev, otp: '' }));
      return true;
    } catch (err) {
      const message = String(err?.message || 'Failed to send OTP. Please try again.');
      setOtpCode('');
      setOtpExpiresAt(0);
      setOtpResendSeconds(0);
      setErrors((prev) => ({ ...prev, otp: message }));
      return false;
    }
  };

  useEffect(() => {
    if (step !== 2) return;
    if (otpResendSeconds <= 0) return;
    const t = setTimeout(() => setOtpResendSeconds((s) => Math.max(0, Number(s) - 1)), 1000);
    return () => clearTimeout(t);
  }, [otpResendSeconds, step]);

  const handleNextFromStep1 = async () => {
    if (isSubmitting) return;
    if (!validateStep1()) return;
    const startedAt = Date.now();
    let shouldAdvance = false;
    setIsSubmitting(true);
    setSendOtpPhase('checking_backend');
    try {
      const availability = await checkSignupPhoneAvailability({ phone: formData.phone });
      if (!availability?.available) {
        setErrors((prev) => ({
          ...prev,
          phone: String(availability?.message || 'Phone number already exists. Please login instead.')
        }));
        return;
      }
      setSendOtpPhase('sending_code');
      const code = generateOtp();
      const ok = await sendOtpNow({ reuseCode: code });
      if (!ok) return;
      shouldAdvance = true;
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        phone: String(error?.message || 'Unable to verify this phone number right now.')
      }));
    } finally {
      await ensureMinimumLoadingTime(startedAt, 5000);
      if (shouldAdvance) {
        goToStep(2, {
          afterEnter: () => {
            const el = otpRefs.current[0];
            if (el && typeof el.focus === 'function') el.focus();
          }
        });
      }
      setSendOtpPhase('idle');
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (valueOverride) => {
    if (isSubmitting) return;
    const inputFromBoxes = (() => {
      try {
        return String(otpRefs.current.map((el) => String(el?.value || '')).join('') || '')
          .replace(/[^0-9]/g, '')
          .slice(0, 6);
      } catch {
        return '';
      }
    })();
    const input = String(valueOverride ?? inputFromBoxes ?? otpInput ?? '').replace(/[^0-9]/g, '').slice(0, 6);
    if (input.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: 'Enter the 6-digit code' }));
      return;
    }
    if (Date.now() > otpExpiresAt) {
      setErrors((prev) => ({ ...prev, otp: 'OTP expired. Please resend.' }));
      return;
    }
    const fallbackOtp = (() => {
      try {
        const saved = readJson('signupOtpHistory', []);
        const list = Array.isArray(saved) ? saved : [];
        const active = list
          .filter((r) => Number(r?.expiresAt || 0) >= Date.now())
          .map((r) => String(r?.otp || '').replace(/[^0-9]/g, '').slice(0, 6))
          .filter((c) => c.length === 6);
        return active;
      } catch {
        return [];
      }
    })();
    const latest = String(otpCode || '').replace(/[^0-9]/g, '').slice(0, 6);
    const activeOtps = Array.from(new Set([latest, ...(Array.isArray(fallbackOtp) ? fallbackOtp : [])].filter((c) => c.length === 6)));
    if (activeOtps.length === 0) {
      setErrors((prev) => ({ ...prev, otp: 'Please resend OTP and try again.' }));
      return;
    }
    if (!activeOtps.includes(input)) {
      setErrors((prev) => ({ ...prev, otp: 'Incorrect OTP code. Please try again.' }));
      return;
    }
    try {
      removeKey('signupOtpHistory');
    } catch {}
    setErrors((prev) => ({ ...prev, otp: '' }));
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    goToStep(3);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (step !== 2) return;
    if (!otpCode) return;
    if (!navigator?.credentials?.get) return;
    const ac = new AbortController();
    Promise.resolve()
      .then(() => navigator.credentials.get({ otp: { transport: ['sms'] }, signal: ac.signal }))
      .then((cred) => {
        const code = String(cred?.code || '').replace(/[^0-9]/g, '').slice(0, 6);
        if (code.length !== 6) return;
        setOtpInput(code);
        setErrors((prev) => ({ ...prev, otp: '' }));
        const el = otpRefs.current[Math.min(5, code.length)];
        if (el && typeof el.focus === 'function') el.focus();
      })
      .catch(() => {});
    return () => ac.abort();
  }, [otpCode, step]);

  const handleNextFromStep3 = async () => {
    if (isSubmitting) return;
    if (!validateStep3()) return;
    setIsSubmitting(true);
    goToStep(4);
    setIsSubmitting(false);
  };

  const handleNextFromStep4 = async () => {
    if (isSubmitting) return;
    if (!validateStep4()) return;
    setIsSubmitting(true);
    const draft = {
      step: 4,
      formData,
      selectedModule: 'retail_supermarket',
      logoPreview,
      profilePreview,
      otpVerified: true,
      savedAt: Date.now()
    };
    setErrors({});
    try {
      setSignupDraft(draft);
    } catch {}
    navigate('/signup/plan');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 3) await handleNextFromStep3();
    if (step === 4) await handleNextFromStep4();
  };

  const stepPanelClassName = (() => {
    const base = 'transition-all duration-300 ease-in-out';
    if (slide.visible) return `${base} opacity-100 translate-x-0`;
    if (slide.status === 'leaving') return `${base} opacity-0 ${slide.direction === 'forward' ? '-translate-x-8' : 'translate-x-8'}`;
    if (slide.status === 'entering') return `${base} opacity-0 ${slide.direction === 'forward' ? 'translate-x-8' : '-translate-x-8'}`;
    return `${base} opacity-100 translate-x-0`;
  })();

  const content = (
    <div className={isEmbedded ? '' : 'px-6 lg:px-12 py-6 lg:py-10'}>
      <form onSubmit={handleSubmit} className={isEmbedded ? 'w-full max-w-xl mx-auto' : 'w-full max-w-2xl mx-auto'}>
        <div className="w-full">
              <div className={isEmbedded ? 'p-3' : 'p-5 lg:p-6'}>
                <div className={stepPanelClassName}>
                {renderedStep === 1 && (
                  <div className={isEmbedded ? 'space-y-4' : 'space-y-5'}>
                    <div className="flex justify-center">
                      <img
                        src={logoSrc}
                        alt="DukaHub 3"
                        className={isEmbedded ? 'h-16 w-auto max-w-full object-contain' : 'h-20 w-auto max-w-full object-contain'}
                        onError={(e) => {
                          e.currentTarget.src = `${String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '')}/favicon-96x96.png`;
                        }}
                      />
                    </div>
                    <p className="text-center -mt-1 text-sm text-gray-600">Sign up for your new account</p>
                    <div className="flex items-start gap-4">
                      <div className={`${isEmbedded ? 'w-12 h-12' : 'w-14 h-14'} rounded-2xl bg-green-50 flex items-center justify-center`}>
                        <Phone className="w-6 h-6 text-green-700" />
                      </div>
                      <div className="pt-1">
                        <div className={`${isEmbedded ? 'mt-1.5 text-xl font-extrabold' : 'mt-2 text-2xl font-extrabold'} text-gray-900 tracking-tight`}>Enter phone number</div>
                        <div className="mt-2 text-sm text-gray-600">We’ll send a 6-digit OTP via SMS.</div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-900">Phone Number <span className="text-red-500">*</span></label>
                      <div className={`mt-2 flex items-center border rounded-2xl overflow-hidden bg-white shadow-sm transition focus-within:ring-2 focus-within:ring-green-500 ${errors.phone ? 'border-red-300 bg-red-50/40' : 'border-green-200'}`}>
                        <div className={`px-4 ${isEmbedded ? 'py-2.5' : 'py-3'} text-sm font-semibold text-green-800 bg-green-50 border-r border-green-200 whitespace-nowrap`}>TZ +255</div>
                        <input
                          type="tel"
                          name="phone"
                          value={String(formData.phone || '').replace(/[^0-9]/g, '').replace(/^255/, '').replace(/^0+/, '')}
                          onChange={handleChange}
                          className={`w-full px-4 ${isEmbedded ? 'py-2.5 text-base' : 'py-3 text-lg'} outline-none text-gray-900 placeholder-gray-400 font-mono tracking-wider`}
                          placeholder="7XX XXX XXX"
                          inputMode="numeric"
                        />
                      </div>
                      {errors.phone && <div className="text-red-600 text-xs mt-2">{errors.phone}</div>}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-900">Country</label>
                      <div className="mt-2">
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          className={`w-full px-4 ${isEmbedded ? 'py-2.5' : 'py-3'} border border-green-200 rounded-2xl bg-white text-gray-900 outline-none`}
                        >
                          <option value="Tanzania">Tanzania</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <div className="text-xs font-semibold tracking-widest text-gray-500">OR</div>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button type="button" className={`w-full ${isEmbedded ? 'py-2.5 text-sm' : 'py-3'} rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900 flex items-center justify-center gap-2`}>
                        <FaGoogle className="text-[#EA4335]" />
                        <span>Google</span>
                      </button>
                      <button type="button" className={`w-full ${isEmbedded ? 'py-2.5 text-sm' : 'py-3'} rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900 flex items-center justify-center gap-2`}>
                        <FaFacebookF className="text-blue-600" />
                        <span>Facebook</span>
                      </button>
                    </div>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="agreeToTerms" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange} className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-0.5" />
                      <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                        I agree to{' '}
                        <a href="/terms" className="text-green-700 underline">Terms</a> and{' '}
                        <a href="/privacy" className="text-green-700 underline">Privacy</a>
                      </label>
                    </div>
                    {errors.agreeToTerms ? <div className="text-red-600 text-sm -mt-2">{errors.agreeToTerms}</div> : null}
                    <button type="button" className={`w-full ${isEmbedded ? 'px-4 py-2.5 text-base' : 'px-5 py-3 text-lg'} rounded-2xl bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 font-semibold`} onClick={handleNextFromStep1} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                      <span>{sendOtpPhase === 'checking_backend' ? 'Checking number...' : sendOtpPhase === 'sending_code' ? 'Sending code...' : 'Send Code'}</span>
                    </button>
                    {errors.otp ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errors.otp}
                      </div>
                    ) : null}
                  </div>
                )}

                {renderedStep === 2 && (
                  <div className={isEmbedded ? 'space-y-6' : 'space-y-8'}>
                    <div className="flex justify-center">
                      <img
                        src={logoSrc}
                        alt="DukaHub 3"
                        className={isEmbedded ? 'h-16 w-auto max-w-full object-contain' : 'h-20 w-auto max-w-full object-contain'}
                        onError={(e) => {
                          e.currentTarget.src = `${String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '')}/favicon-96x96.png`;
                        }}
                      />
                    </div>
                    <p className="text-center -mt-1 text-sm text-gray-600">Sign up for your new account</p>
                    <div className="flex items-start gap-4">
                      <div className={`${isEmbedded ? 'w-12 h-12' : 'w-14 h-14'} rounded-2xl bg-green-50 flex items-center justify-center`}>
                        <KeyRound className="w-6 h-6 text-green-700" />
                      </div>
                      <div className="pt-1">
                        <div className={`${isEmbedded ? 'mt-1.5 text-xl font-extrabold' : 'mt-2 text-2xl font-extrabold'} text-gray-900 tracking-tight`}>OTP verification</div>
                        <div className="mt-2 text-sm text-gray-600">
                          Enter the 6-digit code sent to <span className="font-semibold text-gray-900">+255 {String(formData.phone || '').replace(/[^0-9]/g, '').replace(/^255/, '').replace(/^0+/, '')}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="grid grid-cols-6 gap-2 sm:gap-3"
                      onPaste={(e) => {
                        const pasted = String(e.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
                        if (!pasted) return;
                        e.preventDefault();
                        setOtpInput(pasted);
                        setErrors((prev) => ({ ...prev, otp: '' }));
                        if (pasted.length === 6) {
                          void handleVerifyOtp(pasted);
                        }
                        const idx = Math.min(5, pasted.length);
                        const el = otpRefs.current[idx];
                        if (el && typeof el.focus === 'function') el.focus();
                      }}
                    >
                      {Array.from({ length: 6 }).map((_, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            otpRefs.current[i] = el;
                          }}
                          value={otpInput[i] || ''}
                          onChange={(e) => {
                            const raw = String(e.target.value || '');
                            const digits = raw.replace(/[^0-9]/g, '');
                            if (!digits) {
                              const next = String(otpInput || '').split('');
                              next[i] = '';
                              setOtpInput(next.join('').slice(0, 6));
                              return;
                            }
                            const d = digits.slice(-1);
                            const next = String(otpInput || '').padEnd(6, ' ').split('');
                            next[i] = d;
                            const merged = next.join('').replace(/\s/g, '').slice(0, 6);
                            setOtpInput(merged);
                            setErrors((prev) => ({ ...prev, otp: '' }));
                            if (merged.length === 6) {
                              void handleVerifyOtp(merged);
                            }
                            const el = otpRefs.current[Math.min(5, i + 1)];
                            if (el && typeof el.focus === 'function') el.focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !(otpInput[i] || '')) {
                              const el = otpRefs.current[Math.max(0, i - 1)];
                              if (el && typeof el.focus === 'function') el.focus();
                            }
                          }}
                          className={`${isEmbedded ? 'h-12 text-xl' : 'h-14 text-2xl'} w-full rounded-2xl border text-center font-mono font-extrabold tracking-widest outline-none shadow-sm transition focus:ring-2 focus:ring-green-500 ${
                            errors.otp ? 'border-red-300 bg-red-50/40' : 'border-green-200 bg-white'
                          }`}
                          inputMode="numeric"
                          maxLength={1}
                        />
                      ))}
                    </div>
                    {errors.otp ? <div className="text-red-600 text-sm -mt-4">{errors.otp}</div> : null}
                    <div className="text-center text-xs text-gray-500 -mt-2">Tip: you can paste the full code.</div>

                    <div className="text-center text-sm text-gray-600">
                      Didn&apos;t receive code?{' '}
                      <button
                        type="button"
                        className="text-green-700 font-semibold hover:text-green-800 disabled:text-green-300"
                        disabled={otpResendSeconds > 0 || isSubmitting}
                        onClick={() => {
                          if (otpResendSeconds > 0) return;
                          void sendOtpNow();
                          const el = otpRefs.current[0];
                          if (el && typeof el.focus === 'function') el.focus();
                        }}
                      >
                        {otpResendSeconds > 0 ? `Resend in 00:${String(otpResendSeconds).padStart(2, '0')}` : 'Resend'}
                      </button>
                    </div>

                    <button
                      type="button"
                      className={`w-full ${isEmbedded ? 'px-4 py-2.5 text-base' : 'px-5 py-3 text-lg'} rounded-2xl bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 font-semibold`}
                      onClick={handleVerifyOtp}
                      disabled={isSubmitting}
                    >
                      <span>Verify &amp; Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className={`w-full ${isEmbedded ? 'px-4 py-2.5 text-base' : 'px-5 py-3 text-lg'} rounded-2xl bg-white border border-green-200 text-gray-900 hover:bg-green-50 flex items-center justify-center gap-2 font-semibold`}
                      onClick={() => {
                        goToStep(1);
                        setErrors({});
                      }}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>Back</span>
                    </button>
                  </div>
                )}

                {renderedStep === 3 && (
                  <div className="space-y-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative">
                        <div className={`${isEmbedded ? 'w-24 h-24' : 'w-28 h-28'} rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden`}>
                          {profilePreview ? (
                            <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-12 h-12 text-gray-500" />
                          )}
                        </div>
                        <label className="absolute bottom-1 right-0 w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-teal-800 transition">
                          <Camera className="w-4 h-4" />
                          <input type="file" accept="image/*" onChange={handleProfileUpload} className="hidden" />
                        </label>
                      </div>
                      <div className="mt-5 text-3xl font-extrabold text-gray-900 tracking-tight">Your Details</div>
                      <div className="mt-1 text-sm text-gray-500">Let&apos;s set up your profile for a personalized experience.</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">First Name</label>
                        <div className={`mt-2 border rounded-2xl overflow-hidden bg-white ${errors.firstName ? 'border-red-300 bg-red-50/40' : 'border-gray-200'}`}>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className={`w-full px-4 ${isEmbedded ? 'py-3' : 'py-3.5'} outline-none text-gray-900 placeholder-gray-400`}
                            placeholder="e.g. Julian"
                          />
                        </div>
                        {errors.firstName ? <div className="text-red-600 text-sm mt-2">{errors.firstName}</div> : null}
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Last Name</label>
                        <div className={`mt-2 border rounded-2xl overflow-hidden bg-white ${errors.lastName ? 'border-red-300 bg-red-50/40' : 'border-gray-200'}`}>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className={`w-full px-4 ${isEmbedded ? 'py-3' : 'py-3.5'} outline-none text-gray-900 placeholder-gray-400`}
                            placeholder="e.g. Marston"
                          />
                        </div>
                        {errors.lastName ? <div className="text-red-600 text-sm mt-2">{errors.lastName}</div> : null}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Phone Number</label>
                      <div className="mt-2 flex gap-2">
                        <div className={`min-w-[96px] px-3 ${isEmbedded ? 'py-3' : 'py-3.5'} text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-2xl whitespace-nowrap flex items-center justify-between gap-2`}>
                          <span>TZ +255</span>
                          <span className="text-gray-400">v</span>
                        </div>
                        <input
                          type="tel"
                          name="email"
                          value={String(formData.phone || '').replace(/[^0-9]/g, '').replace(/^255/, '').replace(/^0+/, '')}
                          readOnly
                          className={`w-full px-4 ${isEmbedded ? 'py-3' : 'py-3.5'} border border-gray-200 rounded-2xl outline-none text-gray-900 placeholder-gray-400 bg-white`}
                          placeholder="000-000-0000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Role</label>
                      <div className="mt-2 flex items-center border border-gray-200 rounded-2xl overflow-hidden bg-white">
                        <div className="px-4 text-gray-400">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          name="role"
                          value="Owner / Manager"
                          readOnly
                          className={`w-full px-4 ${isEmbedded ? 'py-3' : 'py-3.5'} outline-none text-gray-900 placeholder-gray-400`}
                        />
                        <div className="px-4 text-gray-400">v</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Create Password</label>
                        <div className={`mt-2 flex items-center border rounded-2xl overflow-hidden bg-white ${errors.password ? 'border-red-300' : 'border-gray-200'}`}>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={`w-full px-4 ${isEmbedded ? 'py-3' : 'py-3.5'} outline-none text-gray-900 placeholder-gray-400`}
                            placeholder="........"
                          />
                          <button type="button" className="px-4 text-gray-400" onClick={() => setShowPassword((v) => !v)}>
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {errors.password ? <div className="text-red-600 text-sm mt-2">{errors.password}</div> : null}
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Confirm Password</label>
                        <div className={`mt-2 flex items-center border rounded-2xl overflow-hidden bg-white ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200'}`}>
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={`w-full px-4 ${isEmbedded ? 'py-3' : 'py-3.5'} outline-none text-gray-900 placeholder-gray-400`}
                            placeholder="........"
                          />
                        </div>
                        {errors.confirmPassword ? <div className="text-red-600 text-sm mt-2">{errors.confirmPassword}</div> : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`w-full ${isEmbedded ? 'px-4 py-3 text-base' : 'px-5 py-3.5 text-lg'} rounded-full bg-teal-700 text-white hover:bg-teal-800 flex items-center justify-center gap-2 font-semibold`}
                      onClick={handleNextFromStep3}
                      disabled={isSubmitting}
                    >
                      <span>Save &amp; Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className={`w-full ${isEmbedded ? 'px-4 py-2.5 text-base' : 'px-5 py-3 text-lg'} rounded-2xl bg-white border border-green-200 text-gray-900 hover:bg-green-50 flex items-center justify-center gap-2 font-semibold`}
                      onClick={() => {
                        goToStep(2);
                        setErrors({});
                      }}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>Back</span>
                    </button>
                  </div>
                )}

                {renderedStep === 4 && (
                  <div className="w-full max-w-lg mx-auto space-y-3.5">
                    <div className="flex flex-col items-center text-center">
                      <div className={`${isEmbedded ? 'w-12 h-12' : 'w-14 h-14'} rounded-2xl bg-teal-50 flex items-center justify-center`}>
                        <Building2 className="w-6 h-6 text-teal-700" />
                      </div>
                      <div className="mt-3 text-2xl font-extrabold text-gray-900 tracking-tight">Business details</div>
                      <div className="mt-1 max-w-sm text-xs text-gray-500">
                        Please provide the official details for your legal business entity.
                      </div>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div className="relative">
                        <div className={`${isEmbedded ? 'w-20 h-20' : 'w-24 h-24'} rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden`}>
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-8 h-8 text-gray-500" />
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-teal-800 transition">
                          <Camera className="w-4 h-4" />
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                      </div>
                      <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">Logo (Optional)</div>
                      {logoPreview ? (
                        <button type="button" className="mt-1 text-xs text-teal-700 hover:text-teal-800 underline" onClick={() => setLogoPreview('')}>
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Business Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className={`mt-1.5 w-full px-4 ${isEmbedded ? 'py-2.5' : 'py-3'} border rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 ${
                          errors.companyName ? 'border-red-300 bg-red-50/40' : 'border-gray-200 bg-white'
                        }`}
                        placeholder="e.g. Acme Corp Industries"
                      />
                      {errors.companyName ? <div className="text-red-600 text-sm mt-2">{errors.companyName}</div> : null}
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">City / Town <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="locationCity"
                        value={formData.locationCity}
                        onChange={handleChange}
                        className={`mt-1.5 w-full px-4 ${isEmbedded ? 'py-2.5' : 'py-3'} border rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 ${
                          errors.locationCity ? 'border-red-300 bg-red-50/40' : 'border-gray-200 bg-white'
                        }`}
                        placeholder="Enter city name"
                      />
                      {errors.locationCity ? <div className="text-red-600 text-sm mt-2">{errors.locationCity}</div> : null}
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">TIN Number</label>
                      <input
                        type="text"
                        name="taxId"
                        value={formData.taxId}
                        onChange={handleChange}
                        className={`mt-1.5 w-full px-4 ${isEmbedded ? 'py-2.5' : 'py-3'} border border-gray-200 rounded-2xl bg-white text-gray-900 outline-none`}
                        placeholder="Tax Identification Number"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">VAT Registration (Optional)</label>
                      <input
                        type="text"
                        name="vatRegistration"
                        value={formData.vatRegistration}
                        onChange={handleChange}
                        className={`mt-1.5 w-full px-4 ${isEmbedded ? 'py-2.5' : 'py-3'} border border-gray-200 rounded-2xl bg-white text-gray-900 outline-none`}
                        placeholder="VAT Reference"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Business Address</label>
                      <textarea
                        name="businessAddress"
                        value={formData.businessAddress}
                        onChange={handleChange}
                        rows={2}
                        className={`mt-1.5 w-full px-4 ${isEmbedded ? 'py-2.5' : 'py-3'} border border-gray-200 rounded-2xl bg-white text-gray-900 outline-none resize-none`}
                        placeholder="Street name, Building, Floor..."
                      />
                    </div>

                    <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" id="agreeBusinessTerms" name="agreeBusinessTerms" checked={formData.agreeBusinessTerms} onChange={handleChange} className="h-5 w-5 text-teal-700 focus:ring-teal-500 border-gray-300 rounded mt-0.5" />
                        <label htmlFor="agreeBusinessTerms" className="text-sm text-gray-700">
                          I confirm the details are correct and accept the{' '}
                          <a href="/terms" className="text-teal-700 underline">Platform Terms</a>.
                        </label>
                      </div>
                    </div>
                    {errors.agreeBusinessTerms ? <div className="text-red-600 text-sm -mt-2">{errors.agreeBusinessTerms}</div> : null}

                    <button
                      type="button"
                      className={`w-full ${isEmbedded ? 'px-4 py-2.5 text-base' : 'px-5 py-3 text-lg'} rounded-full bg-teal-700 text-white hover:bg-teal-800 flex items-center justify-center gap-2 font-semibold`}
                      onClick={handleNextFromStep4}
                      disabled={isSubmitting}
                    >
                      <span>Finish</span>
                    </button>
                    <button
                      type="button"
                      className={`w-full ${isEmbedded ? 'px-4 py-2.5 text-base' : 'px-5 py-3 text-lg'} rounded-2xl bg-white border border-teal-200 text-gray-900 hover:bg-teal-50 flex items-center justify-center gap-2 font-semibold`}
                      onClick={() => {
                        goToStep(3);
                        setErrors({});
                      }}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>Back</span>
                    </button>
                  </div>
                )}
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-sm text-gray-700">
              <Link
                to="/login"
                className="text-green-700 hover:text-green-800 underline"
                onClick={(e) => {
                  if (!onNavigateLogin) return;
                  e.preventDefault();
                  onNavigateLogin();
                }}
              >
                Sign in
              </Link>
            </div>
      </form>
    </div>
  );

  const cropSize = 260;

  const cropModal = cropOpen ? (
    <div
      className={`${
        layout === 'embedded' ? 'absolute inset-0' : 'fixed inset-0'
      } z-50 flex items-center justify-center bg-transparent backdrop-blur-sm px-4`}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/60 p-6">
        <div className="text-xl font-extrabold text-gray-900">Crop photo</div>
        <div className="mt-2 text-sm text-gray-600">Drag to move. Use zoom to fit.</div>
        <div className="mt-5 flex items-center justify-center">
          <div
            className="relative rounded-3xl bg-gray-50 border border-gray-200 overflow-hidden"
            style={{ width: cropSize, height: cropSize }}
            onMouseDown={(e) => {
              setCropDragging(true);
              cropDragRef.current = { startX: e.clientX, startY: e.clientY, startOffsetX: cropOffset.x, startOffsetY: cropOffset.y };
            }}
            onMouseMove={(e) => {
              if (!cropDragging) return;
              const dx = e.clientX - cropDragRef.current.startX;
              const dy = e.clientY - cropDragRef.current.startY;
              setCropOffset({ x: cropDragRef.current.startOffsetX + dx, y: cropDragRef.current.startOffsetY + dy });
            }}
            onMouseUp={() => setCropDragging(false)}
            onMouseLeave={() => setCropDragging(false)}
          >
            <img
              ref={cropImgRef}
              src={cropSrc}
              alt="Crop"
              draggable={false}
              className="absolute left-1/2 top-1/2 select-none"
              onLoad={(e) => {
                const el = e.currentTarget;
                const w = Number(el.naturalWidth || 0);
                const h = Number(el.naturalHeight || 0);
                if (w && h) setCropNatural({ w, h });
              }}
              style={{
                width: cropNatural.w && cropNatural.h ? cropNatural.w * Math.max(cropSize / cropNatural.w, cropSize / cropNatural.h) : cropSize,
                height: cropNatural.w && cropNatural.h ? cropNatural.h * Math.max(cropSize / cropNatural.w, cropSize / cropNatural.h) : cropSize,
                transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
                transformOrigin: 'center',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="rounded-full border-2 border-white/90" style={{ width: 210, height: 210 }} />
            </div>
          </div>
        </div>
        <div className="mt-6">
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={cropScale}
            onChange={(e) => setCropScale(Number(e.target.value))}
            className="w-full accent-green-600"
          />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            type="button"
            className="w-full px-4 py-3 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 hover:bg-white/75 font-semibold text-gray-900"
            onClick={() => {
              setCropOpen(false);
              setCropSrc('');
              setCropOffset({ x: 0, y: 0 });
              setCropScale(1.15);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="w-full px-4 py-3 rounded-2xl bg-green-600/85 backdrop-blur-xl border border-white/30 text-white hover:bg-green-600 font-semibold"
            onClick={() => {
              const imgEl = cropImgRef.current;
              if (!imgEl) {
                setCropOpen(false);
                return;
              }
              const outSize = 512;
              const canvas = document.createElement('canvas');
              canvas.width = outSize;
              canvas.height = outSize;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                setCropOpen(false);
                return;
              }
              ctx.clearRect(0, 0, outSize, outSize);
              ctx.save();
              ctx.beginPath();
              ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              const naturalW = Number(imgEl.naturalWidth || 0);
              const naturalH = Number(imgEl.naturalHeight || 0);
              if (!naturalW || !naturalH) {
                setCropOpen(false);
                return;
              }
              const coverScale = Math.max(cropSize / naturalW, cropSize / naturalH);
              const displayScale = coverScale * cropScale;
              const scaleFactor = outSize / cropSize;
              const drawW = naturalW * displayScale * scaleFactor;
              const drawH = naturalH * displayScale * scaleFactor;
              const centerX = outSize / 2 + cropOffset.x * scaleFactor;
              const centerY = outSize / 2 + cropOffset.y * scaleFactor;
              ctx.drawImage(imgEl, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
              ctx.restore();
              try {
                const dataUrl = canvas.toDataURL('image/png');
                setProfilePreview(dataUrl);
              } catch {}
              setCropOpen(false);
            }}
          >
            Crop
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (layout === 'embedded') return <div className="relative">{content}{cropModal}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100">
      <div className="min-h-screen w-full">
        <div className="min-h-screen w-full bg-white/40 backdrop-blur-2xl border border-white/50 shadow-sm">
          {content}
        </div>
      </div>
      {cropModal}
    </div>
  );
};

export default SignUp;
