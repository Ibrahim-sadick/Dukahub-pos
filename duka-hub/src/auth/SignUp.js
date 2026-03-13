import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Camera, Eye, EyeOff, KeyRound, ArrowLeft, ArrowRight, Briefcase, Phone, User } from 'lucide-react';
import { RiShoppingCart2Line } from 'react-icons/ri';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';

const SignUp = ({ layout = 'full', onNavigateLogin, onStepChange }) => {
  const navigate = useNavigate();
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const [cropScale, setCropScale] = useState(1.15);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropDragging, setCropDragging] = useState(false);
  const [cropNatural, setCropNatural] = useState({ w: 0, h: 0 });
  const cropImgRef = useRef(null);
  const cropDragRef = useRef({ startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 });

  const delayToFiveSeconds = async (startedAt) => {
    const elapsed = Date.now() - startedAt;
    const remaining = 5000 - elapsed;
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
  };

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
      const raw = sessionStorage.getItem('signupDraft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.formData) {
        setFormData((prev) => {
          const next = { ...prev, ...draft.formData };
          const existingFirst = String(next.firstName || '').trim();
          const existingLast = String(next.lastName || '').trim();
          const full = String(next.fullName || '').trim();
          if ((!existingFirst || !existingLast) && full) {
            const parts = full.split(/\s+/).filter(Boolean);
            const firstName = existingFirst || String(parts[0] || '').trim();
            const lastName = existingLast || String(parts.slice(1).join(' ') || '').trim();
            return { ...next, firstName, lastName };
          }
          return next;
        });
      }
      if (typeof draft?.logoPreview === 'string') setLogoPreview(draft.logoPreview);
      if (typeof draft?.profilePreview === 'string') setProfilePreview(draft.profilePreview);
      if (draft?.step === 4) {
        setStep(4);
        setRenderedStep(4);
      } else if (draft?.step === 3) {
        setStep(3);
        setRenderedStep(3);
      }
    } catch {}
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
 const sendOtp = async () => {

  const code = generateOtp();
  setOtpResendSeconds(22);

  try {

    const phone = (formData.phone || '').trim();

    // toa characters zisizo number
    const phoneDigits = phone.replace(/[^0-9]/g, '');

    // badilisha 07xxxxxxxx -> 2557xxxxxxxx
    let formattedPhone = phoneDigits;

    if (phoneDigits.startsWith('0')) {
      formattedPhone = '255' + phoneDigits.slice(1);
    }

    if (phoneDigits.startsWith('255')) {
      formattedPhone = phoneDigits;
    }

    const res = await fetch("https://mpira.online/api/send-otp", {
      method: "POST",
      headers: {
       
        "Content-Type": "application/json",
         "Accept": "application/json"
      },
      body: JSON.stringify({
        phone: formattedPhone,
        otp: code
      })
    });

    const data = await res.json();

    console.log("OTP sent:", data);

  } catch (error) {
    console.error("OTP error:", error);
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
    const startedAt = Date.now();
    if (!validateStep1()) return;
    setIsSubmitting(true);
    await delayToFiveSeconds(startedAt);
    goToStep(2, {
      afterEnter: () => {
        sendOtp();
        const el = otpRefs.current[0];
        if (el && typeof el.focus === 'function') el.focus();
        setIsSubmitting(false);
      }
    });
  };

  const handleVerifyOtp = async () => {
    if (isSubmitting) return;
    const input = String(otpInput || '').trim();
    if (input.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: 'Enter the 6-digit code' }));
      return;
    }
    if (Date.now() > otpExpiresAt) {
      setErrors((prev) => ({ ...prev, otp: 'OTP expired. Please resend.' }));
      return;
    }
    if (input !== otpCode) {
      setErrors((prev) => ({ ...prev, otp: 'Invalid OTP' }));
      return;
    }
    setErrors((prev) => ({ ...prev, otp: '' }));
    try {
      sessionStorage.setItem('prefillLoginPhone', String(formData.phone || '').trim());
    } catch {}
    const startedAt = Date.now();
    setIsSubmitting(true);
    await delayToFiveSeconds(startedAt);
    goToStep(3);
    setIsSubmitting(false);
  };

  const handleNextFromStep3 = async () => {
    if (isSubmitting) return;
    if (!validateStep3()) return;
    const startedAt = Date.now();
    setIsSubmitting(true);
    await delayToFiveSeconds(startedAt);
    goToStep(4);
    setIsSubmitting(false);
  };

  const handleNextFromStep4 = async () => {
    if (isSubmitting) return;
    if (!validateStep4()) return;
    const startedAt = Date.now();
    setIsSubmitting(true);
    await delayToFiveSeconds(startedAt);
    const draft = {
      step: 4,
      formData,
      logoPreview,
      profilePreview,
      otpVerified: true,
      savedAt: Date.now()
    };
    try {
      sessionStorage.setItem('signupDraft', JSON.stringify(draft));
    } catch {}
    setErrors({});
    navigate('/signup/modules');
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
    <div className={layout === 'embedded' ? '' : 'px-6 lg:px-12 py-6 lg:py-10'}>
      <form onSubmit={handleSubmit} className={layout === 'embedded' ? 'w-full max-w-2xl mx-auto' : 'w-full max-w-2xl mx-auto'}>
        <div className="w-full">
              <div className="pt-2 pb-6">
                <div className="flex items-center gap-2">
                  <div className={step >= 1 ? 'h-1.5 w-12 rounded-full bg-green-600' : 'h-1.5 w-12 rounded-full bg-green-100'} />
                  <div className={step >= 2 ? 'h-1.5 w-12 rounded-full bg-green-600' : 'h-1.5 w-12 rounded-full bg-green-100'} />
                  <div className={step >= 3 ? 'h-1.5 w-12 rounded-full bg-green-600' : 'h-1.5 w-12 rounded-full bg-green-100'} />
                  <div className={step >= 4 ? 'h-1.5 w-12 rounded-full bg-green-600' : 'h-1.5 w-12 rounded-full bg-green-100'} />
                </div>
              </div>

              <div className="p-5 lg:p-6">
                <div className={stepPanelClassName}>
                {renderedStep === 1 && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-green-700" />
                      </div>
                      <div className="pt-1">
                        <div className="text-xs font-semibold tracking-widest text-green-700">STEP 1 OF 4</div>
                        <div className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">Enter Your Phone</div>
                        <div className="mt-2 text-sm text-gray-600">We&apos;ll send a verification code to confirm your number.</div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-900">Phone Number <span className="text-red-500">*</span></label>
                      <div className="mt-2 flex items-center border border-green-200 rounded-2xl overflow-hidden bg-white">
                        <div className="px-4 py-3 text-sm font-semibold text-green-700 bg-green-50 border-r border-green-200 whitespace-nowrap">TZ +255</div>
                        <input
                          type="tel"
                          name="phone"
                          value={String(formData.phone || '').replace(/[^0-9]/g, '').replace(/^255/, '').replace(/^0+/, '')}
                          onChange={handleChange}
                          className="w-full px-4 py-3 outline-none text-gray-900 placeholder-gray-400"
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
                          className="w-full px-4 py-3 border border-green-200 rounded-2xl bg-white text-gray-900 outline-none"
                        >
                          <option value="Tanzania">Tanzania tz</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <div className="text-xs font-semibold tracking-widest text-gray-500">OR SIGN UP WITH</div>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button type="button" className="w-full py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900 flex items-center justify-center gap-2">
                        <FaGoogle />
                        <span>Google</span>
                      </button>
                      <button type="button" className="w-full py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900 flex items-center justify-center gap-2">
                        <FaFacebookF className="text-blue-600" />
                        <span>Facebook</span>
                      </button>
                    </div>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="agreeToTerms" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange} className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-0.5" />
                      <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                        By continuing, I agree to the{' '}
                        <a href="/terms" className="text-green-700 underline">Terms of Service</a> and{' '}
                        <a href="/privacy" className="text-green-700 underline">Privacy Policy</a>
                      </label>
                    </div>
                    {errors.agreeToTerms ? <div className="text-red-600 text-sm -mt-2">{errors.agreeToTerms}</div> : null}
                    <button type="button" className="w-full px-5 py-3 rounded-2xl bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 text-lg font-semibold" onClick={handleNextFromStep1} disabled={isSubmitting}>
                      {isSubmitting ? <span className="w-5 h-5 rounded-full border-2 border-white/70 border-t-white animate-spin" /> : null}
                      <span>Send OTP Code</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {renderedStep === 2 && (
                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
                        <KeyRound className="w-6 h-6 text-green-700" />
                      </div>
                      <div className="pt-1">
                        <div className="text-xs font-semibold tracking-widest text-green-700">STEP 2 OF 4</div>
                        <div className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">Verify OTP Code</div>
                        <div className="mt-2 text-sm text-gray-600">
                          Enter the 6-digit code sent to{' '}
                          <span className="text-green-700 font-semibold">
                            +255{' '}
                            {(() => {
                              const phoneDigits = String(formData.phone || '').replace(/[^0-9]/g, '');
                              const local = phoneDigits.startsWith('255') ? phoneDigits.slice(3) : phoneDigits;
                              if (!local) return '7XX XXX XXX';
                              const first = local.slice(0, 1) || '7';
                              return `${first}XX XXX XXX`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="grid grid-cols-6 gap-3"
                      onPaste={(e) => {
                        const pasted = String(e.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
                        if (!pasted) return;
                        e.preventDefault();
                        setOtpInput(pasted);
                        setErrors((prev) => ({ ...prev, otp: '' }));
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
                            const el = otpRefs.current[Math.min(5, i + 1)];
                            if (el && typeof el.focus === 'function') el.focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !(otpInput[i] || '')) {
                              const el = otpRefs.current[Math.max(0, i - 1)];
                              if (el && typeof el.focus === 'function') el.focus();
                            }
                          }}
                          className={`h-14 w-full rounded-2xl border text-center text-xl font-semibold outline-none focus:ring-2 focus:ring-green-500 ${
                            errors.otp ? 'border-red-300 bg-red-50/40' : 'border-green-200 bg-white'
                          }`}
                          inputMode="numeric"
                          maxLength={1}
                        />
                      ))}
                    </div>
                    {errors.otp ? <div className="text-red-600 text-sm -mt-4">{errors.otp}</div> : null}

                    <div className="text-center text-sm text-gray-600">
                      Didn&apos;t receive code?{' '}
                      <button
                        type="button"
                        className="text-green-700 font-semibold hover:text-green-800 disabled:text-green-300"
                        disabled={otpResendSeconds > 0 || isSubmitting}
                        onClick={() => {
                          if (otpResendSeconds > 0) return;
                          sendOtp();
                          const el = otpRefs.current[0];
                          if (el && typeof el.focus === 'function') el.focus();
                        }}
                      >
                        {otpResendSeconds > 0 ? `Resend in 00:${String(otpResendSeconds).padStart(2, '0')}` : 'Resend'}
                      </button>
                    </div>

                    <button
                      type="button"
                      className="w-full px-5 py-3 rounded-2xl bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 text-lg font-semibold"
                      onClick={handleVerifyOtp}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <span className="w-5 h-5 rounded-full border-2 border-white/70 border-t-white animate-spin" /> : null}
                      <span>Verify &amp; Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className="w-full px-5 py-3 rounded-2xl bg-white border border-green-200 text-gray-900 hover:bg-green-50 flex items-center justify-center gap-2 text-lg font-semibold"
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
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
                        <User className="w-6 h-6 text-green-700" />
                      </div>
                      <div className="pt-1">
                        <div className="text-xs font-semibold tracking-widest text-green-700">STEP 3 OF 4</div>
                        <div className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">Your Profile</div>
                        <div className="mt-2 text-sm text-gray-600">Tell us a little about yourself to personalise your account.</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center overflow-hidden">
                          {profilePreview ? (
                            <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-7 h-7 text-green-700" />
                          )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center cursor-pointer shadow-md">
                          <Camera className="w-4 h-4" />
                          <input type="file" accept="image/*" onChange={handleProfileUpload} className="hidden" />
                        </label>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-green-700">Upload profile photo</div>
                        <div className="text-sm text-gray-600">JPG or PNG, max 2MB.</div>
                        <div className="text-sm text-gray-600">Optional but recommended.</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-900">First Name <span className="text-red-500">*</span></label>
                        <div className={`mt-2 flex items-center border rounded-2xl overflow-hidden bg-white ${errors.firstName ? 'border-red-300 bg-red-50/40' : 'border-green-200'}`}>
                          <div className="px-4 text-gray-400">
                            <User className="w-5 h-5" />
                          </div>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="w-full px-4 py-3 outline-none text-gray-900 placeholder-gray-400"
                            placeholder="e.g. Amani"
                          />
                        </div>
                        {errors.firstName ? <div className="text-red-600 text-sm mt-2">{errors.firstName}</div> : null}
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-900">Last Name <span className="text-red-500">*</span></label>
                        <div className={`mt-2 flex items-center border rounded-2xl overflow-hidden bg-white ${errors.lastName ? 'border-red-300 bg-red-50/40' : 'border-green-200'}`}>
                          <div className="px-4 text-gray-400">
                            <User className="w-5 h-5" />
                          </div>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full px-4 py-3 outline-none text-gray-900 placeholder-gray-400"
                            placeholder="e.g. Juma"
                          />
                        </div>
                        {errors.lastName ? <div className="text-red-600 text-sm mt-2">{errors.lastName}</div> : null}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-900">Phone Number (Verified)</label>
                      <div className="mt-2 flex items-center border border-green-200 rounded-2xl overflow-hidden bg-white">
                        <div className="px-4 py-3 text-sm font-semibold text-green-700 bg-green-50 border-r border-green-200 whitespace-nowrap flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          TZ +255
                        </div>
                        <input
                          type="tel"
                          name="email"
                          value={String(formData.phone || '').replace(/[^0-9]/g, '').replace(/^255/, '').replace(/^0+/, '')}
                          readOnly
                          className="w-full px-4 py-3 outline-none text-gray-900 placeholder-gray-400"
                          placeholder="7XX XXX XXX"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-900">Password <span className="text-red-500">*</span></label>
                        <div className={`mt-2 flex items-center border rounded-2xl overflow-hidden bg-white ${errors.password ? 'border-red-300' : 'border-green-200'}`}>
                          <div className="px-4 text-gray-400">
                            <KeyRound className="w-5 h-5" />
                          </div>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-4 py-3 outline-none text-gray-900 placeholder-gray-400"
                            placeholder="Min 8 characters"
                          />
                          <button type="button" className="px-4 text-gray-400" onClick={() => setShowPassword((v) => !v)}>
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {errors.password ? <div className="text-red-600 text-sm mt-2">{errors.password}</div> : null}
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-900">Confirm Password <span className="text-red-500">*</span></label>
                        <div className={`mt-2 flex items-center border rounded-2xl overflow-hidden bg-white ${errors.confirmPassword ? 'border-red-300' : 'border-green-200'}`}>
                          <div className="px-4 text-gray-400">
                            <KeyRound className="w-5 h-5" />
                          </div>
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full px-4 py-3 outline-none text-gray-900 placeholder-gray-400"
                            placeholder="Repeat password"
                          />
                          <button type="button" className="px-4 text-gray-400" onClick={() => setShowConfirmPassword((v) => !v)}>
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {errors.confirmPassword ? <div className="text-red-600 text-sm mt-2">{errors.confirmPassword}</div> : null}
                      </div>
                    </div>

                    {(() => {
                      const password = String(formData.password || '');
                      const lengthScore = Math.min(3, Math.floor(password.length / 4));
                      const hasNumber = /[0-9]/.test(password) ? 1 : 0;
                      const hasLetter = /[A-Za-z]/.test(password) ? 1 : 0;
                      const score = Math.min(3, lengthScore + hasNumber + hasLetter);
                      const label = score >= 3 ? 'Strong' : score >= 2 ? 'Medium' : 'Weak';
                      const color = score >= 3 ? 'bg-green-500' : score >= 2 ? 'bg-yellow-400' : 'bg-red-400';
                      return (
                        <div className="-mt-2">
                          <div className="flex items-center gap-2">
                            <div className={`h-1.5 flex-1 rounded-full ${score >= 1 ? color : 'bg-gray-200'}`} />
                            <div className={`h-1.5 flex-1 rounded-full ${score >= 2 ? color : 'bg-gray-200'}`} />
                            <div className={`h-1.5 flex-1 rounded-full ${score >= 3 ? color : 'bg-gray-200'}`} />
                          </div>
                          <div className="mt-2 text-sm text-gray-700">
                            Password strength: <span className={score >= 3 ? 'text-green-700 font-semibold' : score >= 2 ? 'text-yellow-700 font-semibold' : 'text-red-600 font-semibold'}>{label}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="text-sm font-semibold text-gray-900">Role</label>
                      <div className="mt-2 flex items-center border border-green-200 rounded-2xl overflow-hidden bg-white">
                        <div className="px-4 text-gray-400">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          name="role"
                          value="Owner / Manager"
                          readOnly
                          className="w-full px-4 py-3 outline-none text-gray-900 placeholder-gray-400"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full px-5 py-3 rounded-2xl bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 text-lg font-semibold"
                      onClick={handleNextFromStep3}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <span className="w-5 h-5 rounded-full border-2 border-white/70 border-t-white animate-spin" /> : null}
                      <span>Save &amp; Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className="w-full px-5 py-3 rounded-2xl bg-white border border-green-200 text-gray-900 hover:bg-green-50 flex items-center justify-center gap-2 text-lg font-semibold"
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
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-green-700" />
                      </div>
                      <div className="pt-1">
                        <div className="text-xs font-semibold tracking-widest text-green-700">STEP 4 OF 4</div>
                        <div className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">Business Setup</div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-900">Business Logo</label>
                      <div className="mt-3 flex items-center gap-6">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center overflow-hidden">
                            {logoPreview ? (
                              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="w-7 h-7 text-green-700" />
                            )}
                          </div>
                          <label className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center cursor-pointer shadow-md">
                            <Camera className="w-4 h-4" />
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-green-700">{logoPreview ? 'Logo selected' : 'Upload business logo'}</div>
                          <div className="text-sm text-gray-600">JPG or PNG, max 2MB.</div>
                          <div className="text-sm text-gray-600">Optional.</div>
                          {logoPreview ? (
                            <button type="button" className="mt-1 text-sm text-green-700 hover:text-green-800 underline" onClick={() => setLogoPreview('')}>
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-900">Business Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className={`mt-2 w-full px-4 py-3 border rounded-2xl outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.companyName ? 'border-red-300 bg-red-50/40' : 'border-green-200 bg-white'
                        }`}
                        placeholder="e.g. Amani General Store"
                      />
                      {errors.companyName ? <div className="text-red-600 text-sm mt-2">{errors.companyName}</div> : null}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-900">City / Town <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="locationCity"
                        value={formData.locationCity}
                        onChange={handleChange}
                        className={`mt-2 w-full px-4 py-3 border rounded-2xl outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.locationCity ? 'border-red-300 bg-red-50/40' : 'border-green-200 bg-white'
                        }`}
                        placeholder="e.g. Arusha"
                      />
                      {errors.locationCity ? <div className="text-red-600 text-sm mt-2">{errors.locationCity}</div> : null}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-900">TIN Number</label>
                        <input
                          type="text"
                          name="taxId"
                          value={formData.taxId}
                          onChange={handleChange}
                          className="mt-2 w-full px-4 py-3 border border-green-200 rounded-2xl bg-white text-gray-900 outline-none"
                          placeholder="e.g. 100-200-300"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-900">VAT Registration</label>
                        <input
                          type="text"
                          name="vatRegistration"
                          value={formData.vatRegistration}
                          onChange={handleChange}
                          className="mt-2 w-full px-4 py-3 border border-green-200 rounded-2xl bg-white text-gray-900 outline-none"
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-900">Business Address</label>
                      <textarea
                        name="businessAddress"
                        value={formData.businessAddress}
                        onChange={handleChange}
                        rows={2}
                        className="mt-2 w-full px-4 py-3 border border-green-200 rounded-2xl bg-white text-gray-900 outline-none resize-none"
                        placeholder="Street, area, city..."
                      />
                    </div>

                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="agreeBusinessTerms" name="agreeBusinessTerms" checked={formData.agreeBusinessTerms} onChange={handleChange} className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-0.5" />
                      <label htmlFor="agreeBusinessTerms" className="text-sm text-gray-700">
                        I confirm all business information is accurate and I accept the{' '}
                        <a href="/terms" className="text-green-700 underline">Platform Terms</a>.
                      </label>
                    </div>
                    {errors.agreeBusinessTerms ? <div className="text-red-600 text-sm -mt-2">{errors.agreeBusinessTerms}</div> : null}

                    <button
                      type="button"
                      className="w-full px-5 py-3 rounded-2xl bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 text-lg font-semibold"
                      onClick={handleNextFromStep4}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <span className="w-5 h-5 rounded-full border-2 border-white/70 border-t-white animate-spin" /> : null}
                      <span>Complete Setup</span>
                    </button>
                    <button
                      type="button"
                      className="w-full px-5 py-3 rounded-2xl bg-white border border-green-200 text-gray-900 hover:bg-green-50 flex items-center justify-center gap-2 text-lg font-semibold"
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
        <div className="mt-2 text-sm text-gray-600">Drag to reposition, then adjust zoom.</div>
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
          <div className="sticky top-0 z-30 bg-white/55 backdrop-blur-2xl border-b border-white/50">
            <div className="px-6 lg:px-12 py-4">
              <div className="flex items-center justify-center gap-3 leading-none">
                <span className="text-4xl md:text-5xl font-extrabold text-green-600 tracking-tight">Duka</span>
                <div className="flex items-center leading-none">
                  <span className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Hub</span>
                  <span className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">n</span>
                  <span className="inline-flex items-center justify-center w-[54px] h-[54px] rounded-full bg-green-600 align-middle -mx-2">
                    <RiShoppingCart2Line className="text-white" size={34} />
                  </span>
                  <span className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">w</span>
                </div>
              </div>
            </div>
          </div>
          {content}
        </div>
      </div>
      {cropModal}
    </div>
  );
};

export default SignUp;
