import { authenticatedApiRequest } from './authApi';
import { productsApi } from './productsApi';
import { readRuntimeCache, writeRuntimeCache } from './runtimeCache';

const DAMAGE_STOCKS_KEY = 'damagedStocks';
const DAMAGE_SEQUENCE_STORAGE_KEY = 'nextDamageNumber';
const DAMAGE_NUMBER_START = 7000;
const DAMAGE_NUMBER_PAD = 6;

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

const formatDateInput = (value) => {
  const text = normalizeText(value);
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return '';
  return new Date(parsed).toISOString().slice(0, 10);
};

const formatDamageNumber = (value) => String(Math.max(DAMAGE_NUMBER_START, parseInt(String(value ?? ''), 10) || DAMAGE_NUMBER_START)).padStart(DAMAGE_NUMBER_PAD, '0');

const parseDamageNumber = (value) => {
  const match = String(value || '').match(/(\d+)/);
  if (!match) return NaN;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const readCachedDamageStocks = () => {
  const cached = readJson(DAMAGE_STOCKS_KEY, []);
  return Array.isArray(cached) ? cached : [];
};

const computeNextDamageNumber = (records = readCachedDamageStocks()) => {
  const stored = parseInt(String(readJson(DAMAGE_SEQUENCE_STORAGE_KEY, '')), 10);
  const fromList = (Array.isArray(records) ? records : [])
    .map((entry) => parseDamageNumber(entry?.rmaNumber || entry?.rmaNo || entry?.id))
    .filter((value) => Number.isFinite(value));
  const computed = fromList.length ? Math.max(...fromList) + 1 : DAMAGE_NUMBER_START;
  const value = Number.isFinite(stored) && stored >= DAMAGE_NUMBER_START ? Math.max(stored, computed) : computed;
  return {
    value,
    rmaNumber: formatDamageNumber(value)
  };
};

const updateStoredNextDamageNumber = (records) => {
  const next = computeNextDamageNumber(records);
  writeJson(DAMAGE_SEQUENCE_STORAGE_KEY, next.value);
  return next;
};

const sortDamageStocks = (records) => {
  return (Array.isArray(records) ? records : []).slice().sort((a, b) => {
    const dateA = String(a?.rmaDate || a?.date || a?.createdAt || '');
    const dateB = String(b?.rmaDate || b?.date || b?.createdAt || '');
    if (dateA !== dateB) return dateA < dateB ? 1 : -1;
    const updatedA = String(a?.updatedAt || '');
    const updatedB = String(b?.updatedAt || '');
    return updatedA < updatedB ? 1 : updatedA > updatedB ? -1 : 0;
  });
};

const replaceCachedDamageStocks = (records) => {
  const next = sortDamageStocks((Array.isArray(records) ? records : []).map(mapRecordToUi).filter((entry) => entry.id));
  writeJson(DAMAGE_STOCKS_KEY, next);
  updateStoredNextDamageNumber(next);
  notifyDataUpdated();
  return next;
};

const removeCachedDamageStock = (recordId) => {
  const id = String(recordId || '');
  const next = sortDamageStocks(readCachedDamageStocks().filter((entry) => String(entry?.id || '') !== id));
  writeJson(DAMAGE_STOCKS_KEY, next);
  updateStoredNextDamageNumber(next);
  notifyDataUpdated();
  return next;
};

const sanitizeItems = (items) => {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      productId: normalizeText(item?.productId),
      item: normalizeText(item?.item || item?.itemName),
      description: normalizeText(item?.description),
      unit: normalizeText(item?.unit) || 'item',
      qty: toNumber(item?.qty),
      price: toNumber(item?.price),
      reason: normalizeText(item?.reason),
      restock: item?.restock === false ? false : true,
      itemType: normalizeText(item?.itemType || item?.category || 'general') || 'general'
    }))
    .filter((item) => item.item && item.qty > 0);
};

const buildComputedTotals = (items, source) => {
  const subtotal = items.reduce((sum, item) => sum + toNumber(item.qty) * toNumber(item.price), 0);
  const vatEnabled = Boolean(source?.vatEnabled);
  const tax = vatEnabled ? subtotal * 0.18 : 0;
  const restockPercent = normalizeText(source?.restockPercent || '0') || '0';
  const restockFee = subtotal * (toNumber(restockPercent) / 100);
  const shippingReverse = 0;
  const lossTotal = subtotal + tax - restockFee - shippingReverse;
  return {
    subtotal,
    tax,
    restockPercent,
    restockFee,
    shippingReverse,
    lossTotal
  };
};

const mapRecordToUi = (record) => {
  const items = sanitizeItems(record?.items);
  const totals = buildComputedTotals(items, record);
  return {
    id: String(record?.id || ''),
    rmaNumber: normalizeText(record?.rmaNumber || record?.rmaNo) || computeNextDamageNumber().rmaNumber,
    rmaNo: normalizeText(record?.rmaNumber || record?.rmaNo) || computeNextDamageNumber().rmaNumber,
    rmaDate: formatDateInput(record?.rmaDate || record?.date || record?.createdAt) || new Date().toISOString().slice(0, 10),
    date: formatDateInput(record?.rmaDate || record?.date || record?.createdAt) || new Date().toISOString().slice(0, 10),
    windowDays: normalizeText(record?.windowDays || '30') || '30',
    reportedBy: normalizeText(record?.reportedBy || record?.name),
    name: normalizeText(record?.reportedBy || record?.name),
    phone: normalizeText(record?.phone),
    notes: normalizeText(record?.notes),
    vatEnabled: Boolean(record?.vatEnabled),
    restockPercent: normalizeText(record?.restockPercent ?? totals.restockPercent) || '0',
    subtotal: toNumber(record?.subtotal ?? totals.subtotal),
    tax: toNumber(record?.tax ?? totals.tax),
    restockFee: toNumber(record?.restockFee ?? totals.restockFee),
    shippingReverse: toNumber(record?.shippingReverse ?? totals.shippingReverse),
    lossTotal: toNumber(record?.lossTotal ?? record?.estimatedValue ?? record?.amount ?? totals.lossTotal),
    estimatedValue: toNumber(record?.estimatedValue ?? record?.lossTotal ?? record?.amount ?? totals.lossTotal),
    amount: toNumber(record?.amount ?? record?.lossTotal ?? record?.estimatedValue ?? totals.lossTotal),
    items,
    persisted: Boolean(record?.persisted),
    createdAt: normalizeText(record?.createdAt),
    updatedAt: normalizeText(record?.updatedAt)
  };
};

const syncCachedDamageStocks = (records) => {
  return replaceCachedDamageStocks(records);
};

const syncCachedDamageStock = (record) => {
  const nextRecord = mapRecordToUi(record);
  const merged = sortDamageStocks([
    nextRecord,
    ...readCachedDamageStocks().filter((entry) => String(entry?.id || '') !== String(nextRecord.id || ''))
  ]);
  writeJson(DAMAGE_STOCKS_KEY, merged);
  updateStoredNextDamageNumber(merged);
  notifyDataUpdated();
  return nextRecord;
};

const resolveItemsWithProducts = async (items) => {
  const rows = sanitizeItems(items);
  const resolved = [];
  for (const item of rows) {
    if (item.productId) {
      resolved.push(item);
      continue;
    }
    const product = await productsApi.findByName(item.item).catch(() => null);
    resolved.push({
      ...item,
      productId: normalizeText(product?.id),
      itemType: normalizeText(item?.itemType || product?.category || product?.productType || 'general') || 'general',
      unit: normalizeText(item?.unit || product?.unit) || 'item'
    });
  }
  return resolved;
};

const buildDamagePayload = async (payload, existingRecord) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const items = await resolveItemsWithProducts(source?.items);
  const headerNumber = normalizeText(source?.rmaNumber || existingRecord?.rmaNumber) || computeNextDamageNumber().rmaNumber;
  const record = mapRecordToUi({
    ...(existingRecord && typeof existingRecord === 'object' ? existingRecord : {}),
    ...source,
    rmaNumber: headerNumber,
    items
  });
  return {
    id: record.id,
    rmaNumber: record.rmaNumber,
    rmaDate: record.rmaDate,
    windowDays: record.windowDays,
    reportedBy: record.reportedBy,
    phone: record.phone,
    notes: record.notes,
    vatEnabled: record.vatEnabled,
    restockPercent: record.restockPercent,
    lossTotal: record.lossTotal,
    items
  };
};

export const damageStocksApi = {
  getNextDamageNumber(records) {
    return computeNextDamageNumber(records);
  },

  async list() {
    try {
      const data = await authenticatedApiRequest('/damaged-stocks');
      return syncCachedDamageStocks(data?.records);
    } catch {
      return readCachedDamageStocks();
    }
  },

  async create(payload) {
    const body = await buildDamagePayload(payload);
    const data = await authenticatedApiRequest('/damaged-stocks', {
      method: 'POST',
      body
    });
    return syncCachedDamageStock(data?.record);
  },

  async update(recordId, payload) {
    const id = String(recordId || '');
    if (!id) throw new Error('Damage record not found');
    const existing = readCachedDamageStocks().find((entry) => String(entry?.id || '') === id) || null;
    const body = await buildDamagePayload(payload, existing);
    const data = await authenticatedApiRequest(`/damaged-stocks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body
    });
    return syncCachedDamageStock(data?.record);
  },

  async remove(recordId) {
    const id = String(recordId || '');
    if (!id) throw new Error('Damage record not found');
    try {
      await authenticatedApiRequest(`/damaged-stocks/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      removeCachedDamageStock(id);
      return { id };
    } catch (error) {
      if (error?.status === 404 || String(error?.code || '').trim() === 'DAMAGE_RECORD_NOT_FOUND') {
        removeCachedDamageStock(id);
      }
      throw error;
    }
  }
};
