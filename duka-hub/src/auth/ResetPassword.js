import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, Phone } from 'lucide-react';
import { RiShoppingCart2Line } from 'react-icons/ri';
import { sendOtp } from '../services/otpService';
import { authApi } from '../services/backendApi';

const ResetPassword = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    phone: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSentTo, setOtpSentTo] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpRefs = useRef([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');

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

  const formatTzDisplay = (normalized255) => {
    const digits = String(normalized255 || '').replace(/[^0-9]/g, '');
    const local = digits.startsWith('255') ? digits.slice(3) : digits;
    if (!local) return '';
    return `+255 ${local}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === 'phone'
        ? (() => {
            const raw = String(value || '');
            const digits = raw.replace(/[^0-9]/g, '');
            if (!digits) return '+255 ';
            const withoutCountry = digits.startsWith('255') ? digits.slice(3) : digits;
            const local = String(withoutCountry || '').replace(/^0+/, '');
            return `+255 ${local}`;
          })()
        : value;

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue
    }));
    if (name === 'phone') setOtpSentTo('');
    if (name === 'phone') setApiError('');
    if (name === 'newPassword' || name === 'confirmPassword') setSuccess('');
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    // Validation
    const newErrors = {};
    const phone = String(formData.phone || '').trim();
    const local = String(phone || '').replace(/[^0-9]/g, '').replace(/^255/, '').replace(/^0+/, '');
    if (!local) {
      newErrors.phone = 'Phone number is required';
    } else if (!normalizeTzPhone(phone)) {
      newErrors.phone = 'Phone number is invalid';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      const normalized = normalizeTzPhone(phone);
      if (!normalized) {
        setErrors({ phone: 'Phone number is invalid' });
        return;
      }
      setIsSubmitting(true);
      setApiError('');
      setSuccess('');
      try {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await authApi.passwordResetRequest({ phone: normalized, otp: code });
        await sendOtp({ phone: normalized, otp: code });
        setGeneratedOtp(code);
        setOtp('');
        setOtpSentTo(formatTzDisplay(normalized));
        setStep(2);
        setResendCountdown(60);
        setTimeout(() => {
          const el = otpRefs.current[0];
          if (el && typeof el.focus === 'function') el.focus();
        }, 0);
      } catch (err) {
        setApiError(String(err?.message || 'Failed to send OTP. Please try again.'));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  useEffect(() => {
    if (step === 2 && resendCountdown > 0) {
      const timer = setInterval(() => {
        setResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, resendCountdown]);

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    const trimmed = (otp || '').replace(/\D/g, '').slice(0, 6);
    const p1 = String(formData.newPassword || '');
    const p2 = String(formData.confirmPassword || '');
    const nextErrors = {};
    if (!trimmed || trimmed.length !== 6) nextErrors.otp = 'Enter the 6-digit code';
    if (!p1) nextErrors.newPassword = 'New password is required';
    if (!p2) nextErrors.confirmPassword = 'Please confirm your password';
    if (p1 && p2 && p1 !== p2) nextErrors.confirmPassword = 'Passwords do not match';
    if (trimmed && trimmed.length === 6 && generatedOtp && trimmed !== generatedOtp) nextErrors.otp = 'Invalid code. Try again';
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length > 0) return;
    setIsSubmitting(true);
    setApiError('');
    setSuccess('');
    Promise.resolve()
      .then(() => authApi.passwordResetConfirm({ phone: String(formData.phone || '').trim(), otp: trimmed, newPassword: p1 }))
      .then(() => setSuccess('Password updated successfully. You can now login.'))
      .catch((err) => setApiError(String(err?.message || 'Unable to reset password. Try again.')))
      .finally(() => setIsSubmitting(false));
  };

  const handleResendOtp = async () => {
    if (resendCountdown !== 0) return;
    if (isSubmitting) return;
    const phone = String(formData.phone || '').trim();
    const normalized = normalizeTzPhone(phone);
    if (!normalized) {
      setErrors((prev) => ({ ...prev, phone: 'Phone number is required' }));
      return;
    }
    setIsSubmitting(true);
    setApiError('');
    setSuccess('');
    try {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await authApi.passwordResetRequest({ phone: normalized, otp: code });
      await sendOtp({ phone: normalized, otp: code });
      setGeneratedOtp(code);
      setOtp('');
      setResendCountdown(60);
      setErrors((prev) => ({ ...prev, otp: '' }));
      const el = otpRefs.current[0];
      if (el && typeof el.focus === 'function') el.focus();
    } catch (err) {
      setApiError(String(err?.message || 'Failed to resend OTP. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-32 h-32 rounded-full bg-green-600 flex items-center justify-center">
              <RiShoppingCart2Line className="text-white drop-shadow-sm" size={92} />
            </div>
          </div>
        </div>

        {step === 1 ? (
          // Step 1: Enter Phone
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600">Enter your phone number to reset your password</p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-gray-900">Phone Number <span className="text-red-500">*</span></label>
                <div className={`mt-2 flex items-center border rounded-2xl overflow-hidden bg-white ${errors.phone ? 'border-red-300 bg-red-50/40' : 'border-green-200'}`}>
                  <div className="px-4 py-3 text-sm font-semibold text-green-700 bg-green-50 border-r border-green-200 whitespace-nowrap flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    TZ +255
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={String(formData.phone || '').replace(/[^0-9]/g, '').replace(/^255/, '').replace(/^0+/, '')}
                    onChange={handleChange}
                    className="w-full px-4 py-3 outline-none text-gray-900 placeholder-gray-400"
                    placeholder="7XX XXX XXX"
                    inputMode="numeric"
                  />
                </div>
                {errors.phone && <p className="mt-2 text-sm text-red-600">{errors.phone}</p>}
                {apiError ? <p className="mt-2 text-sm text-red-600">{apiError}</p> : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={isSubmitting ? 'w-full bg-green-600/70 text-white py-3 px-4 rounded-lg cursor-not-allowed font-medium' : 'w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium'}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isSubmitting ? <span className="w-5 h-5 rounded-full border-2 border-white/70 border-t-white animate-spin" /> : null}
                  <span>Send OTP Code</span>
                </span>
              </button>
            </form>
          </div>
        ) : step === 2 ? (
          // Step 2: Enter OTP
          <div>
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-green-700" />
                </div>
                <div className="pt-1">
                  <div className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">Verify OTP Code</div>
                  <div className="mt-2 text-sm text-gray-600">
                    Enter the 6-digit code sent to <span className="text-green-700 font-semibold">{otpSentTo || formData.phone}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div
                  className="grid grid-cols-6 gap-3"
                  onPaste={(e) => {
                    const pasted = String(e.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
                    if (!pasted) return;
                    e.preventDefault();
                    setOtp(pasted);
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
                      value={(otp || '')[i] || ''}
                      onChange={(e) => {
                        const raw = String(e.target.value || '');
                        const digits = raw.replace(/[^0-9]/g, '');
                        if (!digits) {
                          const next = String(otp || '').padEnd(6, ' ').split('');
                          next[i] = '';
                          setOtp(next.join('').replace(/\s/g, '').slice(0, 6));
                          return;
                        }
                        const d = digits.slice(-1);
                        const next = String(otp || '').padEnd(6, ' ').split('');
                        next[i] = d;
                        const merged = next.join('').replace(/\s/g, '').slice(0, 6);
                        setOtp(merged);
                        setErrors((prev) => ({ ...prev, otp: '' }));
                        const el = otpRefs.current[Math.min(5, i + 1)];
                        if (el && typeof el.focus === 'function') el.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !((otp || '')[i] || '')) {
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
                {apiError ? <div className="text-red-600 text-sm -mt-2">{apiError}</div> : null}
                {success ? <div className="text-green-700 text-sm -mt-2">{success}</div> : null}

                <div className="text-center text-sm text-gray-600">
                  Didn&apos;t receive code?{' '}
                  <button
                    type="button"
                    className="text-green-700 font-semibold hover:text-green-800 disabled:text-green-300"
                    disabled={resendCountdown > 0 || isSubmitting}
                    onClick={() => {
                      if (resendCountdown > 0) return;
                      handleResendOtp();
                      const el = otpRefs.current[0];
                      if (el && typeof el.focus === 'function') el.focus();
                    }}
                  >
                    {resendCountdown > 0 ? `Resend in 00:${String(resendCountdown).padStart(2, '0')}` : 'Resend'}
                  </button>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-2xl border outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.newPassword ? 'border-red-300 bg-red-50/40' : 'border-green-200 bg-white'
                    }`}
                    placeholder="Enter new password"
                  />
                  {errors.newPassword ? <div className="mt-2 text-sm text-red-600">{errors.newPassword}</div> : null}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-2xl border outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.confirmPassword ? 'border-red-300 bg-red-50/40' : 'border-green-200 bg-white'
                    }`}
                    placeholder="Confirm new password"
                  />
                  {errors.confirmPassword ? <div className="mt-2 text-sm text-red-600">{errors.confirmPassword}</div> : null}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={isSubmitting ? 'w-full px-5 py-3 rounded-2xl bg-green-600/70 text-white cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold' : 'w-full px-5 py-3 rounded-2xl bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 text-lg font-semibold'}
                >
                  {isSubmitting ? <span className="w-5 h-5 rounded-full border-2 border-white/70 border-t-white animate-spin" /> : null}
                  <span>Reset Password</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="w-full px-5 py-3 rounded-2xl bg-white border border-green-200 text-gray-900 hover:bg-green-50 flex items-center justify-center gap-2 text-lg font-semibold"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                    setGeneratedOtp('');
                    setErrors((prev) => ({ ...prev, otp: '' }));
                    setApiError('');
                    setSuccess('');
                  }}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {/* Back to Login */}
        <div className="text-center">
          <Link 
            to="/login" 
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
