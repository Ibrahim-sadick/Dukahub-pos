import { authenticatedApiRequest } from './authApi';
import { readRuntimeCache, writeRuntimeCache } from './runtimeCache';

const EXPENSES_KEY = 'expenses';
const EXPENSE_SEQUENCE_STORAGE_KEY = 'expenseNextNumber';

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

const formatExpenseNumber = (value) => String(Math.max(100, parseInt(String(value ?? ''), 10) || 100)).padStart(4, '0');

const parseExpenseNumber = (value) => {
  const match = String(value || '').match(/(\d+)/);
  if (!match) return NaN;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const readCachedExpenses = () => {
  const cached = readJson(EXPENSES_KEY, []);
  return Array.isArray(cached) ? cached : [];
};

const computeNextExpenseNumber = (expenses = readCachedExpenses()) => {
  const stored = parseInt(String(readJson(EXPENSE_SEQUENCE_STORAGE_KEY, '')), 10);
  const fromList = (Array.isArray(expenses) ? expenses : [])
    .map((entry) => parseExpenseNumber(entry?.expenseNumber || entry?.id))
    .filter((value) => Number.isFinite(value));
  const computed = fromList.length ? Math.max(...fromList) + 1 : 100;
  const value = Number.isFinite(stored) && stored >= 100 ? Math.max(stored, computed) : computed;
  return {
    value,
    expenseNumber: formatExpenseNumber(value)
  };
};

const updateStoredNextExpenseNumber = (expenses) => {
  const next = computeNextExpenseNumber(expenses);
  writeJson(EXPENSE_SEQUENCE_STORAGE_KEY, next.value);
  return next;
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

const sortExpenses = (list) => {
  return (Array.isArray(list) ? list : []).slice().sort((a, b) => {
    const dateA = String(a?.date || a?.createdAt || '');
    const dateB = String(b?.date || b?.createdAt || '');
    if (dateA !== dateB) return dateA < dateB ? 1 : -1;
    const updatedA = String(a?.updatedAt || '');
    const updatedB = String(b?.updatedAt || '');
    return updatedA < updatedB ? 1 : updatedA > updatedB ? -1 : 0;
  });
};

const mapBackendExpenseToUi = (expense) => {
  const metadata = expense?.metadata && typeof expense.metadata === 'object' ? expense.metadata : {};
  const items = Array.isArray(metadata?.items) ? metadata.items : [];
  const paymentMethod = normalizeText(expense?.paymentMethod || metadata?.paymentMethod);
  const status = normalizeText(expense?.status || metadata?.status);
  const location = normalizeText(metadata?.location || expense?.vendor);
  return {
    id: String(expense?.id || ''),
    expenseNumber: normalizeText(metadata?.expenseNumber) || formatExpenseNumber(parseExpenseNumber(expense?.id) || 100),
    date: formatDateInput(expense?.expenseDate || expense?.createdAt) || new Date().toISOString().slice(0, 10),
    status: status || 'Paid',
    paymentMethod: paymentMethod || 'cash',
    reference: normalizeText(metadata?.reference),
    location,
    category: normalizeText(expense?.category || metadata?.category) || 'Other',
    supplier: normalizeText(expense?.vendor),
    title: normalizeText(expense?.title),
    notes: normalizeText(expense?.notes),
    items,
    amount: toNumber(expense?.amount),
    createdAt: normalizeText(expense?.createdAt),
    updatedAt: normalizeText(expense?.updatedAt),
    persisted: true
  };
};

const buildExpensePayload = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const category = normalizeText(source?.category) || 'Other';
  const items = (Array.isArray(source?.items) ? source.items : []).map((item) => ({
    subcategory: normalizeText(item?.subcategory),
    description: normalizeText(item?.description),
    unit: normalizeText(item?.unit) || 'units',
    qty: toNumber(item?.qty),
    rate: toNumber(item?.rate)
  }));
  const firstItem = items[0] || null;
  const title = normalizeText(
    source?.title || firstItem?.description || firstItem?.subcategory || `${category} expense`
  );
  return {
    title,
    category,
    vendor: normalizeText(source?.supplier || source?.vendor || source?.location) || undefined,
    paymentMethod: normalizeText(source?.paymentMethod) || 'cash',
    status: normalizeText(source?.status) || 'Paid',
    amount: toNumber(source?.amount),
    expenseDate: formatDateInput(source?.date) || new Date().toISOString().slice(0, 10),
    notes: normalizeText(source?.notes) || undefined,
    metadata: {
      expenseNumber: normalizeText(source?.expenseNumber) || computeNextExpenseNumber().expenseNumber,
      reference: normalizeText(source?.reference),
      location: normalizeText(source?.location),
      items
    }
  };
};

const syncCachedExpenses = (expenses) => {
  const mapped = (Array.isArray(expenses) ? expenses : []).map(mapBackendExpenseToUi).filter((entry) => entry.id);
  const merged = sortExpenses(mergeCachedById(mapped, readCachedExpenses()));
  writeJson(EXPENSES_KEY, merged);
  updateStoredNextExpenseNumber(merged);
  notifyDataUpdated();
  return merged;
};

const syncCachedExpense = (expense) => {
  const nextExpense = mapBackendExpenseToUi(expense);
  const merged = sortExpenses([
    nextExpense,
    ...readCachedExpenses().filter((entry) => String(entry?.id || '') !== String(nextExpense.id || ''))
  ]);
  writeJson(EXPENSES_KEY, merged);
  updateStoredNextExpenseNumber(merged);
  notifyDataUpdated();
  return nextExpense;
};

export const expensesApi = {
  getNextExpenseNumber() {
    return computeNextExpenseNumber();
  },

  async list() {
    try {
      const data = await authenticatedApiRequest('/expenses');
      return syncCachedExpenses(data?.expenses);
    } catch {
      return readCachedExpenses();
    }
  },

  async create(payload) {
    const body = buildExpensePayload(payload);
    const data = await authenticatedApiRequest('/expenses', {
      method: 'POST',
      body
    });
    return syncCachedExpense(data?.expense);
  },

  async update(expenseId, payload) {
    const id = normalizeText(expenseId);
    if (!id) throw new Error('Expense not found');
    const body = buildExpensePayload(payload);
    const existing = readCachedExpenses().find((entry) => String(entry?.id || '') === id) || null;
    if (existing?.persisted === false) {
      throw new Error('This expense exists only in local cache. Recreate it after reconnecting to the server.');
    }
    const data = await authenticatedApiRequest(`/expenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body
    });
    return syncCachedExpense(data?.expense);
  },

  async remove(expenseId) {
    const id = normalizeText(expenseId);
    if (!id) throw new Error('Expense not found');
    const target = readCachedExpenses().find((entry) => String(entry?.id || '') === id) || null;
    if (target?.persisted === false) {
      const cached = readCachedExpenses();
      const next = cached.filter((entry) => String(entry?.id || '') !== id);
      writeJson(EXPENSES_KEY, next);
      updateStoredNextExpenseNumber(next);
      notifyDataUpdated();
      return { id };
    }
    await authenticatedApiRequest(`/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    const cached = readCachedExpenses();
    const next = cached.filter((entry) => String(entry?.id || '') !== id);
    writeJson(EXPENSES_KEY, next);
    updateStoredNextExpenseNumber(next);
    notifyDataUpdated();
    return { id };
  }
};
