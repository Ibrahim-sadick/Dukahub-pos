import { authenticatedApiRequest } from './authApi';

const LEGACY_CUSTOMERS_KEY = 'customers';

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const normalizeText = (value) => String(value || '').trim();

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const readLegacyCustomers = () => {
  try {
    const raw = window.localStorage.getItem(LEGACY_CUSTOMERS_KEY);
    const list = safeJsonParse(raw, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const clearLegacyCustomers = () => {
  try {
    window.localStorage.removeItem(LEGACY_CUSTOMERS_KEY);
  } catch {}
};

const notifyDataUpdated = () => {
  try {
    window.dispatchEvent(new CustomEvent('dataUpdated'));
  } catch {}
};

const sortCustomers = (customers) => {
  return (Array.isArray(customers) ? customers : [])
    .slice()
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
};

const mapBackendCustomerToUi = (customer) => {
  const name = normalizeText(customer?.name);
  const customerType = normalizeText(customer?.customerType).toLowerCase();
  const address = normalizeText(customer?.address);
  return {
    id: String(customer?.id || ''),
    name,
    company: customerType === 'company' ? name : '',
    mainEmail: normalizeText(customer?.email),
    mainPhone: normalizeText(customer?.phone),
    billTo: address,
    shipTo: address,
    address,
    customerType: customerType || '',
    notes: normalizeText(customer?.notes),
    openingBalance: toNumber(customer?.openingBalance),
    isActive: customer?.isActive !== false,
    createdAt: normalizeText(customer?.createdAt),
    updatedAt: normalizeText(customer?.updatedAt),
    persisted: true
  };
};

const buildCustomerPayload = (payload, existing = null) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const fallback = existing && typeof existing === 'object' ? existing : {};
  const company = normalizeText(source.company || fallback.company);
  const explicitName = normalizeText(source.name || fallback.name);
  const name = explicitName || company;
  return {
    name,
    phone: normalizeText(source.mainPhone || source.phone || source.mobile || fallback.mainPhone || fallback.phone || fallback.mobile) || null,
    email: normalizeText(source.mainEmail || source.email || source.ccEmail || fallback.mainEmail || fallback.email || fallback.ccEmail) || null,
    address: normalizeText(source.billTo || source.address || fallback.billTo || fallback.address) || null,
    customerType: normalizeText(source.customerType || fallback.customerType || (company ? 'company' : 'individual')) || null,
    notes: normalizeText(source.notes || fallback.notes) || null,
    openingBalance: toNumber(source.openingBalance ?? fallback.openingBalance ?? 0),
    isActive: 'isActive' in source ? Boolean(source.isActive) : fallback.isActive !== false
  };
};

const getCustomerKey = (customer) => {
  return [
    normalizeText(customer?.name).toLowerCase(),
    normalizeText(customer?.mainEmail || customer?.email).toLowerCase(),
    normalizeText(customer?.mainPhone || customer?.phone).toLowerCase()
  ].join('|');
};

const migrateLegacyCustomers = async (customers) => {
  const legacyCustomers = readLegacyCustomers();
  if (!legacyCustomers.length) return sortCustomers(customers);

  const merged = sortCustomers(customers);
  const knownKeys = new Set(merged.map(getCustomerKey));
  let migratedAll = true;

  for (const legacy of legacyCustomers) {
    const body = buildCustomerPayload(legacy);
    if (!normalizeText(body.name)) continue;
    const key = getCustomerKey(body);
    if (knownKeys.has(key)) continue;
    try {
      const data = await authenticatedApiRequest('/customers', {
        method: 'POST',
        body
      });
      const mapped = mapBackendCustomerToUi(data?.customer);
      if (mapped.id) {
        merged.push(mapped);
        knownKeys.add(key);
      }
    } catch {
      migratedAll = false;
    }
  }

  if (migratedAll) clearLegacyCustomers();
  notifyDataUpdated();
  return sortCustomers(merged);
};

export const customersApi = {
  async list() {
    const data = await authenticatedApiRequest('/customers');
    const customers = sortCustomers((Array.isArray(data?.customers) ? data.customers : []).map(mapBackendCustomerToUi));
    return migrateLegacyCustomers(customers);
  },

  async create(payload) {
    const body = buildCustomerPayload(payload);
    if (!normalizeText(body.name)) throw new Error('Customer name is required');
    const data = await authenticatedApiRequest('/customers', {
      method: 'POST',
      body
    });
    notifyDataUpdated();
    return mapBackendCustomerToUi(data?.customer);
  },

  async update(customerId, payload) {
    const id = String(customerId || '');
    if (!id) throw new Error('Customer not found');
    const body = buildCustomerPayload(payload);
    if (!normalizeText(body.name)) throw new Error('Customer name is required');
    const data = await authenticatedApiRequest(`/customers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body
    });
    notifyDataUpdated();
    return mapBackendCustomerToUi(data?.customer);
  },

  async remove(customerId) {
    const id = String(customerId || '');
    if (!id) throw new Error('Customer not found');
    await authenticatedApiRequest(`/customers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    notifyDataUpdated();
    return { id };
  }
};
