import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

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

const money0 = (n) => {
  const v = typeof n === 'number' ? n : parseFloat(String(n ?? '').replace(/,/g, ''));
  const x = Number.isFinite(v) ? v : 0;
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(x);
  } catch {
    return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};

const daysUntil = (iso) => {
  const raw = String(iso || '').trim();
  if (!raw) return null;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  const now = Date.now();
  const diff = Math.floor((t - now) / (24 * 60 * 60 * 1000));
  return Number.isFinite(diff) ? diff : null;
};

export default function SubscriptionStatus() {
  const navigate = useNavigate();
  const user = authApi.getCurrentUserSync ? authApi.getCurrentUserSync() : null;

  const plan = useMemo(() => String(user?.subscriptionPlan || '').trim() || '—', [user?.subscriptionPlan]);
  const statusRaw = useMemo(() => String(user?.subscriptionPaymentStatus || '').trim() || '—', [user?.subscriptionPaymentStatus]);
  const status = useMemo(() => statusRaw.replace(/\b\w/g, (m) => m.toUpperCase()), [statusRaw]);
  const nextDate = useMemo(() => {
    const trialEndsAt = String(user?.subscriptionTrialEndsAt || '').trim();
    const endsAt = String(user?.subscriptionEndsAt || '').trim();
    if (trialEndsAt) return trialEndsAt;
    if (endsAt) return endsAt;
    const statusLower = String(statusRaw || '').trim().toLowerCase();
    if (statusLower === 'trial') {
      const base = String(user?.subscriptionStartedAt || user?.createdAt || '').trim();
      const t = Date.parse(base);
      if (Number.isFinite(t)) return new Date(t + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    return '';
  }, [statusRaw, user?.createdAt, user?.subscriptionEndsAt, user?.subscriptionStartedAt, user?.subscriptionTrialEndsAt]);
  const memberSince = useMemo(() => String(user?.createdAt || '').trim(), [user?.createdAt]);
  const remainingDays = useMemo(() => daysUntil(nextDate), [nextDate]);

  const pricePerMonth = useMemo(() => {
    const p = String(plan || '').toLowerCase();
    if (p.includes('starter')) return 15000;
    if (p.includes('pro')) return 35000;
    if (p.includes('enterprise')) return 60000;
    return 15000;
  }, [plan]);

  const badgeLabel = useMemo(() => {
    const v = String(statusRaw || '').trim().toLowerCase();
    if (!v) return 'Active';
    if (v === 'trial') return 'Trial';
    if (v === 'expired') return 'Expired';
    if (v === 'pending') return 'Pending';
    return 'Active';
  }, [statusRaw]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-semibold text-gray-900">Subscription</div>
        <div className="mt-1 text-sm text-gray-600">Manage your DukaHub plan and billing</div>
      </div>

      <div className="rounded-3xl border border-green-200 bg-green-50 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-2xl font-semibold text-green-800">{plan}</div>
            <div className="mt-1 text-sm text-green-700">TZS {money0(pricePerMonth)} / month</div>
          </div>
          <div className="px-4 py-2 rounded-full bg-white border border-green-200 text-green-800 text-sm font-semibold">
            {badgeLabel}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-green-800/70 font-semibold">Next billing</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{fmtDate(nextDate)}</div>
          </div>
          <div>
            <div className="text-xs text-green-800/70 font-semibold">Days remaining</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
              {remainingDays == null ? '—' : `${Math.max(0, remainingDays)} days`}
            </div>
          </div>
          <div>
            <div className="text-xs text-green-800/70 font-semibold">Member since</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{fmtDate(memberSince)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-700 font-extrabold">
            ⚡
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">Upgrade Your Plan</div>
            <div className="mt-1 text-sm text-gray-600">Choose a plan that matches your business needs</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="text-lg font-semibold text-green-800">Pro Plan</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">TZS {money0(35000)}<span className="text-sm font-semibold text-gray-600">/mo</span></div>
            <div className="mt-4 text-sm text-gray-700">
              5 staff · Unlimited products · Advanced reports · Multi-branch
            </div>
            <button
              type="button"
              className="mt-5 w-full px-5 py-3 rounded-2xl bg-green-600 text-white hover:bg-green-700 font-semibold shadow"
              onClick={() => navigate('/plans')}
            >
              Upgrade Now
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-lg font-semibold text-gray-900">Enterprise</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">Custom</div>
            <div className="mt-1 text-sm text-gray-600">TZS {money0(60000)}/mo</div>
            <div className="mt-4 text-sm text-gray-700">
              Unlimited staff · API access · Custom features · Priority support
            </div>
            <button
              type="button"
              className="mt-5 w-full px-5 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 font-semibold"
              onClick={() => navigate('/plans')}
            >
              Contact Us
            </button>
          </div>
        </div>

        {status ? <div className="sr-only">{status}</div> : null}
      </div>
    </div>
  );
}
