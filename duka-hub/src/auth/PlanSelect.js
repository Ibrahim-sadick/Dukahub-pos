import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Crown, Gem, Rocket, X } from 'lucide-react';
import { initiatePayment, verifyPayment } from '../services/paymentService';
import { clearSignupDraft, getSignupDraft, setSignupDraft } from '../services/signupDraft';
import { getCurrentUserSync, registerOwner } from '../services/authApi';
import { businessApi } from '../services/businessApi';
import { normalizeTzPhone255, setCurrentUserSync } from '../services/localAuth';

const DEFAULT_SIGNUP_MODULE = 'retail_supermarket';

const setLocalJson = (key, value) => {
  try {
    window.localStorage.setItem(String(key || ''), JSON.stringify(value));
  } catch {}
};

const PlanSelect = ({ onSignUp }) => {
  const navigate = useNavigate();
  const isDev = process.env.NODE_ENV !== 'production';
  const [draft, setDraft] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [billingCycle, setBillingCycle] = useState('1m');
  const [error, setError] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentFlow, setPaymentFlow] = useState('idle');
  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState(60);
  const [renewalMode, setRenewalMode] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingKey, setLoadingKey] = useState('');
  const paymentPollTimerRef = useRef(null);
  const paymentCountdownTimerRef = useRef(null);
  const paymentPollStartedAtRef = useRef(0);

  const stopPaymentPolling = () => {
    if (paymentPollTimerRef.current) {
      clearInterval(paymentPollTimerRef.current);
      paymentPollTimerRef.current = null;
    }
    if (paymentCountdownTimerRef.current) {
      clearInterval(paymentCountdownTimerRef.current);
      paymentCountdownTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPaymentPolling();
  }, []);

  const logPayment = (event, payload) => {
    if (!isDev) return;
    try {
      // eslint-disable-next-line no-console
      console.log(`[plan-payment] ${event}`, payload);
    } catch {}
  };

  const resetPaymentState = () => {
    stopPaymentPolling();
    setPaymentReference('');
    setPaymentFlow('idle');
    setPaymentSecondsLeft(60);
    setCheckoutError('');
    setIsSubmitting(false);
    setLoadingKey('');
  };

  const plans = useMemo(() => {
    return [
      {
        id: 'starter',
        title: 'Starter',
        pricePerMonth: 15000,
        Icon: Rocket,
        highlight: false,
        durationDays: 30,
        userLimit: 3,
        caption: 'Perfect to start',
        features: ['1 module', 'Basic reports', 'Inventory & sales', 'Standard support']
      },
      {
        id: 'professional',
        title: 'Professional',
        pricePerMonth: 35000,
        Icon: Gem,
        highlight: true,
        durationDays: 30,
        userLimit: 6,
        caption: 'Best for growing teams',
        features: ['1 module', 'Advanced reports', 'User roles', 'Priority support']
      },
      {
        id: 'enterprise',
        title: 'Enterprise',
        pricePerMonth: 60000,
        Icon: Crown,
        highlight: false,
        durationDays: 30,
        userLimit: 12,
        caption: 'For large operations',
        features: ['1 module', 'All reports', 'Multi-user access', 'Dedicated support']
      }
    ];
  }, []);

  const billingOptions = useMemo(
    () => [
      { id: '1m', label: '1 Month', months: 1, discountPercent: 0 },
      { id: '3m', label: '3 Months', months: 3, discountPercent: 0 },
      { id: '6m', label: '6 Months', months: 6, discountPercent: 0 },
      { id: '1y', label: '1 Year', months: 12, discountPercent: 0 }
    ],
    []
  );

  const visibleBillingOptions = useMemo(() => billingOptions, [billingOptions]);

  useEffect(() => {
    const parsed = getSignupDraft();
    if (parsed?.otpVerified && parsed?.formData) {
      if (!String(parsed?.formData?.password || '').trim()) {
        clearSignupDraft();
        navigate('/signup', { replace: true });
        return;
      }
      const selectedModule = String(parsed?.selectedModule || '').trim() || DEFAULT_SIGNUP_MODULE;
      const nextParsed = selectedModule === String(parsed?.selectedModule || '').trim() ? parsed : { ...parsed, selectedModule };
      if (nextParsed !== parsed) {
        try {
          setSignupDraft(nextParsed);
        } catch {}
      }
      setRenewalMode(false);
      setPhoneExists(false);
      setDraft(nextParsed);
      setSelectedPlan(String(nextParsed?.selectedPlan || '').trim() || 'starter');
      setBillingCycle(String(nextParsed?.billingCycle || '').trim() || '1m');
      setPaymentPhone('');
      return;
    }

    const currentUser = getCurrentUserSync();
    if (currentUser) {
      const billingFromUserRaw = String(currentUser.subscriptionBillingCycle || '').trim() || '1m';
      const billingFromUser = ['1m', '3m', '6m', '1y'].includes(billingFromUserRaw) ? billingFromUserRaw : '1m';
      const nextDraft = {
        otpVerified: true,
        selectedModule: String(currentUser.businessModule || '').trim() || DEFAULT_SIGNUP_MODULE,
        billingCycle: billingFromUser,
        selectedPlan: String(currentUser.subscriptionPlan || '').trim() || '',
        logoPreview: '',
        formData: {
          companyName: String(currentUser.businessName || '').trim(),
          taxId: '',
          location: '',
          website: '',
          businessDescription: '',
          fullName: String(currentUser.fullName || '').trim(),
          email: String(currentUser.email || '').trim(),
          phone: String(currentUser.phone || '').trim(),
          password: ''
        }
      };
      setRenewalMode(true);
      setPhoneExists(false);
      setDraft(nextDraft);
      setSelectedPlan(String(nextDraft.selectedPlan || '').trim() || 'starter');
      setBillingCycle(billingFromUser);
      setPaymentPhone(String(currentUser?.paymentPhone || '').replace(/[^0-9]/g, '').replace(/^0/, '').replace(/^255/, ''));
      setPaymentProvider(String(currentUser?.paymentProvider || '').trim());
      return;
    }
    navigate('/signup', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (renewalMode) return;
    setPhoneExists(false);
  }, [renewalMode, draft?.formData?.phone]);

  const activeBilling = visibleBillingOptions.find((b) => b.id === billingCycle) || visibleBillingOptions[0];
  // eslint-disable-next-line no-unused-vars
  const isStarterTrial = !renewalMode && String(selectedPlan || '').trim() === 'starter';

  const getPricing = (plan) => {
    const rawMonthly = Number(plan?.pricePerMonth ?? plan?.price ?? 0);
    const monthsRaw = Number(activeBilling?.months ?? 1);
    const months = Number.isFinite(monthsRaw) ? Math.max(0, monthsRaw) : 1;
    const discountPercent = 0;
    const discountedMonthly = rawMonthly;
    const total = months > 0 ? Math.round(rawMonthly * months) : 0;
    return { months, discountPercent, rawMonthly, discountedMonthly, total };
  };

  const delayToFiveSeconds = async (startedAt) => {
    const elapsed = Date.now() - startedAt;
    const remaining = 5000 - elapsed;
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  };

  const handleCreateAccount = async (planId, payment, options = {}) => {
    const pickedPlan = String(planId || selectedPlan || '').trim();
    if (!pickedPlan) {
      setError('Please choose a monthly plan');
      return;
    }
    if (!draft?.formData) {
      navigate('/signup', { replace: true });
      return;
    }

    const pickedModule = String(draft?.selectedModule || '').trim() || DEFAULT_SIGNUP_MODULE;

    const plan = plans.find((p) => p.id === pickedPlan);
    if (!plan) {
      setError('Invalid plan. Please select again.');
      return;
    }

    const pricing = getPricing(plan);
    const now = Date.now();
    const subscriptionStartedAt = new Date(now).toISOString();
    const hasTrial = !renewalMode && String(plan.id || '') === 'starter';
    const trialDays = hasTrial ? 7 : 0;
    const paidDurationDays = (Number(plan.durationDays || 30) || 30) * (Number(pricing.months || 0) || 0);
    const subscriptionDurationDays = hasTrial ? 7 : paidDurationDays;
    const paidEndsAt = new Date(now + paidDurationDays * 24 * 60 * 60 * 1000).toISOString();
    const subscriptionTrialEndsAt = hasTrial ? new Date(now + trialDays * 24 * 60 * 60 * 1000).toISOString() : '';
    const subscriptionEndsAt = hasTrial ? subscriptionTrialEndsAt : paidEndsAt;
    const paymentProviderValue = String(payment?.provider || '').trim();
    const paymentPhoneValue = String(payment?.phone || '').trim();
    const paymentReferenceValue = String(payment?.reference || '').trim();
    const paymentStatus = hasTrial ? 'trial' : 'paid';
    const amountPaid = hasTrial ? 0 : pricing.total;

    const formData = draft.formData;
    // eslint-disable-next-line no-unused-vars
    const phone = String(formData.phone || '').trim();
    if (renewalMode) {
      const user = getCurrentUserSync() || {};
      const next = {
        ...user,
        subscriptionPlan: String(plan.id || ''),
        subscriptionPaymentStatus: paymentStatus,
        subscriptionStartedAt,
        subscriptionEndsAt,
        subscriptionTrialEndsAt: subscriptionTrialEndsAt ? subscriptionTrialEndsAt : '',
        subscriptionDurationDays,
        subscriptionMonths: pricing.months,
        subscriptionDiscountPercent: pricing.discountPercent,
        subscriptionRawMonthlyPrice: Number(plan.pricePerMonth ?? 0),
        subscriptionAmountPaid: amountPaid,
        subscriptionBillingCycle: String(activeBilling?.id || ''),
        paymentProvider: paymentProviderValue,
        paymentPhone: paymentPhoneValue
      };
      setCurrentUserSync(next);
      const subscriptionSnapshot = {
        subscriptionPlan: String(next.subscriptionPlan || ''),
        subscriptionPaymentStatus: String(next.subscriptionPaymentStatus || ''),
        subscriptionStartedAt: String(next.subscriptionStartedAt || ''),
        subscriptionEndsAt: String(next.subscriptionEndsAt || ''),
        subscriptionTrialEndsAt: String(next.subscriptionTrialEndsAt || ''),
        subscriptionDurationDays: Number(next.subscriptionDurationDays || 0) || 0,
        subscriptionMonths: Number(next.subscriptionMonths || 0) || 0,
        subscriptionDiscountPercent: Number(next.subscriptionDiscountPercent || 0) || 0,
        subscriptionRawMonthlyPrice: Number(next.subscriptionRawMonthlyPrice || 0) || 0,
        subscriptionAmountPaid: Number(next.subscriptionAmountPaid || 0) || 0,
        subscriptionBillingCycle: String(next.subscriptionBillingCycle || ''),
        paymentProvider: String(paymentProviderValue || ''),
        paymentPhone: String(paymentPhoneValue || ''),
        paymentReference: String(paymentReferenceValue || '')
      };
      setLocalJson('companyInfo', {
        companyName: String(next.businessName || ''),
        phone: String(next.phone || ''),
        email: String(next.email || ''),
        location: String(next.location || ''),
        subscriptionPlan: next.subscriptionPlan,
        subscriptionPaymentStatus: next.subscriptionPaymentStatus,
        subscriptionStartedAt: next.subscriptionStartedAt,
        subscriptionEndsAt: next.subscriptionEndsAt,
        subscriptionTrialEndsAt: next.subscriptionTrialEndsAt
        ,
        subscriptionDurationDays: next.subscriptionDurationDays
      });
      await businessApi.updateSubscription(subscriptionSnapshot).catch(() => null);
      clearSignupDraft();

    setIsSubmitting(true);
    setLoadingKey('checkout:finalizing');
    closeCheckout();
    navigate('/dashboard', { replace: true });
    setIsSubmitting(false);
    setLoadingKey('');
      return;
    }

    try {
      const businessName = String(formData.companyName || '').trim();
      const ownerFullName = String(formData.fullName || '').trim();
      const ownerPhone = String(formData.phone || '').trim();
      const ownerEmail = formData.email ? String(formData.email || '').trim() : '';
      const ownerPassword = String(formData.password || '');
      if (!ownerFullName) throw new Error('Full name is required');
      if (!ownerPhone || !ownerPassword) throw new Error('Phone and password are required');
      if (ownerPassword.length < 8) throw new Error('Password must be at least 8 characters');
      const phone255 = normalizeTzPhone255(ownerPhone);
      if (!phone255) throw new Error('Phone number is invalid');
      const registeredUser = await registerOwner({
        fullName: ownerFullName,
        email: ownerEmail,
        phone: phone255,
        password: ownerPassword,
        businessName,
        businessModule: String(pickedModule || '').trim(),
        subscriptionPlan: String(plan.id || ''),
        subscriptionPaymentStatus: paymentStatus,
        subscriptionStartedAt,
        subscriptionEndsAt,
        subscriptionTrialEndsAt: subscriptionTrialEndsAt || undefined,
        subscriptionBillingCycle: String(activeBilling?.id || ''),
        subscriptionDurationDays,
        subscriptionMonths: pricing.months,
        subscriptionDiscountPercent: pricing.discountPercent,
        subscriptionRawMonthlyPrice: Number(plan.pricePerMonth ?? 0),
        subscriptionAmountPaid: amountPaid,
        paymentProvider: paymentProviderValue || undefined,
        paymentPhone: paymentPhoneValue || undefined,
        paymentReference: paymentReferenceValue || undefined
      });
      const nextUser = {
        ...registeredUser,
        profilePhoto: String(draft?.profilePreview || registeredUser?.profilePhoto || '').trim()
      };
      setCurrentUserSync(nextUser);
      setLocalJson('companyInfo', {
        companyName: businessName,
        email: ownerEmail,
        phone: phone255,
        businessAddress: String(formData.businessAddress || '').trim(),
        location: String(formData.location || '').trim(),
        locationCity: String(formData.locationCity || '').trim(),
        tin: String(formData.taxId || '').trim(),
        taxId: String(formData.taxId || '').trim(),
        vrn: String(formData.vatRegistration || '').trim(),
        vatRegistration: String(formData.vatRegistration || '').trim(),
        website: String(formData.website || '').trim(),
        businessDescription: String(formData.businessDescription || '').trim(),
        logo: String(draft?.logoPreview || '').trim(),
        subscriptionPlan: nextUser.subscriptionPlan,
        subscriptionPaymentStatus: nextUser.subscriptionPaymentStatus,
        subscriptionStartedAt: nextUser.subscriptionStartedAt,
        subscriptionEndsAt: nextUser.subscriptionEndsAt,
        subscriptionTrialEndsAt: nextUser.subscriptionTrialEndsAt
        ,
        subscriptionDurationDays: nextUser.subscriptionDurationDays
      });
      clearSignupDraft();
      if (options?.minDelayStartedAt) {
        await delayToFiveSeconds(options.minDelayStartedAt);
      }
      onSignUp && onSignUp();
      closeCheckout();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const code = String(err?.code || '');
      if (code === 'PHONE_ALREADY_EXISTS' || code === 'PHONE_EXISTS') {
        setPhoneExists(true);
        setCheckoutError('Phone number already exists. Please login instead.');
      } else setCheckoutError(String(err?.message || 'Unable to create account. Try again.'));
      return;
    }

  };

  const openCheckout = (planId) => {
    resetPaymentState();
    setCheckoutPlanId(planId);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    resetPaymentState();
    setCheckoutOpen(false);
    setCheckoutPlanId('');
  };

  const handleConfirmCheckout = async () => {
    if (isSubmitting) return;
    resetPaymentState();
    const planId = String(checkoutPlanId || '').trim();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const showTrial = !renewalMode && String(plan.id || '') === 'starter';
    const pricing = getPricing(plan);
    const totalToPay = showTrial ? 0 : pricing.total;
    if (showTrial) {
      const startedAt = Date.now();
      setIsSubmitting(true);
      setLoadingKey('checkout:confirm');
      await handleCreateAccount(planId, {}, { minDelayStartedAt: startedAt });
      return;
    }

    const digits = String(paymentPhone || '').replace(/[^0-9]/g, '');
    const normalized = digits.startsWith('0') ? digits.slice(1) : digits;
    const localDigits = normalized.startsWith('255') ? normalized.slice(3) : normalized;
    if (!localDigits) {
      setCheckoutError('Payment phone number is required');
      return;
    }
    if (!paymentProvider) {
      setCheckoutError('Please select payment provider');
      return;
    }
    setCheckoutError('');

    setIsSubmitting(true);
    setLoadingKey('checkout:confirm');
    setPaymentFlow('initiating');
    logPayment('initiate.start', { planId, amount: totalToPay });

    const fullPhone = `+255${localDigits}`;
    try {
      const init = await initiatePayment(fullPhone, totalToPay, paymentProvider);
      const ref = String(init?.data?.reference || init?.reference || init?.data?.ref || init?.ref || '').trim();
      if (!ref) {
        throw new Error('Payment initiation failed: missing reference');
      }
      setPaymentReference(ref);
      setPaymentFlow('pending');
      logPayment('reference.received', { reference: ref, amount: totalToPay });
      paymentPollStartedAtRef.current = Date.now();
      setPaymentSecondsLeft(60);
      paymentCountdownTimerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - paymentPollStartedAtRef.current) / 1000);
        const left = Math.max(0, 60 - elapsedSeconds);
        setPaymentSecondsLeft(left);
      }, 1000);

      const pollOnce = async () => {
        const elapsed = Date.now() - paymentPollStartedAtRef.current;
        if (elapsed >= 60000) {
          stopPaymentPolling();
          setPaymentFlow('timeout');
          logPayment('verify.timeout', { reference: ref });
          setIsSubmitting(false);
          setLoadingKey('');
          return 'timeout';
        }
        try {
          const res = await verifyPayment(ref);
          const st = String(res?.status || res?.data?.status || res?.data?.data?.status || res?.result?.status || '').toLowerCase();
          logPayment('verify.status', { reference: ref, status: st });
          if (st === 'success') {
            stopPaymentPolling();
            setPaymentFlow('success');
            setIsSubmitting(true);
            setLoadingKey('checkout:finalizing');
            await handleCreateAccount(planId, { provider: paymentProvider, phone: `+255 ${localDigits}`, reference: ref });
            return 'success';
          }
          if (st === 'payment expired' || st === 'expired') {
            stopPaymentPolling();
            setPaymentFlow('expired');
            setIsSubmitting(false);
            setLoadingKey('');
            return 'expired';
          }
          if (st === 'failed' || st === 'cancelled' || st === 'canceled' || st === 'rejected') {
            stopPaymentPolling();
            setPaymentFlow('error');
            setCheckoutError('Payment was not completed. Please try again.');
            setIsSubmitting(false);
            setLoadingKey('');
            return 'error';
          }
          setPaymentFlow('pending');
          return 'pending';
        } catch (e) {
          stopPaymentPolling();
          setPaymentFlow('error');
          setCheckoutError(String(e?.message || 'Payment verification failed'));
          setIsSubmitting(false);
          setLoadingKey('');
          return 'error';
        }
      };

      const first = await pollOnce();
      if (!paymentPollTimerRef.current && first === 'pending') {
        paymentPollTimerRef.current = setInterval(pollOnce, 3000);
      }
    } catch (e) {
      stopPaymentPolling();
      setPaymentFlow('error');
      const msg = String(e?.message || 'Payment initiation failed');
      const lower = msg.toLowerCase();
      const maybeDuplicate =
        lower.includes('already') || lower.includes('duplicate') || lower.includes('pending') || lower.includes('too many') || lower.includes('retry');
      setCheckoutError(
        maybeDuplicate
          ? 'A payment request may already be pending for this phone number. Please wait a moment, then try again.'
          : msg
      );
      setIsSubmitting(false);
      setLoadingKey('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100">
      {!checkoutOpen ? (
        <div className="min-h-screen w-full">
          <div className="min-h-screen w-full bg-white border border-gray-200 shadow-sm">
            <div className="px-5 lg:px-10 py-4 lg:py-5">
              <div className="max-w-5xl mx-auto">
                {!renewalMode ? (
                  <div className="flex items-center justify-start mb-2">
                    <button
                      type="button"
                      onClick={() => navigate('/signup')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 border border-gray-200 hover:bg-white text-gray-900 font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  </div>
                ) : null}
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-gray-900">{renewalMode ? 'Choose plan to unlock system' : 'Choose your plan'}</div>
                  <div className="mt-1 text-sm text-gray-700">{renewalMode ? 'Pay to continue using your system.' : 'Choose the best plan for your business.'}</div>
                </div>

                {error ? <div className="mt-4 text-red-600 text-sm text-center">{error}</div> : null}
                {!renewalMode && phoneExists ? (
                  <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
                    Phone number already exists. Please login instead.
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-center">
                  <div className="flex flex-wrap items-center justify-center gap-2 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                    {visibleBillingOptions.map((opt) => {
                      const active = opt.id === billingCycle;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          data-no-loading="true"
                          onClick={() => {
                            setBillingCycle(opt.id);
                            setError('');
                            try {
                              const nextDraft = { ...draft, billingCycle: opt.id, selectedPlan };
                              setSignupDraft(nextDraft);
                              setDraft(nextDraft);
                            } catch {}
                          }}
                          className={
                            active
                              ? 'relative px-4 py-2 rounded-full bg-green-600 text-white text-sm font-semibold shadow-sm transition-colors'
                              : 'relative px-4 py-2 rounded-full bg-transparent text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors'
                          }
                        >
                          <span className="inline-flex items-center gap-2">
                            <span>{opt.label}</span>
                          </span>
                          {opt.discountPercent ? (
                            <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-green-600 text-white text-[10px] font-extrabold shadow">
                              -{opt.discountPercent}%
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {plans.map((p) => {
                    const selected = selectedPlan === p.id;
                    const Icon = p.Icon;
                    const pricing = getPricing(p);
                    const showTrial = !renewalMode && p.id === 'starter';
                    const accent =
                      p.id === 'starter'
                        ? { title: 'text-emerald-700', iconBg: 'bg-emerald-50', iconText: 'text-emerald-700', ring: 'ring-emerald-200/70' }
                        : p.id === 'professional'
                        ? { title: 'text-indigo-700', iconBg: 'bg-indigo-50', iconText: 'text-indigo-700', ring: 'ring-indigo-200/70' }
                        : { title: 'text-amber-700', iconBg: 'bg-amber-50', iconText: 'text-amber-700', ring: 'ring-amber-200/70' };
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPlan(p.id);
                          setError('');
                          try {
                            const nextDraft = { ...draft, selectedPlan: p.id };
                            setSignupDraft(nextDraft);
                            setDraft(nextDraft);
                          } catch {}
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          setSelectedPlan(p.id);
                          setError('');
                          try {
                            const nextDraft = { ...draft, selectedPlan: p.id };
                            setSignupDraft(nextDraft);
                            setDraft(nextDraft);
                          } catch {}
                        }}
                        role="button"
                        tabIndex={0}
                        aria-disabled={false}
                        className={
                          selected
                            ? 'relative text-left bg-white border-2 border-green-500 rounded-3xl p-5 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01]'
                            : p.highlight
                            ? 'relative text-left bg-white border-2 border-green-200 rounded-3xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:scale-[1.01]'
                            : 'relative text-left bg-white border border-gray-200 rounded-3xl p-5 shadow-lg transition-all duration-300 hover:border-green-200 hover:-translate-y-1 hover:shadow-xl hover:scale-[1.01]'
                        }
                      >
                        {p.highlight ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold shadow">
                            MOST POPULAR
                          </div>
                        ) : null}
                        {showTrial ? (
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-800 text-xs font-semibold">
                            7 Days Free
                          </div>
                        ) : null}
                        <div className="flex items-start justify-between gap-3">
                          <div className={`w-10 h-10 rounded-2xl ${accent.iconBg} border border-gray-200 flex items-center justify-center shadow-sm ring-1 ${accent.ring}`}>
                            <Icon className={`w-5 h-5 ${accent.iconText}`} />
                          </div>
                          <div
                            className={
                              selected
                                ? 'w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center transition-transform duration-300 scale-105'
                                : 'w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center transition-transform duration-300'
                            }
                          >
                            <BadgeCheck className="w-4 h-4" />
                          </div>
                        </div>

                        <div className={`mt-4 text-lg font-semibold ${accent.title}`}>{p.title}</div>
                        <div className="mt-1.5 text-sm text-gray-600">{p.caption}</div>

                      <div className="mt-4">
                        {showTrial ? (
                          <>
                            <div className="text-xl font-extrabold text-gray-900">7 days free</div>
                            <div className="mt-1.5 text-xs text-gray-600">
                              After 7 days the system will lock and you must choose a paid plan to continue.
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xl font-extrabold text-gray-900">
                              TSh {pricing.discountedMonthly.toLocaleString()}
                              <span className="text-xs font-semibold text-gray-500"> / month</span>
                            </div>
                            <div className="mt-1.5 text-xs text-gray-600">
                              Billed <span className="font-semibold text-gray-900">TSh {pricing.total.toLocaleString()}</span> every {pricing.months} months
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-200 p-3">
                        <div className="flex items-center justify-between text-xs text-gray-700">
                          <span>Modules</span>
                          <span className="font-semibold text-gray-900">1</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-700">
                          <span>Users</span>
                          <span className="font-semibold text-gray-900">{String(p.userLimit || '')}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-700">
                          <span>SMS / mo</span>
                          <span className="font-semibold text-gray-900">{p.id === 'starter' ? '50' : p.id === 'professional' ? '200' : '500'}</span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {p.features.map((f) => (
                          <div key={f} className="flex items-center gap-2.5 text-xs text-gray-800">
                            <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">✓</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                        <div className="mt-5">
                          <button
                            type="button"
                            className={
                              p.highlight
                                ? 'w-full text-center px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-semibold transition-all duration-300 hover:bg-indigo-700'
                                : 'w-full text-center px-4 py-2.5 rounded-2xl bg-gray-900 text-white text-sm font-semibold transition-all duration-300 hover:bg-gray-800'
                            }
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!renewalMode && phoneExists) {
                                setError('Phone number already exists. Please login instead.');
                                return;
                              }
                              setSelectedPlan(p.id);
                              try {
                                const nextDraft = { ...draft, selectedPlan: p.id };
                                setSignupDraft(nextDraft);
                                setDraft(nextDraft);
                              } catch {}
                              openCheckout(p.id);
                            }}
                            disabled={!renewalMode && phoneExists}
                          >
                            <span className="inline-flex items-center justify-center gap-2">
                              <span>
                                {showTrial ? 'START FREE - 7 DAYS' : `CHOOSE — TSh ${pricing.discountedMonthly.toLocaleString()}/MO`}
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-10 flex items-center justify-center text-sm text-gray-600">
                  Available billing: 1 month, 3 months, 6 months, or 1 year.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {checkoutOpen ? (() => {
        const plan = plans.find((p) => p.id === checkoutPlanId);
        if (!plan) return null;
        const showTrial = !renewalMode && String(plan.id || '') === 'starter';
        const pricing = getPricing(plan);
        const durationDays = (Number(plan.durationDays || 30) || 30) * (Number(pricing.months || 0) || 0);
        const durationLabel = showTrial ? '7 Days (Trial)' : `${durationDays} Days`;
        const totalToPay = showTrial ? 0 : pricing.total;
        const monthlyRate = pricing.discountedMonthly;
        const paymentProviders = [
          { id: 'mpesa', label: 'M-Pesa', logoSrc: '/vodacom.png', logoAlt: 'Vodacom' },
          { id: 'mixx', label: 'Mixx by Yas', logoSrc: '/tigo.png', logoAlt: 'Tigo' },
          { id: 'airtel', label: 'Airtel Money', logoSrc: '/airtel.png', logoAlt: 'Airtel' },
          { id: 'halopesa', label: 'HaloPesa', logoSrc: '/halotel.png', logoAlt: 'Halotel' },
          { id: 'selcom', label: 'Selcom Pesa', logoSrc: '/selcom.png', logoAlt: 'Selcom' }
        ];
        // eslint-disable-next-line no-unused-vars
        const payBusy = paymentFlow === 'initiating' || paymentFlow === 'pending' || loadingKey === 'checkout:confirm';
        const payLabel = showTrial
          ? 'Start Free - 7 Days'
          : paymentFlow === 'pending' || paymentFlow === 'initiating'
          ? 'Waiting for confirmation…'
          : paymentFlow === 'expired'
          ? `Retry Pay TSh ${totalToPay.toLocaleString()}`
          : paymentFlow === 'timeout'
          ? `Retry Pay TSh ${totalToPay.toLocaleString()}`
          : `Pay TSh ${totalToPay.toLocaleString()}`;
        const helperText = showTrial
          ? 'Starter begins with 7 days free. After 7 days the system locks until a paid plan is chosen.'
          : paymentFlow === 'pending' || paymentFlow === 'initiating'
          ? `Waiting for payment confirmation... ${paymentSecondsLeft}s`
          : paymentFlow === 'expired'
          ? 'Payment request expired. Please try again.'
          : paymentFlow === 'timeout'
          ? 'Payment not completed. Please try again.'
          : 'You will receive a USSD prompt on your phone to confirm.';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <button type="button" className="absolute inset-0" onClick={closeCheckout} />
            <div className="relative w-[94vw] max-w-[520px] rounded-3xl bg-white shadow-2xl border border-white/60 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-xl font-extrabold text-gray-900">{plan.title} Tier</div>
                  <button type="button" className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100" onClick={closeCheckout}>
                    <X className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <div className="mt-5 rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="text-gray-600">Tier</div>
                    <div className="text-gray-900 font-semibold text-right">{plan.title}</div>
                    <div className="text-gray-600">Duration</div>
                    <div className="text-gray-900 font-semibold text-right">{durationLabel}</div>
                    <div className="text-gray-600">Monthly rate</div>
                    <div className="text-gray-900 font-semibold text-right">TSh {monthlyRate.toLocaleString()}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-gray-900 font-semibold">Total</div>
                    <div className="text-2xl font-extrabold text-green-700">TSh {totalToPay.toLocaleString()}</div>
                  </div>
                  {showTrial ? <div className="mt-2 text-xs text-gray-600">No payment is required for the first 7 days on Starter.</div> : null}
                </div>

                {!showTrial ? (
                  <>
                    <div className="mt-5">
                    <div className="text-sm font-semibold text-gray-900">Payment Phone Number</div>
                    <div className="mt-2 flex items-center gap-2 bg-white border border-gray-300 rounded-2xl px-3 py-3">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-green-50 text-green-700 border border-green-200 px-2 py-1">
                        <span className="text-xs font-semibold">+255</span>
                      </span>
                      <input
                        type="tel"
                        value={String(paymentPhone || '').replace(/[^0-9]/g, '').replace(/^0/, '').replace(/^255/, '')}
                        onChange={(e) => {
                          const raw = String(e.target.value || '');
                          const digits = raw.replace(/[^0-9]/g, '').replace(/^0/, '').replace(/^255/, '');
                          setPaymentPhone(digits);
                          if (paymentReference || paymentFlow !== 'idle') resetPaymentState();
                          if (checkoutError) setCheckoutError('');
                        } }
                        className="bg-transparent w-full text-gray-900 outline-none"
                        placeholder="6/7XXXXXXXX"
                        inputMode="numeric" />
                    </div>
                  </div>
                  <div className="mt-5">
                      <div className="text-sm font-semibold text-gray-900">Select Payment Provider</div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {paymentProviders.map((p) => {
                          const active = paymentProvider === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              data-no-loading="true"
                              onClick={() => {
                                setPaymentProvider(p.id);
                                if (!paymentPhone) setPaymentPhone('');
                                if (paymentReference || paymentFlow !== 'idle') resetPaymentState();
                                if (checkoutError) setCheckoutError('');
                              } }
                              className="relative flex flex-col items-center gap-2 py-2"
                            >
                              <div className={active ? 'relative w-16 h-16 rounded-full bg-white/80 border-2 border-green-500 shadow-sm flex items-center justify-center overflow-hidden' : 'relative w-16 h-16 rounded-full bg-white/70 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden hover:bg-white'}>
                                <img src={p.logoSrc} alt={p.logoAlt} className="max-h-10 w-auto" />
                              </div>
                              <div
                                className={active
                                  ? 'absolute -top-1 -right-1 w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center transition-transform duration-200 scale-105 shadow'
                                  : 'absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white/70 border border-white/60 text-gray-500 flex items-center justify-center transition-transform duration-200 shadow-sm'}
                              >
                                <BadgeCheck className="w-4 h-4" />
                              </div>
                              <div className="text-xs font-semibold text-gray-900 leading-tight text-center">{p.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : null}

                {paymentReference ? (
                  <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-600">Reference</div>
                      <div className="text-xs font-semibold text-gray-900 break-all text-right">{paymentReference}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-600">Status</div>
                      <div className="text-xs font-semibold text-gray-900 text-right">
                        {paymentFlow === 'pending' || paymentFlow === 'initiating'
                          ? 'Pending'
                          : paymentFlow === 'success'
                          ? 'Completed'
                          : paymentFlow === 'expired'
                          ? 'Expired'
                          : paymentFlow === 'timeout'
                          ? 'Timed out'
                          : paymentFlow === 'error'
                          ? 'Error'
                          : '—'}
                      </div>
                    </div>
                  </div>
                ) : null}

                {checkoutError ? (
                  <div className="mt-4 text-red-600 text-sm">
                    <div>{checkoutError}</div>
                    {phoneExists ? (
                      <div className="mt-2">
                        <Link to="/login" className="text-green-700 font-semibold hover:underline">
                          Go to Login
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-6">
                  <button
                    type="button"
                    className={isSubmitting ? 'w-full py-4 rounded-2xl bg-green-600/80 text-white font-semibold text-base cursor-not-allowed transition-colors' : 'w-full py-4 rounded-2xl bg-green-600 text-white font-semibold text-base hover:bg-green-700 transition-colors'}
                    onClick={handleConfirmCheckout}
                    disabled={isSubmitting}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <span>{payLabel}</span>
                    </span>
                  </button>
                  <div className="mt-3 text-xs text-gray-600 text-center">
                    {helperText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}
    </div>
  );
};

export default PlanSelect;
