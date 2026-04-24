import { authenticatedApiRequest } from './authApi';
import { damageStocksApi } from './damageStocksApi';
import { expensesApi } from './expensesApi';
import { purchasesApi } from './purchasingApi';
import { salesApi } from './salesApi';

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const inRange = (value, range = {}) => {
  const date = parseDate(value);
  if (!date) return false;
  if (range?.from instanceof Date && !Number.isNaN(range.from.getTime()) && date < range.from) return false;
  if (range?.to instanceof Date && !Number.isNaN(range.to.getTime()) && date > range.to) return false;
  return true;
};

const listInRange = (key, range, dateSelector) => {
  const rows = Array.isArray(key) ? key : [];
  return (Array.isArray(rows) ? rows : []).filter((entry) => inRange(dateSelector(entry), range));
};

const buildLocalDashboardSummary = async (range) => {
  const [salesRows, expenseRows, damageRows] = await Promise.all([
    salesApi.list().catch(() => []),
    expensesApi.list().catch(() => []),
    damageStocksApi.list().catch(() => [])
  ]);
  const sales = listInRange(salesRows, range, (entry) => entry?.saleDate || entry?.date || entry?.createdAt);
  const expenses = listInRange(expenseRows, range, (entry) => entry?.date || entry?.createdAt);
  const losses = listInRange(damageRows, range, (entry) => entry?.rmaDate || entry?.date || entry?.createdAt);
  return {
    totals: {
      sales: sales.reduce((sum, entry) => sum + toNumber(entry?.totalTzs ?? entry?.amount ?? entry?.finalTotal ?? entry?.total), 0),
      expenses: expenses.reduce((sum, entry) => sum + toNumber(entry?.amount), 0),
      losses: losses.reduce((sum, entry) => sum + toNumber(entry?.lossTotal ?? entry?.estimatedValue ?? entry?.amount), 0),
      profit: 0
    },
    counts: {
      sales: sales.length,
      expenses: expenses.length,
      damagedStocks: losses.length
    }
  };
};

const buildLocalSalesSummary = async (range) => {
  const salesRows = await salesApi.list().catch(() => []);
  const sales = listInRange(salesRows, range, (entry) => entry?.saleDate || entry?.date || entry?.createdAt);

  const aggregate = {
    _sum: {
      finalTotal: sales.reduce((sum, entry) => sum + toNumber(entry?.finalTotal ?? entry?.amount ?? entry?.total ?? entry?.totalTzs), 0),
      amountPaid: sales.reduce((sum, entry) => sum + toNumber(entry?.amountPaid ?? entry?.paidAmount ?? entry?.amount ?? entry?.finalTotal), 0),
      balanceDue: sales.reduce((sum, entry) => sum + toNumber(entry?.balanceDue), 0),
      discount: sales.reduce((sum, entry) => sum + toNumber(entry?.discount), 0)
    },
    _count: {
      _all: sales.length
    }
  };

  const paymentMap = new Map();
  const productMap = new Map();

  sales.forEach((entry) => {
    const paymentMethod = normalizePaymentMethod(entry?.paymentMethod);
    paymentMap.set(paymentMethod, {
      label: paymentMethod,
      total: (paymentMap.get(paymentMethod)?.total || 0) + toNumber(entry?.finalTotal ?? entry?.amount ?? entry?.total ?? entry?.totalTzs),
      count: (paymentMap.get(paymentMethod)?.count || 0) + 1
    });

    const items = Array.isArray(entry?.items) ? entry.items : [];
    if (!items.length) {
      const productName = String(entry?.productName || entry?.itemName || entry?.description || 'Product').trim();
      productMap.set(productName, {
        label: productName,
        qty: (productMap.get(productName)?.qty || 0) + toNumber(entry?.quantity ?? entry?.quantitySold ?? 1),
        total: (productMap.get(productName)?.total || 0) + toNumber(entry?.finalTotal ?? entry?.amount ?? entry?.total ?? entry?.totalTzs)
      });
      return;
    }

    items.forEach((item) => {
      const productName = String(item?.productName || item?.itemName || item?.item || item?.name || 'Product').trim();
      const qty = toNumber(item?.qty ?? item?.quantity);
      const total = toNumber(item?.total ?? item?.amount ?? qty * toNumber(item?.price ?? item?.rate));
      productMap.set(productName, {
        label: productName,
        qty: (productMap.get(productName)?.qty || 0) + qty,
        total: (productMap.get(productName)?.total || 0) + total
      });
    });
  });

  const byPaymentMethod = Array.from(paymentMap.values())
    .map((entry) => ({
      paymentMethod: entry.label,
      _sum: { finalTotal: entry.total },
      _count: { _all: entry.count }
    }))
    .sort((a, b) => toNumber(b?._sum?.finalTotal) - toNumber(a?._sum?.finalTotal));

  const topProducts = Array.from(productMap.values())
    .map((entry) => ({
      productName: entry.label,
      _sum: { qty: entry.qty, total: entry.total }
    }))
    .sort((a, b) => toNumber(b?._sum?.total) - toNumber(a?._sum?.total))
    .slice(0, 10);

  return {
    aggregate,
    byPaymentMethod,
    topProducts,
    range
  };
};

const buildLocalPurchasesSummary = async (range) => {
  const purchaseRows = await purchasesApi.list().catch(() => []);
  const purchases = listInRange(purchaseRows, range, (entry) => entry?.purchaseDate || entry?.date || entry?.createdAt);
  const aggregate = {
    _sum: {
      total: purchases.reduce((sum, entry) => sum + toNumber(entry?.total), 0),
      amountPaid: purchases.reduce((sum, entry) => sum + toNumber(entry?.amountPaid ?? entry?.total), 0),
      balanceDue: purchases.reduce((sum, entry) => sum + toNumber(entry?.balanceDue), 0),
      discount: purchases.reduce((sum, entry) => sum + toNumber(entry?.discount), 0)
    },
    _count: {
      _all: purchases.length
    }
  };

  const statusMap = new Map();
  const supplierMap = new Map();

  purchases.forEach((entry) => {
    const status = String(entry?.status || 'Received').trim() || 'Received';
    const supplierName = String(entry?.supplierName || entry?.supplier || 'Unknown').trim() || 'Unknown';
    const total = toNumber(entry?.total);
    const previousStatus = statusMap.get(status) || { label: status, count: 0, runningTotal: 0 };
    const previousSupplier = supplierMap.get(supplierName) || { label: supplierName, count: 0, runningTotal: 0 };

    statusMap.set(status, {
      label: status,
      count: previousStatus.count + 1,
      runningTotal: previousStatus.runningTotal + total
    });

    supplierMap.set(supplierName, {
      label: supplierName,
      count: previousSupplier.count + 1,
      runningTotal: previousSupplier.runningTotal + total
    });
  });

  const byStatus = Array.from(statusMap.values())
    .map((entry) => ({
      status: entry.label,
      _sum: { total: entry.runningTotal },
      _count: { _all: entry.count }
    }))
    .sort((a, b) => toNumber(b?._sum?.total) - toNumber(a?._sum?.total));

  const bySupplier = Array.from(supplierMap.values())
    .map((entry) => ({
      supplierName: entry.label,
      _sum: { total: entry.runningTotal },
      _count: { _all: entry.count }
    }))
    .sort((a, b) => toNumber(b?._sum?.total) - toNumber(a?._sum?.total));

  return {
    aggregate,
    byStatus,
    bySupplier,
    range
  };
};

const normalizePaymentMethod = (value) => {
  const raw = String(value || '').trim();
  return raw || 'Other';
};

const toIsoDate = (value, endOfDay = false) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  const next = new Date(value);
  if (endOfDay) next.setHours(23, 59, 59, 999);
  else next.setHours(0, 0, 0, 0);
  return next.toISOString();
};

const buildQuery = (range = {}) => {
  const params = new URLSearchParams();
  const from = toIsoDate(range?.from, false);
  const to = toIsoDate(range?.to, true);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const reportingApi = {
  async dashboardSummary(range) {
    try {
      return await authenticatedApiRequest(`/dashboard/summary${buildQuery(range)}`);
    } catch {
      const summary = await buildLocalDashboardSummary(range);
      summary.totals.profit = summary.totals.sales - summary.totals.expenses - summary.totals.losses;
      return summary;
    }
  },

  async profitLossSummary(range) {
    return authenticatedApiRequest(`/reports/profit-loss${buildQuery(range)}`);
  },

  async profitLossReport(range) {
    return authenticatedApiRequest(`/reports/profit-loss${buildQuery(range)}`);
  },

  async salesSummary(range) {
    try {
      return await authenticatedApiRequest(`/reports/sales${buildQuery(range)}`);
    } catch {
      return buildLocalSalesSummary(range);
    }
  },

  async purchasesSummary(range) {
    try {
      return await authenticatedApiRequest(`/reports/purchases${buildQuery(range)}`);
    } catch {
      return buildLocalPurchasesSummary(range);
    }
  }
};
