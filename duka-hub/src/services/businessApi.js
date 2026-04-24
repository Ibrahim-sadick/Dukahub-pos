import { authenticatedApiRequest } from './authApi';
import { getCurrentUserSync, setCurrentUserSync } from './localAuth';
import { readRuntimeCache, writeRuntimeCache } from './runtimeCache';

const COMPANY_INFO_KEY = 'companyInfo';

// eslint-disable-next-line no-unused-vars
const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const readJson = (key, fallback) => {
  return readRuntimeCache(key, fallback);
};

const writeJson = (key, value) => {
  writeRuntimeCache(key, value);
};

const normalizeText = (value) => String(value || '').trim();

const deriveLocationCity = (location, fallback = '') => {
  const cached = normalizeText(fallback);
  if (cached) return cached;
  const text = normalizeText(location);
  if (!text) return '';
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[1];
  return '';
};

const notify = () => {
  try {
    window.dispatchEvent(new CustomEvent('companyInfoUpdated'));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('dataUpdated'));
  } catch {}
};

export const mapBusinessToCompanyInfo = (business, fallback = null) => {
  const cached = readJson(COMPANY_INFO_KEY, {});
  const source = business && typeof business === 'object' ? business : {};
  const fallbackSource = fallback && typeof fallback === 'object' ? fallback : {};
  const currentUser = getCurrentUserSync() || {};

  return {
    ...cached,
    companyName: normalizeText(source.businessName || source.name || fallbackSource.companyName || fallbackSource.name || currentUser.businessName),
    phone: normalizeText(source.phone || fallbackSource.phone),
    email: normalizeText(source.email || fallbackSource.email),
    businessAddress: normalizeText(source.address || fallbackSource.businessAddress || fallbackSource.address),
    location: normalizeText(source.location || fallbackSource.location),
    locationCity: deriveLocationCity(source.location || fallbackSource.location, fallbackSource.locationCity || cached.locationCity),
    tin: normalizeText(source.tin || source.taxId || fallbackSource.tin || fallbackSource.taxId),
    taxId: normalizeText(source.taxId || source.tin || fallbackSource.taxId || fallbackSource.tin),
    vrn: normalizeText(source.vrn || fallbackSource.vrn),
    poBox: normalizeText(source.poBox || fallbackSource.poBox),
    fax: normalizeText(source.fax || fallbackSource.fax),
    website: normalizeText(source.website || fallbackSource.website),
    businessDescription: normalizeText(source.businessDescription || fallbackSource.businessDescription),
    receiptFooterMessage: normalizeText(source.receiptFooterMessage || fallbackSource.receiptFooterMessage),
    logo: normalizeText(source.logo || fallbackSource.logo),
    businessModule: normalizeText(source.businessModule || fallbackSource.businessModule || currentUser.businessModule),
    subscriptionPlan: normalizeText(source.subscriptionPlan || fallbackSource.subscriptionPlan || currentUser.subscriptionPlan),
    subscriptionPaymentStatus: normalizeText(source.subscriptionPaymentStatus || fallbackSource.subscriptionPaymentStatus || currentUser.subscriptionPaymentStatus),
    subscriptionEndsAt: normalizeText(source.subscriptionEndsAt || fallbackSource.subscriptionEndsAt || currentUser.subscriptionEndsAt),
    subscriptionTrialEndsAt: normalizeText(source.subscriptionTrialEndsAt || fallbackSource.subscriptionTrialEndsAt || currentUser.subscriptionTrialEndsAt),
    subscriptionStartedAt: normalizeText(source.subscriptionStartedAt || fallbackSource.subscriptionStartedAt || currentUser.subscriptionStartedAt),
    paymentPhone: normalizeText(source.paymentPhone || fallbackSource.paymentPhone || currentUser.paymentPhone),
    paymentReference: normalizeText(source.paymentReference || fallbackSource.paymentReference || currentUser.paymentReference)
  };
};

const syncCurrentUserFromBusiness = (businessLike) => {
  const currentUser = getCurrentUserSync();
  if (!currentUser) return;
  const source = businessLike && typeof businessLike === 'object' ? businessLike : {};
  setCurrentUserSync({
    ...currentUser,
    businessName: normalizeText(source.companyName || source.businessName || source.name || currentUser.businessName),
    businessModule: normalizeText(source.businessModule || currentUser.businessModule),
    subscriptionPlan: normalizeText(source.subscriptionPlan || currentUser.subscriptionPlan),
    subscriptionPaymentStatus: normalizeText(source.subscriptionPaymentStatus || currentUser.subscriptionPaymentStatus),
    subscriptionEndsAt: normalizeText(source.subscriptionEndsAt || currentUser.subscriptionEndsAt),
    subscriptionTrialEndsAt: normalizeText(source.subscriptionTrialEndsAt || currentUser.subscriptionTrialEndsAt),
    subscriptionStartedAt: normalizeText(source.subscriptionStartedAt || currentUser.subscriptionStartedAt),
    paymentPhone: normalizeText(source.paymentPhone || currentUser.paymentPhone),
    paymentReference: normalizeText(source.paymentReference || currentUser.paymentReference)
  });
};

const syncCompanyInfo = (companyInfo) => {
  const next = companyInfo && typeof companyInfo === 'object' ? companyInfo : {};
  writeJson(COMPANY_INFO_KEY, next);
  syncCurrentUserFromBusiness(next);
  notify();
  return next;
};

const buildBusinessPayload = (companyInfo) => {
  const source = companyInfo && typeof companyInfo === 'object' ? companyInfo : {};
  const companyName = normalizeText(source.companyName || source.name);
  return {
    name: companyName || undefined,
    businessName: companyName || undefined,
    phone: normalizeText(source.phone) || undefined,
    email: normalizeText(source.email) || undefined,
    location: normalizeText(source.location) || undefined,
    address: normalizeText(source.businessAddress || source.address) || undefined,
    website: normalizeText(source.website) || undefined,
    poBox: normalizeText(source.poBox) || undefined,
    fax: normalizeText(source.fax) || undefined,
    tin: normalizeText(source.tin) || undefined,
    vrn: normalizeText(source.vrn) || undefined,
    taxId: normalizeText(source.taxId || source.tin) || undefined,
    logo: normalizeText(source.logo) || undefined,
    businessDescription: normalizeText(source.businessDescription) || undefined,
    receiptFooterMessage: normalizeText(source.receiptFooterMessage) || undefined,
    businessModule: normalizeText(source.businessModule) || undefined
  };
};

const buildSubscriptionPayload = (subscriptionInfo) => {
  const source = subscriptionInfo && typeof subscriptionInfo === 'object' ? subscriptionInfo : {};
  return {
    subscriptionPlan: normalizeText(source.subscriptionPlan) || undefined,
    subscriptionPaymentStatus: normalizeText(source.subscriptionPaymentStatus) || undefined,
    subscriptionStartedAt: normalizeText(source.subscriptionStartedAt) || undefined,
    subscriptionEndsAt: normalizeText(source.subscriptionEndsAt) || undefined,
    subscriptionTrialEndsAt: normalizeText(source.subscriptionTrialEndsAt) || undefined,
    subscriptionBillingCycle: normalizeText(source.subscriptionBillingCycle) || undefined,
    subscriptionDurationDays: Number(source.subscriptionDurationDays || 0) || 0,
    subscriptionMonths: Number(source.subscriptionMonths || 0) || 0,
    subscriptionDiscountPercent: Number(source.subscriptionDiscountPercent || 0) || 0,
    subscriptionRawMonthlyPrice: Number(source.subscriptionRawMonthlyPrice || 0) || 0,
    subscriptionAmountPaid: Number(source.subscriptionAmountPaid || 0) || 0,
    paymentProvider: normalizeText(source.paymentProvider) || undefined,
    paymentPhone: normalizeText(source.paymentPhone) || undefined,
    paymentReference: normalizeText(source.paymentReference) || undefined
  };
};

export const businessApi = {
  async get() {
    try {
      const data = await authenticatedApiRequest('/business');
      const business = data?.business && typeof data.business === 'object' ? data.business : null;
      return syncCompanyInfo(mapBusinessToCompanyInfo(business));
    } catch {
      return syncCompanyInfo(mapBusinessToCompanyInfo(null, readJson(COMPANY_INFO_KEY, {})));
    }
  },

  async update(companyInfo) {
    const payload = buildBusinessPayload(companyInfo);
    const data = await authenticatedApiRequest('/business', {
      method: 'PATCH',
      body: payload
    });
    const business = data?.business && typeof data.business === 'object' ? data.business : payload;
    return syncCompanyInfo(mapBusinessToCompanyInfo(business, companyInfo));
  },

  async updateSubscription(subscriptionInfo) {
    const payload = buildSubscriptionPayload(subscriptionInfo);
    const data = await authenticatedApiRequest('/business/subscription', {
      method: 'PATCH',
      body: payload
    });
    const business = data?.business && typeof data.business === 'object' ? data.business : payload;
    return syncCompanyInfo(mapBusinessToCompanyInfo(business, subscriptionInfo));
  }
};
