import { authenticatedApiRequest } from './authApi';
import { productsApi } from './productsApi';
import { readRuntimeCache, writeRuntimeCache } from './runtimeCache';

const SALES_KEY = 'sales';

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

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const sameJson = (left, right) => {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

const readCachedSales = () => {
  const cached = readJson(SALES_KEY, []);
  return Array.isArray(cached) ? cached : [];
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

const mapBackendSaleToUi = (sale) => {
  const firstItem = Array.isArray(sale?.items) && sale.items.length > 0 ? sale.items[0] : null;
  const metadata = sale?.metadata && typeof sale.metadata === 'object' ? sale.metadata : {};
  const mappedItems = Array.isArray(sale?.items)
    ? sale.items.map((item) => ({
        ...item,
        item: normalizeText(item?.item || item?.productName),
        productName: normalizeText(item?.productName || item?.item),
        qty: toNumber(item?.qty),
        unit: normalizeText(item?.unit) || 'pcs',
        price: toNumber(item?.price),
        rate: toNumber(item?.price),
        total: toNumber(item?.total)
      }))
    : [];
  const quantity = toNumber(firstItem?.qty);
  const price = toNumber(firstItem?.price);
  const currency = normalizeText(metadata?.currency || metadata?.currencyLabel || sale?.currency || sale?.currencyLabel).toUpperCase() || 'TZS';
  const exchangeRate = toNumber(metadata?.usdRate ?? metadata?.exchangeRate ?? sale?.usdRate ?? sale?.exchangeRate);
  return {
    id: String(sale?.id || ''),
    saleNumber: normalizeText(sale?.saleNumber),
    orderNumber: normalizeText(sale?.saleNumber),
    creditNumber: normalizeText(sale?.saleNumber),
    invoiceNumber: normalizeText(sale?.invoiceNumber),
    poNumber: normalizeText(sale?.poNumber),
    date: normalizeText(sale?.saleDate || sale?.createdAt).slice(0, 10),
    saleDate: normalizeText(sale?.saleDate || sale?.createdAt),
    creditDate: normalizeText(sale?.saleDate || sale?.createdAt).slice(0, 10),
    customerName: normalizeText(sale?.customerName),
    name: normalizeText(sale?.customerName),
    customerType: normalizeText(metadata?.customerType || 'individual'),
    phone: normalizeText(sale?.customerPhone),
    email: normalizeText(sale?.customerEmail),
    customerAddress: normalizeText(sale?.customerAddress),
    productType: normalizeText(firstItem?.productType || metadata?.productType || 'general') || 'general',
    productName: normalizeText(firstItem?.productName || firstItem?.item || metadata?.productName),
    quantity,
    qty: quantity,
    unit: normalizeText(firstItem?.unit || metadata?.unit) || 'pcs',
    price,
    rate: price,
    amount: toNumber(sale?.amount || sale?.finalTotal),
    subtotal: toNumber(sale?.subtotal),
    tax: toNumber(sale?.tax),
    taxRate: toNumber(sale?.taxRate),
    shipping: toNumber(sale?.shipping),
    discount: toNumber(sale?.discount),
    discountType: normalizeText(metadata?.discountType || 'percentage'),
    finalTotal: toNumber(sale?.finalTotal || sale?.amount),
    amountPaid: toNumber(firstDefined(sale?.amountPaid, sale?.finalTotal, sale?.amount)),
    balanceDue: toNumber(sale?.balanceDue),
    paymentTerms: normalizeText(sale?.paymentTerms),
    terms: normalizeText(sale?.paymentTerms),
    dueDate: normalizeText(sale?.dueDate).slice(0, 10),
    currency,
    currencyLabel: currency,
    usdEnabled: metadata?.usdEnabled ?? currency === 'USD',
    usdRate: exchangeRate,
    exchangeRate,
    convertedCurrencyLabel:
      normalizeText(metadata?.convertedCurrencyLabel) || (currency === 'USD' && exchangeRate > 0 ? 'TZS' : currency),
    paymentMethod: normalizeText(sale?.paymentMethod || 'cash').toLowerCase(),
    saleType: normalizeText(sale?.saleType || 'retail').toLowerCase(),
    status: normalizeText(sale?.status),
    notes: normalizeText(sale?.notes),
    description: normalizeText(sale?.description),
    bank: normalizeText(metadata?.bank),
    accountNumber: normalizeText(metadata?.accountNumber),
    referenceId: normalizeText(metadata?.referenceId),
    mobileProvider: normalizeText(metadata?.mobileProvider),
    transactionId: normalizeText(metadata?.transactionId),
    chequeNumber: normalizeText(metadata?.chequeNumber),
    creditCardNumber: normalizeText(metadata?.creditCardNumber),
    billTo: normalizeText(metadata?.billTo),
    shipTo: normalizeText(metadata?.shipTo),
    items: mappedItems,
    persisted: true,
    createdAt: normalizeText(sale?.createdAt),
    updatedAt: normalizeText(sale?.updatedAt)
  };
};

const syncCachedSales = (sales) => {
  const mapped = (Array.isArray(sales) ? sales : []).map(mapBackendSaleToUi).filter((entry) => entry.id);
  const cached = readCachedSales();
  const merged = mergeCachedById(mapped, cached);
  writeJson(SALES_KEY, merged);
  if (!sameJson(merged, cached)) notifyDataUpdated();
  return merged;
};

const syncCachedSale = (sale) => {
  const nextSale = mapBackendSaleToUi(sale);
  const cached = readCachedSales();
  const merged = [nextSale, ...cached.filter((entry) => String(entry?.id || '') !== String(nextSale.id || ''))];
  writeJson(SALES_KEY, merged);
  if (!sameJson(merged, cached)) notifyDataUpdated();
  return nextSale;
};

const removeCachedSale = (saleId) => {
  const id = normalizeText(saleId);
  const cached = readCachedSales();
  const next = cached.filter((entry) => String(entry?.id || '') !== id);
  writeJson(SALES_KEY, next);
  try {
    productsApi.removeLocalMovementsByReference(id);
  } catch {}
  notifyDataUpdated();
  return next;
};

const buildSalePayload = async (payload) => {
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  const items = rawItems.length
    ? await Promise.all(
        rawItems.map(async (item) => {
          const productName = normalizeText(item?.productName || item?.itemName || item?.item || item?.name);
          const explicitProductId = normalizeText(item?.productId);
          const matchedProduct = explicitProductId ? null : await productsApi.findByName(productName);
          const quantity = toNumber(item?.qty ?? item?.quantity);
          const lineTotal = toNumber(item?.total ?? item?.amountTzs ?? item?.amount);
          const price = toNumber(item?.price ?? item?.rate ?? item?.unitPrice ?? (quantity > 0 ? lineTotal / quantity : 0));
          return {
            productId: explicitProductId || (matchedProduct?.persisted ? String(matchedProduct.id || '') : undefined),
            item: productName,
            productName,
            productType:
              normalizeText(item?.productType || item?.itemType || matchedProduct?.category || matchedProduct?.productType || payload?.productType || 'general') ||
              'general',
            qty: quantity,
            unit: normalizeText(item?.unit) || matchedProduct?.unit || 'pcs',
            price,
            total: lineTotal || quantity * price
          };
        })
      )
    : [];

  const fallbackQuantity = toNumber(payload?.quantity);
  const fallbackPrice = toNumber(payload?.price);
  const fallbackProductName = normalizeText(payload?.productName || payload?.itemName);
  const fallbackProductType = normalizeText(payload?.productType || 'general') || 'general';
  const matchedProduct = items.length ? null : await productsApi.findByName(fallbackProductName);
  const normalizedItems = items.length
    ? items
    : [
        {
          productId: matchedProduct?.persisted ? String(matchedProduct.id || '') : undefined,
          item: fallbackProductName,
          productName: fallbackProductName,
          productType: fallbackProductType,
          qty: fallbackQuantity,
          unit: normalizeText(payload?.unit) || 'pcs',
          price: fallbackPrice,
          total: toNumber(payload?.amount || payload?.finalTotal || fallbackQuantity * fallbackPrice)
        }
      ];
  const derivedSubtotal = normalizedItems.reduce((sum, item) => sum + toNumber(item?.total), 0);
  const currency = normalizeText(payload?.currency || payload?.currencyLabel).toUpperCase() || undefined;
  const exchangeRate = toNumber(payload?.usdRate ?? payload?.exchangeRate);
  return {
    saleNumber: normalizeText(payload?.saleNumber || payload?.orderNumber) || undefined,
    invoiceNumber: normalizeText(payload?.invoiceNumber) || undefined,
    poNumber: normalizeText(payload?.poNumber) || undefined,
    customerName: normalizeText(payload?.customerName || payload?.name) || undefined,
    customerEmail: normalizeText(payload?.email || payload?.customerEmail) || undefined,
    customerPhone: normalizeText(payload?.phone || payload?.customerPhone) || undefined,
    customerAddress: normalizeText(payload?.customerAddress || payload?.billTo || payload?.shipTo) || undefined,
    saleType: normalizeText(payload?.saleType || 'retail') || 'retail',
    paymentMethod: normalizeText(payload?.paymentMethod || 'cash') || 'cash',
    status: normalizeText(payload?.status || 'Completed') || 'Completed',
    amount: toNumber(payload?.amount || payload?.finalTotal || payload?.totalTzs || payload?.total || derivedSubtotal),
    subtotal: toNumber(payload?.subtotal || payload?.totalTzs || derivedSubtotal),
    tax: toNumber(payload?.tax),
    taxRate: toNumber(payload?.taxRate),
    shipping: toNumber(payload?.shipping),
    discount: toNumber(payload?.discount),
    finalTotal: toNumber(payload?.finalTotal || payload?.amount || payload?.totalTzs || payload?.total || derivedSubtotal),
    amountPaid: toNumber(firstDefined(payload?.amountPaid, payload?.paidAmount, payload?.finalTotal, payload?.amount, payload?.totalTzs, payload?.total, derivedSubtotal)),
    balanceDue: toNumber(payload?.balanceDue),
    paymentTerms: normalizeText(payload?.paymentTerms) || undefined,
    dueDate: normalizeText(payload?.dueDate) || undefined,
    saleDate: normalizeText(payload?.date || payload?.saleDate || payload?.orderDateTime || payload?.orderDate) || new Date().toISOString().slice(0, 10),
    notes: normalizeText(payload?.notes) || undefined,
    description: normalizeText(payload?.description) || undefined,
    metadata: {
      customerType: normalizeText(payload?.customerType || 'individual') || 'individual',
      discountType: normalizeText(payload?.discountType || 'percentage') || 'percentage',
      bank: normalizeText(payload?.bank) || undefined,
      accountNumber: normalizeText(payload?.accountNumber) || undefined,
      referenceId: normalizeText(payload?.referenceId) || undefined,
      mobileProvider: normalizeText(payload?.mobileProvider) || undefined,
      transactionId: normalizeText(payload?.transactionId) || undefined,
      chequeNumber: normalizeText(payload?.chequeNumber) || undefined,
      creditCardNumber: normalizeText(payload?.creditCardNumber) || undefined,
      billTo: normalizeText(payload?.billTo) || undefined,
      shipTo: normalizeText(payload?.shipTo) || undefined,
      currency,
      currencyLabel: currency,
      usdEnabled: payload?.usdEnabled ?? (currency === 'USD' ? true : undefined),
      usdRate: exchangeRate || undefined,
      exchangeRate: exchangeRate || undefined,
      convertedCurrencyLabel: currency === 'USD' && exchangeRate > 0 ? 'TZS' : undefined,
      unit: normalizeText(payload?.unit || normalizedItems[0]?.unit) || undefined,
      productName: fallbackProductName || normalizeText(normalizedItems[0]?.productName) || undefined,
      productType: fallbackProductType || normalizeText(normalizedItems[0]?.productType) || undefined
    },
    items: normalizedItems
  };
};

export const salesApi = {
  async list() {
    try {
      const data = await authenticatedApiRequest('/sales');
      return syncCachedSales(data?.sales);
    } catch {
      return readCachedSales();
    }
  },

  async create(payload) {
    const body = await buildSalePayload(payload);
    const data = await authenticatedApiRequest('/sales', {
      method: 'POST',
      body
    });
    return syncCachedSale(data?.sale);
  },

  async update(saleId, payload) {
    const id = normalizeText(saleId);
    if (!id) throw new Error('Sale not found');
    const body = await buildSalePayload(payload);
    const data = await authenticatedApiRequest(`/sales/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body
    });
    return syncCachedSale(data?.sale);
  },

  async remove(saleId) {
    const id = normalizeText(saleId);
    if (!id) throw new Error('Sale not found');
    const target = readCachedSales().find((entry) => String(entry?.id || '') === id) || null;
    try {
      await authenticatedApiRequest(`/sales/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (error) {
      if (target?.persisted) throw error;
    }
    removeCachedSale(id);
    return { id };
  }
};
