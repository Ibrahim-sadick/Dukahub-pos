import { authenticatedApiRequest } from './authApi';
import { readRuntimeCache, writeRuntimeCache } from './runtimeCache';

const SUPPLIERS_KEY = 'suppliers';
const PURCHASES_KEY = 'purchases';
const PO_SEQUENCE_STORAGE_KEY = 'purchaseOrderNextNumber';

const readJson = (key, fallback) => {
  return readRuntimeCache(key, fallback);
};

const writeJson = (key, value) => {
  writeRuntimeCache(key, value);
};

const notifyDataUpdated = () => {
  try {
    window.dispatchEvent(new CustomEvent('dataUpdated'));
  } catch {}
};

const normalizeText = (value) => String(value || '').trim();

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDocumentNumber = (value) => {
  const match = String(value || '').match(/(\d+)/);
  if (!match) return NaN;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const formatDocumentNumber = (prefix, value, padding) => {
  const parsed = parseInt(String(value ?? ''), 10);
  const safeValue = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const safePadding = Number.isFinite(Number(padding)) && Number(padding) > 0 ? Number(padding) : 5;
  return `${String(prefix || 'PO')}${String(safeValue).padStart(safePadding, '0')}`;
};

const formatDateInput = (value) => {
  const text = normalizeText(value);
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return '';
  return new Date(parsed).toISOString().slice(0, 10);
};

const supplierIdFromName = (name) => {
  const value = normalizeText(name).toLowerCase();
  if (!value) return '';
  return value.replace(/\s+/g, '_').replace(/[^a-z0-9_]+/g, '').slice(0, 60) || value.slice(0, 60);
};

const readCachedSuppliers = () => {
  const cached = readJson(SUPPLIERS_KEY, []);
  return Array.isArray(cached) ? cached : [];
};

const readCachedPurchases = () => {
  const cached = readJson(PURCHASES_KEY, []);
  return Array.isArray(cached) ? cached : [];
};

// eslint-disable-next-line no-unused-vars
const getLocalNextPurchaseNumber = () => {
  const cached = readCachedPurchases();
  const storedNext = parseInt(String(readJson(PO_SEQUENCE_STORAGE_KEY, '')), 10);
  const purchaseNumbers = cached
    .map((entry) => parseDocumentNumber(entry?.lpoNumber))
    .filter((value) => Number.isFinite(value));
  const computedNext = purchaseNumbers.length ? Math.max(...purchaseNumbers) + 1 : 1;
  const nextValue = Number.isFinite(storedNext) && storedNext > 0 ? Math.max(storedNext, computedNext) : computedNext;
  return {
    value: nextValue,
    purchaseNumber: formatDocumentNumber('PO', nextValue, 5)
  };
};

const mergeCachedById = (incoming, cached) => {
  const nextList = Array.isArray(incoming) ? incoming : [];
  const currentList = Array.isArray(cached) ? cached : [];
  const incomingIds = new Set(nextList.map((entry) => String(entry?.id || '')).filter(Boolean));
  const preserved = currentList.filter((entry) => {
    const id = String(entry?.id || '');
    return id && !incomingIds.has(id);
  });
  return [...nextList, ...preserved];
};

const sortPurchases = (list) => {
  return (Array.isArray(list) ? list : []).slice().sort((a, b) => {
    const dateA = String(a?.date || a?.createdAt || '');
    const dateB = String(b?.date || b?.createdAt || '');
    if (dateA !== dateB) return dateA < dateB ? 1 : -1;
    const updatedA = String(a?.updatedAt || '');
    const updatedB = String(b?.updatedAt || '');
    return updatedA < updatedB ? 1 : updatedA > updatedB ? -1 : 0;
  });
};

const mapBackendSupplierToUi = (supplier) => {
  const contactPerson = normalizeText(supplier?.contactPerson);
  const parts = contactPerson ? contactPerson.split(/\s+/) : [];
  return {
    id: String(supplier?.id || ''),
    name: normalizeText(supplier?.name),
    companyName: normalizeText(supplier?.name),
    contactPerson,
    contactFirstName: parts[0] || '',
    contactLastName: parts.slice(1).join(' '),
    phone: normalizeText(supplier?.phone),
    workPhone: '',
    mobile: '',
    email: normalizeText(supplier?.email),
    ccEmail: '',
    fax: '',
    website: '',
    other: normalizeText(supplier?.notes),
    address: normalizeText(supplier?.address),
    billedFrom: normalizeText(supplier?.address),
    shippedFrom: '',
    openingBalance: toNumber(supplier?.openingBalance),
    openingBalanceAsOf: '',
    inactive: Boolean(supplier?.inactive),
    items: [],
    createdAt: normalizeText(supplier?.createdAt),
    updatedAt: normalizeText(supplier?.updatedAt),
    persisted: true
  };
};

const buildSupplierPayload = (payload, options = {}) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const fullName = [source?.contactFirstName, source?.contactLastName].map(normalizeText).filter(Boolean).join(' ');
  const contactPerson = normalizeText(source?.contactPerson || fullName);
  const body = {};

  if (options.createMode || 'name' in source) body.name = normalizeText(source?.name || source?.companyName);
  if (options.createMode || 'contactPerson' in source || 'contactFirstName' in source || 'contactLastName' in source) {
    body.contactPerson = contactPerson || undefined;
  }
  if (options.createMode || 'phone' in source) body.phone = normalizeText(source?.phone || source?.mobile || source?.workPhone) || undefined;
  if (options.createMode || 'email' in source) body.email = normalizeText(source?.email) || undefined;
  if (options.createMode || 'address' in source || 'billedFrom' in source) body.address = normalizeText(source?.address || source?.billedFrom) || undefined;
  if (options.createMode || 'notes' in source || 'other' in source) body.notes = normalizeText(source?.notes || source?.other) || undefined;
  if (options.createMode || 'openingBalance' in source) body.openingBalance = toNumber(source?.openingBalance);
  if (options.createMode || 'inactive' in source) body.inactive = Boolean(source?.inactive);
  return body;
};

const syncCachedSuppliers = (suppliers) => {
  const mapped = (Array.isArray(suppliers) ? suppliers : []).map(mapBackendSupplierToUi).filter((entry) => entry.id);
  const merged = mergeCachedById(mapped, readCachedSuppliers());
  writeJson(SUPPLIERS_KEY, merged);
  notifyDataUpdated();
  return merged;
};

const syncCachedSupplier = (supplier) => {
  const nextSupplier = mapBackendSupplierToUi(supplier);
  const cached = readCachedSuppliers();
  const merged = [nextSupplier, ...cached.filter((entry) => String(entry?.id || '') !== String(nextSupplier.id || ''))];
  writeJson(SUPPLIERS_KEY, merged);
  notifyDataUpdated();
  return nextSupplier;
};

// eslint-disable-next-line no-unused-vars
const normalizeDestination = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === 'store' ? 'store' : 'stock';
};

const mapBackendPurchaseItemToUi = (item) => {
  const qty = toNumber(item?.quantity);
  const unitCost = toNumber(item?.unitCost);
  const total = toNumber(item?.total || qty * unitCost);
  return {
    id: String(item?.id || ''),
    productId: normalizeText(item?.productId),
    item: normalizeText(item?.itemName),
    name: normalizeText(item?.itemName),
    itemName: normalizeText(item?.itemName),
    _custom: !item?.productId,
    description: '',
    qty: String(qty),
    unit: normalizeText(item?.unit) || 'pcs',
    price: String(unitCost),
    tax: '',
    total: String(total.toFixed(2)),
    category: normalizeText(item?.productType || 'general') || 'general'
  };
};

const mapBackendPurchaseToUi = (purchase) => {
  const metadata = purchase?.metadata && typeof purchase.metadata === 'object' ? purchase.metadata : {};
  return {
    id: String(purchase?.id || ''),
    lpoNumber: normalizeText(purchase?.purchaseNumber),
    date: formatDateInput(purchase?.purchaseDate || purchase?.createdAt) || new Date().toISOString().slice(0, 10),
    supplierId: normalizeText(purchase?.supplierId) || supplierIdFromName(purchase?.supplierName),
    supplierName: normalizeText(purchase?.supplier?.name || purchase?.supplierName),
    supplierAddress: normalizeText(purchase?.supplier?.address || metadata?.supplierAddress),
    destination: normalizeDestination(purchase?.destination),
    items: (Array.isArray(purchase?.items) ? purchase.items : []).map(mapBackendPurchaseItemToUi),
    subtotal: toNumber(purchase?.subtotal),
    taxTotal: toNumber(purchase?.tax),
    total: toNumber(purchase?.total),
    terms: normalizeText(metadata?.terms),
    notes: normalizeText(purchase?.notes),
    shipToName: normalizeText(metadata?.shipToName),
    shipToAddress: normalizeText(metadata?.shipToAddress),
    vendorMessage: normalizeText(metadata?.vendorMessage),
    memo: normalizeText(metadata?.memo),
    createdAt: normalizeText(purchase?.createdAt),
    updatedAt: normalizeText(purchase?.updatedAt),
    persisted: true
  };
};

const buildPurchasePayload = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const items = (Array.isArray(source?.items) ? source.items : [])
    .map((item) => {
      const quantity = toNumber(item?.qty ?? item?.quantity);
      const unitCost = toNumber(item?.price ?? item?.unitCost);
      const total = toNumber(item?.total || quantity * unitCost);
      const itemName = normalizeText(item?.item || item?.itemName || item?.name);
      if (!itemName) return null;
      return {
        productId: normalizeText(item?.productId) || undefined,
        itemName,
        productType: normalizeText(item?.category || item?.productType) || undefined,
        quantity,
        unit: normalizeText(item?.unit) || 'pcs',
        unitCost,
        total
      };
    })
    .filter(Boolean);

  return {
    purchaseNumber: source?.useServerNumbering ? undefined : normalizeText(source?.lpoNumber) || undefined,
    supplierId: normalizeText(source?.supplierId) || undefined,
    supplierName: normalizeText(source?.supplierName) || undefined,
    destination: normalizeText(source?.destination) || undefined,
    status: 'Received',
    paymentStatus: 'Paid',
    subtotal: toNumber(source?.subtotal),
    tax: toNumber(source?.taxTotal ?? source?.tax),
    discount: 0,
    total: toNumber(source?.total),
    amountPaid: toNumber(source?.total),
    balanceDue: 0,
    purchaseDate: formatDateInput(source?.date) || new Date().toISOString().slice(0, 10),
    notes: normalizeText(source?.notes) || undefined,
    metadata: {
      terms: normalizeText(source?.terms),
      shipToName: normalizeText(source?.shipToName),
      shipToAddress: normalizeText(source?.shipToAddress),
      vendorMessage: normalizeText(source?.vendorMessage),
      memo: normalizeText(source?.memo),
      supplierAddress: normalizeText(source?.supplierAddress)
    },
    items
  };
};

const syncCachedPurchases = (purchases) => {
  const mapped = (Array.isArray(purchases) ? purchases : []).map(mapBackendPurchaseToUi).filter((entry) => entry.id);
  const merged = sortPurchases(mergeCachedById(mapped, readCachedPurchases()));
  writeJson(PURCHASES_KEY, merged);
  notifyDataUpdated();
  return merged;
};

const syncCachedPurchase = (purchase) => {
  const nextPurchase = mapBackendPurchaseToUi(purchase);
  const cached = readCachedPurchases();
  const merged = sortPurchases([nextPurchase, ...cached.filter((entry) => String(entry?.id || '') !== String(nextPurchase.id || ''))]);
  writeJson(PURCHASES_KEY, merged);
  notifyDataUpdated();
  return nextPurchase;
};

const removeCachedPurchase = (purchaseId) => {
  const id = normalizeText(purchaseId);
  const cached = readCachedPurchases();
  const next = sortPurchases(cached.filter((entry) => String(entry?.id || '') !== id));
  writeJson(PURCHASES_KEY, next);
  notifyDataUpdated();
  return next;
};

export const suppliersApi = {
  async list() {
    try {
      const data = await authenticatedApiRequest('/suppliers');
      return syncCachedSuppliers(data?.suppliers);
    } catch {
      return readCachedSuppliers();
    }
  },

  async create(payload) {
    const body = buildSupplierPayload(payload, { createMode: true });
    const data = await authenticatedApiRequest('/suppliers', {
      method: 'POST',
      body
    });
    return syncCachedSupplier(data?.supplier);
  },

  async patch(supplierId, patch) {
    const id = String(supplierId || '');
    const body = buildSupplierPayload(patch);
    const existing = readCachedSuppliers().find((entry) => String(entry?.id || '') === id);
    if (existing && existing.persisted === false) {
      throw new Error('This supplier exists only in local cache. Recreate it after reconnecting to the server.');
    }
    const data = await authenticatedApiRequest(`/suppliers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body
    });
    return syncCachedSupplier(data?.supplier);
  }
};

export const purchasesApi = {
  async list() {
    try {
      const data = await authenticatedApiRequest('/purchases');
      return syncCachedPurchases(data?.purchases);
    } catch {
      return readCachedPurchases();
    }
  },

  async previewNextNumber() {
    try {
      const data = await authenticatedApiRequest('/purchases/next-number');
      const purchaseNumber = normalizeText(data?.purchaseNumber);
      if (purchaseNumber) return purchaseNumber;
      throw new Error('Purchase number was not returned by the backend');
    } catch {
      return getLocalNextPurchaseNumber().purchaseNumber;
    }
  },

  async create(payload) {
    const body = buildPurchasePayload(payload);
    const data = await authenticatedApiRequest('/purchases', {
      method: 'POST',
      body
    });
    return syncCachedPurchase(data?.purchase);
  },

  async remove(purchaseId) {
    const id = normalizeText(purchaseId);
    if (!id) throw new Error('Purchase not found');
    const target = readCachedPurchases().find((entry) => String(entry?.id || '') === id) || null;
    if (target?.persisted === false) {
      removeCachedPurchase(id);
      return { id };
    }
    await authenticatedApiRequest(`/purchases/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    removeCachedPurchase(id);
    return { id };
  }
};
