import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Crown, Gem, Rocket, X } from 'lucide-react';
import Layout from '../shared/Layout';
import Dashboard from '../pages/Dashboard';
import { initiatePayment, verifyPayment } from '../services/paymentService';
import { authApi, subscriptionsApi, syncLocalAuthStateFromBackendMe } from '../services/backendApi';

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
  const [isWebhookSubmitting, setIsWebhookSubmitting] = useState(false);
  const [renewalMode, setRenewalMode] = useState(false);
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

  const simulatePaymentWebhook = async ({ reference, phoneNumber, amount, provider }) => {
    const ref = String(reference || '').trim();
    if (!ref) return;
    if (isWebhookSubmitting) return;
    setIsWebhookSubmitting(true);
    try {
      const payload = {
        id: `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        type: 'payment.completed',
        api_version: '2026-01-25',
        created_at: new Date().toISOString(),
        data: {
          reference: ref,
          external_reference: `S${Date.now()}`,
          status: 'completed',
          amount: { value: Number(amount || 0), currency: 'TZS' },
          channel: { type: 'mobile_money', provider: String(provider || '').trim() || 'airtel' },
          customer: { phone: String(phoneNumber || '').trim() || '' }
        }
      };
      const res = await fetch('https://mpira.online/api/payment/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        let data = null;
        try {
          data = await res.json();
        } catch {}
        const message = (data && (data.message || data.error)) || `Webhook failed (${res.status})`;
        throw new Error(message);
      }
    } finally {
      setIsWebhookSubmitting(false);
    }
  };

  const delayToFiveSeconds = async (startedAt) => {
    const elapsed = Date.now() - startedAt;
    const remaining = 5000 - elapsed;
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
  };

  const plans = useMemo(
    () => [
      {
        id: 'starter',
        title: 'Starter',
        price: 20000,
        Icon: Rocket,
        highlight: false,
        trialDays: 0,
        userLimit: 3,
        caption: 'Perfect to start',
        features: ['1 module', 'Basic reports', 'Inventory & sales', 'Standard support']
      },
      {
        id: 'professional',
        title: 'Professional',
        price: 40000,
        Icon: Gem,
        highlight: true,
        trialDays: 0,
        userLimit: 6,
        caption: 'Best for growing teams',
        features: ['1 module', 'Advanced reports', 'User roles', 'Priority support']
      },
      {
        id: 'enterprise',
        title: 'Enterprise',
        price: 60000,
        Icon: Crown,
        highlight: false,
        trialDays: 0,
        userLimit: 12,
        caption: 'For large operations',
        features: ['1 module', 'All reports', 'Multi-user access', 'Dedicated support']
      }
    ],
    []
  );

  const billingOptions = useMemo(
    () => [
      { id: '1m', label: '30 Days', months: 1, discountPercent: 0 }
    ],
    []
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('signupDraft');
      if (!raw) {
        const currentUser =
          JSON.parse(localStorage.getItem('currentUser') || 'null') || JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (currentUser) {
          let companyInfo = {};
          try {
            const ci = JSON.parse(localStorage.getItem('companyInfo') || '{}');
            companyInfo = ci && typeof ci === 'object' ? ci : {};
          } catch {}
          const nextDraft = {
            otpVerified: true,
            selectedModule: String(companyInfo.businessModule || currentUser.businessModule || '').trim() || 'module',
            billingCycle: '1m',
            selectedPlan: String(currentUser.subscriptionPlan || '').trim() || '',
            logoPreview: String(companyInfo.logo || '').trim(),
            formData: {
              companyName: String(companyInfo.companyName || currentUser.companyName || '').trim(),
              taxId: String(companyInfo.taxId || currentUser.taxId || '').trim(),
              location: String(companyInfo.location || currentUser.location || '').trim(),
              website: String(companyInfo.website || currentUser.website || '').trim(),
              businessDescription: String(companyInfo.businessDescription || currentUser.businessDescription || '').trim(),
              fullName: String(currentUser.fullName || '').trim(),
              email: String(currentUser.email || '').trim(),
              phone: String(currentUser.phone || '').trim(),
              password: String(currentUser.password || '').trim()
            }
          };
          setRenewalMode(true);
          setDraft(nextDraft);
          setSelectedPlan(String(nextDraft.selectedPlan || '').trim() || 'starter');
          setBillingCycle('1m');
          setPaymentPhone(String(currentUser?.paymentPhone || '').replace(/[^0-9]/g, '').replace(/^0/, '').replace(/^255/, ''));
          setPaymentProvider(String(currentUser?.paymentProvider || '').trim());
          return;
        }
        navigate('/signup', { replace: true });
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed?.otpVerified || !parsed?.formData) {
        navigate('/signup', { replace: true });
        return;
      }
      if (!String(parsed?.selectedModule || '').trim()) {
        navigate('/signup/modules', { replace: true });
        return;
      }
      setRenewalMode(false);
      setDraft(parsed);
      setSelectedPlan(String(parsed?.selectedPlan || '').trim());
      setBillingCycle(String(parsed?.billingCycle || '').trim() || '1m');
      setPaymentPhone('');
    } catch {
      navigate('/signup', { replace: true });
    }
  }, [navigate]);

  const activeBilling = billingOptions.find((b) => b.id === billingCycle) || billingOptions[0];

  const getPricing = (plan) => {
    const rawMonthly = Number(plan?.price || 0);
    const months = 1;
    const discountPercent = 0;
    const discountedMonthly = rawMonthly;
    const total = rawMonthly;
    return { months, discountPercent, rawMonthly, discountedMonthly, total };
  };

  const handleCreateAccount = async (planId, payment) => {
    const pickedPlan = String(planId || selectedPlan || '').trim();
    if (!pickedPlan) {
      setError('Please choose a monthly plan');
      return;
    }
    if (!draft?.formData) {
      navigate('/signup', { replace: true });
      return;
    }

    const pickedModule = String(draft?.selectedModule || '').trim();
    if (!pickedModule) {
      setError('Please choose the suites first');
      return;
    }

    const plan = plans.find((p) => p.id === pickedPlan);
    if (!plan) {
      setError('Invalid plan. Please select again.');
      return;
    }

    const pricing = getPricing(plan);
    const trialDays = activeBilling?.id === '1m' ? Number(plan.trialDays || 0) : 0;
    const now = Date.now();
    const subscriptionStartedAt = new Date(now).toISOString();
    const subscriptionTrialEndsAt = trialDays ? new Date(now + trialDays * 24 * 60 * 60 * 1000).toISOString() : '';
    const paidEndsAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    const subscriptionEndsAt = trialDays ? subscriptionTrialEndsAt : paidEndsAt;
    const hasTrial = Boolean(trialDays);
    const paymentProviderValue = String(payment?.provider || '').trim();
    const paymentPhoneValue = String(payment?.phone || '').trim();
    const paymentReferenceValue = String(payment?.reference || '').trim();
    const paymentStatus = hasTrial ? 'trial' : 'paid';
    const amountPaid = paymentStatus === 'paid' ? pricing.total : 0;

    const formData = draft.formData;
    // eslint-disable-next-line no-unused-vars
    const phone = String(formData.phone || '').trim();

    if (renewalMode) {
      const currentUser =
        JSON.parse(localStorage.getItem('currentUser') || 'null') || JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      if (!currentUser) {
        setError('Please login again');
        navigate('/login', { replace: true });
        return;
      }
      const nextUser = {
        ...currentUser,
        profilePhoto: String(draft?.profilePreview || currentUser?.profilePhoto || ''),
        subscriptionPlan: plan.id,
        subscriptionUserLimit: Number(plan.userLimit || 0),
        subscriptionPrice: pricing.total,
        subscriptionPricePerMonth: pricing.discountedMonthly,
        subscriptionPeriod: activeBilling.id,
        subscriptionMonths: pricing.months,
        subscriptionDiscountPercent: pricing.discountPercent,
        subscriptionTrialDays: trialDays,
        subscriptionStartedAt,
        subscriptionEndsAt,
        subscriptionTrialEndsAt,
        subscriptionPaymentStatus: paymentStatus,
        paymentProvider: paymentProviderValue,
        paymentPhone: paymentPhoneValue
      };

      try {
        const stored = JSON.parse(localStorage.getItem('currentUser') || 'null');
        const useLocal = Boolean(stored);
        if (useLocal) localStorage.setItem('currentUser', JSON.stringify(nextUser));
        else sessionStorage.setItem('currentUser', JSON.stringify(nextUser));
      } catch {}

      try {
        const all = JSON.parse(localStorage.getItem('users') || '[]');
        const list = Array.isArray(all) ? all : [];
        const idx = list.findIndex((u) => String(u?.id || '') === String(nextUser.id || '') && String(u?.role || '').toLowerCase() === 'admin');
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...nextUser };
          localStorage.setItem('users', JSON.stringify(list));
        }
      } catch {}

      try {
        const existingCompany = JSON.parse(localStorage.getItem('companyInfo') || '{}');
        const updatedCompany = {
          ...existingCompany,
          subscriptionPlan: plan.id || existingCompany.subscriptionPlan || '',
          subscriptionUserLimit: Number(plan.userLimit || 0),
          subscriptionPrice: pricing.total || existingCompany.subscriptionPrice || 0,
          subscriptionPricePerMonth: pricing.discountedMonthly || existingCompany.subscriptionPricePerMonth || 0,
          subscriptionPeriod: activeBilling.id,
          subscriptionMonths: pricing.months,
          subscriptionDiscountPercent: pricing.discountPercent,
          subscriptionTrialDays: trialDays,
          subscriptionStartedAt,
          subscriptionEndsAt,
          subscriptionTrialEndsAt,
          subscriptionPaymentStatus: paymentStatus,
          paymentProvider: paymentProviderValue,
          paymentPhone: paymentPhoneValue
        };
        localStorage.setItem('companyInfo', JSON.stringify(updatedCompany));
        try {
          window.dispatchEvent(new CustomEvent('companyInfoUpdated'));
        } catch {}
      } catch {}
      try {
        const businessId = String(nextUser.id || currentUser.id || '');
        const key = `billingHistory:${businessId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const list = Array.isArray(existing) ? existing : [];
        list.unshift({
          id: `BILL-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          businessId,
          planId: plan.id,
          planTitle: plan.title,
          amount: pricing.total,
          paidAt: new Date().toISOString(),
          endsAt: subscriptionEndsAt,
          period: activeBilling.id,
          months: pricing.months,
          provider: paymentProviderValue,
          phone: paymentPhoneValue
        });
        localStorage.setItem(key, JSON.stringify(list.slice(0, 200)));
      } catch {}

      try {
        const businessId = String(nextUser.id || currentUser.id || '');
        const nKey = `notifications:${businessId || 'default'}`;
        const raw = JSON.parse(localStorage.getItem(nKey) || '[]');
        const list = Array.isArray(raw) ? raw : [];
        list.unshift({
          id: `NTF-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ts: new Date().toISOString(),
          title: 'Payment received',
          message: `Your ${plan.title} plan is active until ${String(subscriptionEndsAt).slice(0, 10)}.`,
          type: 'plan',
          read: false
        });
        localStorage.setItem(nKey, JSON.stringify(list.slice(0, 200)));
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
        window.dispatchEvent(new CustomEvent('billingHistoryUpdated'));
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}

      try {
        if (paymentStatus === 'paid') {
          await subscriptionsApi.confirmPayment({
            planId: plan.id,
            reference: paymentReferenceValue,
            amount: amountPaid,
            provider: paymentProviderValue || undefined,
            phoneNumber: paymentPhoneValue || undefined,
            months: pricing.months,
            discountPercent: pricing.discountPercent
          });
        } else {
          await subscriptionsApi.selectPlan({
            planName: plan.id,
            months: pricing.months,
            discountPercent: pricing.discountPercent,
            status: paymentStatus,
            startedAt: subscriptionStartedAt,
            endsAt: subscriptionEndsAt,
            trialEndsAt: subscriptionTrialEndsAt ? subscriptionTrialEndsAt : null,
            amountPaid,
            paymentProvider: paymentProviderValue || undefined,
            paymentPhone: paymentPhoneValue || undefined
          });
        }
        const me = await authApi.me();
        syncLocalAuthStateFromBackendMe(me, Boolean(localStorage.getItem('rememberMe') === 'true'));
      } catch (err) {
        setCheckoutError(String(err?.message || 'Unable to update subscription. Try again.'));
        return;
      }

      closeCheckout();
      navigate('/dashboard', { replace: true });
      return;
    }

    const existingCompany = JSON.parse(localStorage.getItem('companyInfo') || '{}');
    const updatedCompany = {
      ...existingCompany,
      companyName: formData.companyName || existingCompany.companyName || '',
      tin: formData.taxId || existingCompany.tin || existingCompany.taxId || '',
      taxId: formData.taxId || existingCompany.taxId || '',
      location: formData.location || existingCompany.location || '',
      phone: formData.phone || existingCompany.phone || '',
      email: formData.email || existingCompany.email || '',
      website: formData.website || existingCompany.website || '',
      businessDescription: formData.businessDescription || existingCompany.businessDescription || '',
      logo: (draft.logoPreview || '') || existingCompany.logo || '',
      businessModule: pickedModule || existingCompany.businessModule || '',
      subscriptionPlan: plan.id || existingCompany.subscriptionPlan || '',
      subscriptionUserLimit: Number(plan.userLimit || 0),
      subscriptionPrice: pricing.total || existingCompany.subscriptionPrice || 0,
      subscriptionPricePerMonth: pricing.discountedMonthly || existingCompany.subscriptionPricePerMonth || 0,
      subscriptionPeriod: activeBilling.id,
      subscriptionMonths: pricing.months,
      subscriptionDiscountPercent: pricing.discountPercent,
      subscriptionTrialDays: trialDays,
      subscriptionStartedAt,
      subscriptionEndsAt,
      subscriptionTrialEndsAt,
      subscriptionPaymentStatus: paymentStatus,
      paymentProvider: paymentProviderValue,
      paymentPhone: paymentPhoneValue
    };
    localStorage.setItem('companyInfo', JSON.stringify(updatedCompany));

    let businessId = '';
    try {
      const res = await authApi.signup(
        {
          businessName: String(formData.companyName || '').trim(),
          ownerFullName: String(formData.fullName || '').trim(),
          ownerPhone: String(formData.phone || '').trim(),
          ownerEmail: formData.email ? String(formData.email || '').trim() : undefined,
          password: String(formData.password || ''),
          address: String(formData.location || '').trim() || undefined,
          moduleKey: pickedModule,
          planName: plan.id,
          subscription: {
            status: paymentStatus,
            months: pricing.months,
            discountPercent: pricing.discountPercent,
            amountPaid,
            paymentReference: paymentReferenceValue || undefined,
            paymentProvider: paymentProviderValue || undefined,
            paymentPhone: paymentPhoneValue || undefined,
            startedAt: subscriptionStartedAt,
            endsAt: subscriptionEndsAt,
            trialEndsAt: subscriptionTrialEndsAt ? subscriptionTrialEndsAt : null
          }
        },
        true
      );
      businessId = String(res?.business?.id || '');
      try {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('lastLoginPhone', formData.phone);
        localStorage.setItem('lastLoginEmail', formData.email);
        sessionStorage.setItem('prefillLoginPhone', String(formData.phone || '').trim());
      } catch {}
    } catch (err) {
      const code = String(err?.code || '');
      if (code === 'PHONE_EXISTS') {
        setCheckoutError('Phone number already exists. Please login instead.');
      } else {
        setCheckoutError(String(err?.message || 'Unable to create account. Try again.'));
      }
      return;
    }

    try {
      const existingBusinesses = JSON.parse(localStorage.getItem('businesses') || '[]');
      const list = Array.isArray(existingBusinesses) ? existingBusinesses : [];
      const next = list.filter((b) => String(b?.businessId) !== String(businessId));
      next.push({
        businessId,
        companyName: formData.companyName || '',
        taxId: formData.taxId || '',
        location: formData.location || '',
        website: formData.website || '',
        businessDescription: formData.businessDescription || '',
        businessModule: pickedModule || '',
        subscriptionPlan: plan.id,
        subscriptionUserLimit: Number(plan.userLimit || 0),
        subscriptionPrice: pricing.total,
        subscriptionPricePerMonth: pricing.discountedMonthly,
        subscriptionPeriod: activeBilling.id,
        subscriptionMonths: pricing.months,
        subscriptionDiscountPercent: pricing.discountPercent,
        subscriptionTrialDays: trialDays,
        subscriptionStartedAt,
        subscriptionEndsAt,
        subscriptionTrialEndsAt,
        subscriptionPaymentStatus: paymentStatus,
        paymentProvider: paymentProviderValue,
        paymentPhone: paymentPhoneValue,
        logo: (draft.logoPreview || '') || ''
      });
      localStorage.setItem('businesses', JSON.stringify(next));
    } catch {}
    try {
      const key = `billingHistory:${businessId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const list = Array.isArray(existing) ? existing : [];
      list.unshift({
        id: `BILL-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        businessId,
        planId: plan.id,
        planTitle: plan.title,
        amount: pricing.total,
        paidAt: new Date().toISOString(),
        endsAt: subscriptionEndsAt,
        period: activeBilling.id,
        months: pricing.months,
        provider: paymentProviderValue,
        phone: paymentPhoneValue
      });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 200)));
    } catch {}

    try {
      sessionStorage.removeItem('signupDraft');
    } catch {}

    try {
      sessionStorage.setItem('postAuthRedirect', '/dashboard');
    } catch {}

    try {
      const nKey = `notifications:${businessId || 'default'}`;
      const raw = JSON.parse(localStorage.getItem(nKey) || '[]');
      const list = Array.isArray(raw) ? raw : [];
      list.unshift({
        id: `NTF-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ts: new Date().toISOString(),
        title: 'Plan activated',
        message: `Your ${plan.title} plan is active until ${String(subscriptionEndsAt).slice(0, 10)}.`,
        type: 'plan',
        read: false
      });
      localStorage.setItem(nKey, JSON.stringify(list.slice(0, 200)));
      window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    } catch {}

    try {
      onSignUp();
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('billingHistoryUpdated'));
      window.dispatchEvent(new CustomEvent('dataUpdated'));
    } catch {}
    closeCheckout();
    navigate('/dashboard', { replace: true });
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
    const startedAt = Date.now();
    resetPaymentState();
    const planId = String(checkoutPlanId || '').trim();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const showTrial = Boolean(plan.trialDays) && activeBilling.id === '1m';
    const pricing = getPricing(plan);
    const totalToPay = showTrial ? 0 : pricing.total;
    if (totalToPay === 0) {
      setIsSubmitting(true);
      setLoadingKey('checkout:confirm');
      await delayToFiveSeconds(startedAt);
      void handleCreateAccount(planId, {});
      setIsSubmitting(false);
      setLoadingKey('');
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
    await delayToFiveSeconds(startedAt);

    const fullPhone = `+255${localDigits}`;
    try {
      const init = await initiatePayment(fullPhone, totalToPay);
      const ref = String(init?.data?.reference || '').trim();
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
          const st = String(res?.status || '').toLowerCase();
          logPayment('verify.status', { reference: ref, status: st });
          if (st === 'success') {
            stopPaymentPolling();
            setPaymentFlow('success');
            setLoadingKey('');
            void handleCreateAccount(planId, { provider: paymentProvider, phone: `+255 ${localDigits}`, reference: ref });
            setIsSubmitting(false);
            return 'success';
          }
          if (st === 'payment expired') {
            stopPaymentPolling();
            setPaymentFlow('expired');
            setIsSubmitting(false);
            setLoadingKey('');
            return 'expired';
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
            <div className="px-6 lg:px-12 py-10 lg:py-14">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-start mb-4">
                  <button
                    type="button"
                    onClick={() => navigate('/signup/modules')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 border border-gray-200 hover:bg-white text-gray-900 font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-extrabold text-gray-900">Choose your plan</div>
                  <div className="mt-2 text-base md:text-lg text-gray-700">Complete your business solutions</div>
                </div>

                {error ? <div className="mt-6 text-red-600 text-base text-center">{error}</div> : null}

                <div className="mt-6 flex items-center justify-center">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {billingOptions.map((opt) => {
                      const active = opt.id === billingCycle;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            if (isSubmitting) return;
                            setBillingCycle(opt.id);
                            setError('');
                            setIsSubmitting(true);
                            setLoadingKey(`billing:${opt.id}`);
                            try {
                              const nextDraft = { ...draft, billingCycle: opt.id };
                              sessionStorage.setItem('signupDraft', JSON.stringify(nextDraft));
                              setDraft(nextDraft);
                            } catch {}
                            setTimeout(() => {
                              setIsSubmitting(false);
                              setLoadingKey('');
                            }, 5000);
                          }}
                          disabled={isSubmitting && loadingKey !== `billing:${opt.id}`}
                          className={
                            active
                              ? 'relative px-4 py-2 rounded-full bg-green-600 text-white text-sm font-semibold shadow-sm transition-colors'
                              : 'relative px-4 py-2 rounded-full bg-white text-gray-700 text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors'
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

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {plans.map((p) => {
                    const selected = selectedPlan === p.id;
                    const Icon = p.Icon;
                    const pricing = getPricing(p);
                    const showTrial = Boolean(p.trialDays) && activeBilling.id === '1m';
                    const accent =
                      p.id === 'starter'
                        ? { title: 'text-emerald-700', iconBg: 'bg-emerald-50', iconText: 'text-emerald-700', ring: 'ring-emerald-200/70' }
                        : p.id === 'professional'
                        ? { title: 'text-indigo-700', iconBg: 'bg-indigo-50', iconText: 'text-indigo-700', ring: 'ring-indigo-200/70' }
                        : { title: 'text-amber-700', iconBg: 'bg-amber-50', iconText: 'text-amber-700', ring: 'ring-amber-200/70' };
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isSubmitting) return;
                          setSelectedPlan(p.id);
                          setError('');
                          setIsSubmitting(true);
                          setLoadingKey(`plan:${p.id}`);
                          try {
                            const nextDraft = { ...draft, selectedPlan: p.id };
                            sessionStorage.setItem('signupDraft', JSON.stringify(nextDraft));
                            setDraft(nextDraft);
                          } catch {}
                          setTimeout(() => {
                            setIsSubmitting(false);
                            setLoadingKey('');
                          }, 5000);
                        }}
                        disabled={isSubmitting && loadingKey !== `plan:${p.id}`}
                        className={
                          selected
                            ? 'relative text-left bg-white border-2 border-green-500 rounded-3xl p-10 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]'
                            : p.highlight
                            ? 'relative text-left bg-white border-2 border-green-200 rounded-3xl p-10 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:scale-[1.01]'
                            : 'relative text-left bg-white border border-gray-200 rounded-3xl p-10 shadow-lg transition-all duration-300 hover:border-green-200 hover:-translate-y-1 hover:shadow-xl hover:scale-[1.01]'
                        }
                      >
                        {p.highlight ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-green-600 text-white text-xs font-semibold shadow">
                            MOST POPULAR
                          </div>
                        ) : null}
                        {showTrial ? (
                          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-800 text-xs font-semibold">
                            {p.trialDays} Days Free
                          </div>
                        ) : null}
                        <div className="flex items-start justify-between gap-3">
                          <div className={`w-14 h-14 rounded-2xl ${accent.iconBg} border border-gray-200 flex items-center justify-center shadow-sm ring-1 ${accent.ring}`}>
                            <Icon className={`w-6 h-6 ${accent.iconText}`} />
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

                        <div className={`mt-7 text-2xl font-bold ${accent.title}`}>{p.title}</div>
                        <div className="mt-2 text-sm text-gray-600">{p.caption}</div>

                      {showTrial ? (
                        <div className="mt-5">
                          <div className="text-3xl font-extrabold text-gray-900">7 days free</div>
                          <div className="mt-2 text-sm text-gray-600">
                            Then <span className="font-semibold text-gray-900">TSh {pricing.discountedMonthly.toLocaleString()}</span> / month
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5">
                          <div className="text-3xl font-extrabold text-gray-900">
                            TSh {pricing.discountedMonthly.toLocaleString()}
                            <span className="text-sm font-semibold text-gray-500"> / month</span>
                          </div>
                          {pricing.discountPercent ? (
                            <div className="mt-2 text-sm text-gray-600">
                              Billed <span className="font-semibold text-gray-900">TSh {pricing.total.toLocaleString()}</span> every {pricing.months} months
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-gray-600">Billed monthly</div>
                          )}
                        </div>
                      )}

                      <div className="mt-7 rounded-2xl bg-gray-50 border border-gray-200 p-4">
                        <div className="flex items-center justify-between text-sm text-gray-700">
                          <span>Modules</span>
                          <span className="font-semibold text-gray-900">1</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-gray-700">
                          <span>Users</span>
                          <span className="font-semibold text-gray-900">{String(p.userLimit || '')}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-gray-700">
                          <span>SMS / mo</span>
                          <span className="font-semibold text-gray-900">{p.id === 'starter' ? '50' : p.id === 'professional' ? '200' : '500'}</span>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        {p.features.map((f) => (
                          <div key={f} className="flex items-center gap-3 text-base text-gray-800">
                            <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">✓</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                        <div className="mt-8">
                          <button
                            type="button"
                            className={p.highlight ? 'w-full text-center px-4 py-4 rounded-2xl bg-green-600 text-white text-base font-semibold transition-all duration-300 hover:bg-green-700' : 'w-full text-center px-4 py-4 rounded-2xl bg-gray-900 text-white text-base font-semibold transition-all duration-300 hover:bg-gray-800'}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (isSubmitting) return;
                              const startedAt = Date.now();
                              setSelectedPlan(p.id);
                              try {
                                const nextDraft = { ...draft, selectedPlan: p.id };
                                sessionStorage.setItem('signupDraft', JSON.stringify(nextDraft));
                                setDraft(nextDraft);
                              } catch {}
                              setIsSubmitting(true);
                              setLoadingKey(`choose:${p.id}`);
                              await delayToFiveSeconds(startedAt);
                              openCheckout(p.id);
                              setIsSubmitting(false);
                              setLoadingKey('');
                            }}
                            disabled={isSubmitting && loadingKey !== `choose:${p.id}`}
                          >
                            <span className="inline-flex items-center justify-center gap-2">
                              <span>{showTrial ? `START FREE — 7 DAYS` : `CHOOSE — TSh ${pricing.total.toLocaleString()}`}</span>
                            </span>
                          </button>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-10 flex items-center justify-center text-sm text-gray-600">
                  Prices are monthly.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {checkoutOpen ? (() => {
        const plan = plans.find((p) => p.id === checkoutPlanId);
        if (!plan) return null;
        const pricing = getPricing(plan);
        const showTrial = Boolean(plan.trialDays) && activeBilling.id === '1m';
        const durationLabel = `${pricing.months} month(s)`;
        const moduleLabel = String(draft?.selectedModule || '').trim() || '—';
        const totalToPay = showTrial ? 0 : pricing.total;
        const monthlyRate = pricing.discountedMonthly;
        const paymentProviders = [
          { id: 'mpesa', label: 'M-Pesa', logoSrc: '/vodacom.png', logoAlt: 'Vodacom' },
          { id: 'mixx', label: 'Mixx by Yas', logoSrc: '/tigo.png', logoAlt: 'Tigo' },
          { id: 'airtel', label: 'Airtel Money', logoSrc: '/airtel.png', logoAlt: 'Airtel' },
          { id: 'halopesa', label: 'HaloPesa', logoSrc: '/halotel.png', logoAlt: 'Halotel' },
          { id: 'selcom', label: 'Selcom Pesa', logoSrc: '/selcom.png', logoAlt: 'Selcom' }
        ];
        const payBusy = paymentFlow === 'initiating' || paymentFlow === 'pending' || loadingKey === 'checkout:confirm';
        const payLabel = showTrial
          ? 'Start Free — 7 Days'
          : paymentFlow === 'pending' || paymentFlow === 'initiating'
          ? 'Waiting for confirmation…'
          : paymentFlow === 'expired'
          ? `Retry Pay TSh ${totalToPay.toLocaleString()}`
          : paymentFlow === 'timeout'
          ? `Retry Pay TSh ${totalToPay.toLocaleString()}`
          : `Pay TSh ${totalToPay.toLocaleString()}`;
        const helperText = showTrial
          ? 'Your trial will start immediately.'
          : paymentFlow === 'pending' || paymentFlow === 'initiating'
          ? `Waiting for payment confirmation... ${paymentSecondsLeft}s`
          : paymentFlow === 'expired'
          ? 'Payment request expired. Please try again.'
          : paymentFlow === 'timeout'
          ? 'Payment not completed. Please try again.'
          : 'You will receive a USSD prompt on your phone to confirm.';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 blur-md scale-[1.02] opacity-85">
                <Layout onLogout={() => {}}>
                  <Dashboard />
                </Layout>
              </div>
              <div className="absolute inset-0 bg-black/35" />
            </div>
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
                    <div className="text-gray-600">Modules</div>
                    <div className="text-gray-900 font-semibold text-right">{moduleLabel}</div>
                    <div className="text-gray-600">Duration</div>
                    <div className="text-gray-900 font-semibold text-right">{durationLabel}</div>
                    <div className="text-gray-600">Monthly rate</div>
                    <div className="text-gray-900 font-semibold text-right">TSh {monthlyRate.toLocaleString()}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-gray-900 font-semibold">Total</div>
                    <div className="text-2xl font-extrabold text-green-700">TSh {totalToPay.toLocaleString()}</div>
                  </div>
                  {showTrial ? (
                    <div className="mt-2 text-xs text-gray-600">
                      Free for 7 days. After trial, payment is required to continue.
                    </div>
                  ) : null}
                </div>

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
                      }}
                      className="bg-transparent w-full text-gray-900 outline-none"
                      placeholder="6/7XXXXXXXX"
                      inputMode="numeric"
                    />
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
                          }}
                          className="relative flex flex-col items-center gap-2 py-2"
                        >
                          <div className={active ? 'relative w-16 h-16 rounded-full bg-white/80 border-2 border-green-500 shadow-sm flex items-center justify-center overflow-hidden' : 'relative w-16 h-16 rounded-full bg-white/70 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden hover:bg-white'}>
                            <img src={p.logoSrc} alt={p.logoAlt} className="max-h-10 w-auto" />
                          </div>
                          <div
                            className={
                              active
                                ? 'absolute -top-1 -right-1 w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center transition-transform duration-200 scale-105 shadow'
                                : 'absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white/70 border border-white/60 text-gray-500 flex items-center justify-center transition-transform duration-200 shadow-sm'
                            }
                          >
                            <BadgeCheck className="w-4 h-4" />
                          </div>
                          <div className="text-xs font-semibold text-gray-900 leading-tight text-center">{p.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

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

                {checkoutError ? <div className="mt-4 text-red-600 text-sm">{checkoutError}</div> : null}

                <div className="mt-6">
                  <button
                    type="button"
                    className={isSubmitting ? 'w-full py-4 rounded-2xl bg-green-600/80 text-white font-semibold text-base cursor-not-allowed transition-colors' : 'w-full py-4 rounded-2xl bg-green-600 text-white font-semibold text-base hover:bg-green-700 transition-colors'}
                    onClick={handleConfirmCheckout}
                    disabled={isSubmitting}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {payBusy ? <span className="w-5 h-5 rounded-full border-2 border-white/70 border-t-white animate-spin" /> : null}
                      <span>{payLabel}</span>
                    </span>
                  </button>
                  <div className="mt-3 text-xs text-gray-600 text-center">
                    {helperText}
                  </div>
                  {process.env.NODE_ENV !== 'production' && paymentReference ? (
                    <div className="mt-3 flex items-center justify-center">
                      <button
                        type="button"
                        className={isWebhookSubmitting ? 'px-4 py-2 rounded-xl bg-gray-900/70 text-white font-semibold text-xs cursor-not-allowed' : 'px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold text-xs hover:bg-gray-800'}
                        onClick={async () => {
                          const digits = String(paymentPhone || '').replace(/[^0-9]/g, '');
                          const normalized = digits.startsWith('0') ? digits.slice(1) : digits;
                          const localDigits = normalized.startsWith('255') ? normalized.slice(3) : normalized;
                          await simulatePaymentWebhook({
                            reference: paymentReference,
                            phoneNumber: localDigits ? `+255${localDigits}` : '',
                            amount: totalToPay,
                            provider: paymentProvider
                          });
                        }}
                        disabled={isWebhookSubmitting}
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          {isWebhookSubmitting ? <span className="w-4 h-4 rounded-full border-2 border-white/70 border-t-white animate-spin" /> : null}
                          <span>Simulate payment success (demo)</span>
                        </span>
                      </button>
                    </div>
                  ) : null}
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
