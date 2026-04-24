import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { TrendingUp, Wallet, BarChart3, Package, RefreshCw, Calendar, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDisplayDate } from '../utils/date';
import SalesOrderPrint from '../shared/SalesOrderPrint';
import { damageStocksApi } from '../services/damageStocksApi';
import { expensesApi } from '../services/expensesApi';
import { productsApi } from '../services/productsApi';
import { reportingApi } from '../services/reportingApi';
import { salesApi } from '../services/salesApi';
import { businessApi } from '../services/businessApi';
import { customersApi } from '../services/customersApi';
import { purchasesApi, suppliersApi } from '../services/purchasingApi';

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const localStore = {
  get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(String(key || ''));
      if (raw == null) return fallback;
      return safeJsonParse(raw, fallback);
    } catch {
      return fallback;
    }
  },
  set(key, value, options) {
    const k = String(key || '');
    if (!k) return false;
    let ok = false;
    try {
      window.localStorage.setItem(k, JSON.stringify(value));
      ok = true;
      return true;
    } catch {
      return false;
    } finally {
      if (ok && !options?.silent) {
        try {
          window.dispatchEvent(new CustomEvent('dataUpdated'));
        } catch {}
      }
    }
  },
  list() {
    void safeJsonParse;
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
      return keys.sort().map((key) => ({ key, value: localStore.get(key, null) }));
    } catch {
      return [];
    }
  }
};

const subscriptionsApi = {
  async current() {
    return null;
  }
};

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [overviewRange, setOverviewRange] = useState('months12');
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState({
    companyInfo: {},
    sales: [],
    salesOrders: [],
    expenses: [],
    customers: [],
    purchases: [],
    suppliers: [],
    inventoryItems: [],
    creditSales: [],
    damagedStocks: [],
    stockInRecords: [],
    stockOutRecords: []
  });
  const [subscriptionSummary, setSubscriptionSummary] = useState({ status: '', planName: '', endsAt: '', trialEndsAt: '', daysRemaining: null, durationDays: null });
  const [dashboardSummary, setDashboardSummary] = useState(null);

  const companyInfo = snapshot.companyInfo || {};

  useEffect(() => {
    const bump = () => setRefreshNonce((v) => v + 1);
    window.addEventListener('dataUpdated', bump);
    return () => {
      window.removeEventListener('dataUpdated', bump);
    };
  }, []);

  useEffect(() => {
    const done = () => setInvoiceToPrint(null);
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  useEffect(() => {
    setSelectedDay(null);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const id = window.setInterval(() => setRefreshNonce((v) => v + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  const refreshSubscriptionNow = useCallback(async () => {
    try {
      const calcDaysBetween = (endIso) => {
        const end = Date.parse(String(endIso || ''));
        if (!Number.isFinite(end) || !end) return null;
        const now = Date.now();
        const ms = end - now;
        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        return days < 0 ? 0 : days;
      };
      const calcDaysFromStart = (startIso, durationDays) => {
        const start = Date.parse(String(startIso || ''));
        if (!Number.isFinite(start) || !start) return null;
        const end = start + Number(durationDays || 0) * 24 * 60 * 60 * 1000;
        return calcDaysBetween(new Date(end).toISOString());
      };
      const localUser = localStore.get('currentUser', {}) || {};
      const company = localStore.get('companyInfo', {}) || {};
      const sub = (await subscriptionsApi.current()) || {};
      const status = String(
        sub?.status ||
          localUser?.subscriptionPaymentStatus ||
          company?.subscriptionPaymentStatus ||
          ''
      ).toLowerCase();
      const startedAt = String(sub?.startedAt || localUser?.subscriptionStartedAt || company?.subscriptionStartedAt || '');
      const trialEndsAt = String(sub?.trialEndsAt || localUser?.subscriptionTrialEndsAt || company?.subscriptionTrialEndsAt || '');
      const endsAt = String(sub?.endsAt || localUser?.subscriptionEndsAt || company?.subscriptionEndsAt || '');
      const durationDaysRaw = Number(
        sub?.durationDays ||
          localUser?.durationDays ||
          company?.durationDays ||
          localUser?.subscriptionDurationDays ||
          company?.subscriptionDurationDays ||
          0
      ) || 0;
      const planName = String(sub?.plan?.name || localUser?.subscriptionPlan || company?.subscriptionPlan || '').trim();
      const durationDays = status === 'trial' ? 7 : durationDaysRaw || 30;
      const daysRemaining = (() => {
        if (status === 'trial') {
          if (trialEndsAt) return calcDaysBetween(trialEndsAt);
          return calcDaysFromStart(startedAt, 7);
        }
        if (endsAt) return calcDaysBetween(endsAt);
        return calcDaysFromStart(startedAt, durationDays);
      })();
      setSubscriptionSummary({ status, planName, endsAt, trialEndsAt, daysRemaining, durationDays });
    } catch {}
  }, []);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (!alive) return;
      await refreshSubscriptionNow();
    };
    refresh();
    const id = window.setInterval(refresh, 60000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshSubscriptionNow]);

  const formatTZS = (value) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value || 0);
    } catch {
      return `TZS ${Number(value || 0).toLocaleString()}`;
    }
  };

  const waitForInvoicePrintReady = () =>
    new Promise((resolve) => {
      const kick = () => {
        try {
          const root = document.querySelector('.dashboard-invoice-preview');
          if (!root) {
            resolve();
            return;
          }
          const imgs = Array.from(root.querySelectorAll('img'));
          if (!imgs.length) {
            resolve();
            return;
          }
          let pending = 0;
          const finish = () => {
            pending -= 1;
            if (pending <= 0) resolve();
          };
          imgs.forEach((img) => {
            if (img.complete && img.naturalWidth > 0) return;
            pending += 1;
            const done = () => finish();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          });
          if (pending === 0) resolve();
          setTimeout(resolve, 1200);
        } catch {
          resolve();
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(kick));
    });

  const loadSnapshot = useCallback(async () => {
    const [companyInfoLocal, customers, suppliers, damagedStocks] = await Promise.all([
      businessApi.get().catch(() => localStore.get('companyInfo', {})),
      customersApi.list().catch(() => []),
      suppliersApi.list().catch(() => []),
      damageStocksApi.list().catch(() => [])
    ]);

    const [business, rawSales, invoicedSales, expenses, purchases, inventoryItems] = await Promise.all([
      localStore.get('currentUser', null),
      salesApi.list().catch(() => []),
      localStore.get('invoicedSales', []),
      expensesApi.list().catch(() => []),
      purchasesApi.list().catch(() => []),
      productsApi.list().catch(() => [])
    ]);

    const combinedSalesRaw = [...(Array.isArray(rawSales) ? rawSales : []), ...(Array.isArray(invoicedSales) ? invoicedSales : [])];
    const mappedSales = combinedSalesRaw.map((s) => {
      const items = Array.isArray(s?.items) ? s.items : [];
      const qty = items.reduce((sum, it) => sum + Number(it?.quantity ?? it?.qty ?? 0), 0);
      const first = items[0] || null;
      const amount = Number(s?.total ?? s?.finalTotal ?? 0) || 0;
      return {
        id: s?.id,
        date: s?.date || s?.createdAt || null,
        productName: first?.productName || first?.item || first?.name || 'Sale',
        productType: first?.productType || 'general',
        quantity: qty,
        amount,
        finalTotal: amount,
        customerName: s?.customerName || s?.customer || s?.name || 'Customer',
        status: s?.status || 'paid',
        paymentMethod: s?.paymentMethod || '',
        invoiceNumber: s?.saleNumber || s?.invoiceNumber || s?.invoiceNo || ''
      };
    });
    const creditSales = mappedSales.filter((sale) => String(sale?.paymentMethod || '').toLowerCase() === 'credit');

    setSnapshot({
      companyInfo:
        business && typeof business === 'object'
          ? { ...(companyInfoLocal && typeof companyInfoLocal === 'object' ? companyInfoLocal : {}), companyName: business.businessName, phone: business.phone, email: business.email, location: business.address }
          : companyInfoLocal && typeof companyInfoLocal === 'object'
            ? companyInfoLocal
            : {},
      sales: mappedSales,
      salesOrders: [],
      expenses: Array.isArray(expenses) ? expenses : [],
      customers: Array.isArray(customers) ? customers : [],
      purchases: Array.isArray(purchases) ? purchases : [],
      suppliers: Array.isArray(suppliers) ? suppliers : [],
      inventoryItems: Array.isArray(inventoryItems) ? inventoryItems : [],
      creditSales,
      damagedStocks: Array.isArray(damagedStocks) ? damagedStocks : [],
      stockInRecords: [],
      stockOutRecords: []
    });
  }, []);

  useEffect(() => {
    Promise.resolve()
      .then(async () => {
        try {
          await loadSnapshot();
        } catch {}
      })
      .catch(() => {});
  }, [loadSnapshot, refreshNonce]);

  const selectedRange = useMemo(() => {
    if (selectedDay) {
      const day = new Date(selectedYear, selectedMonth, selectedDay);
      return { from: day, to: day };
    }
    return {
      from: new Date(selectedYear, selectedMonth, 1),
      to: new Date(selectedYear, selectedMonth + 1, 0)
    };
  }, [selectedDay, selectedMonth, selectedYear]);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const summary = await reportingApi.dashboardSummary(selectedRange);
        if (!alive) return;
        setDashboardSummary(summary || null);
      })
      .catch(() => {
        if (!alive) return;
        setDashboardSummary(null);
      });
    return () => {
      alive = false;
    };
  }, [refreshNonce, selectedRange]);

  const data = useMemo(() => {
    void refreshNonce;
    const readArray = (key) => {
      if (key === 'sales') return Array.isArray(snapshot.sales) ? snapshot.sales : [];
      if (key === 'salesOrders') return Array.isArray(snapshot.salesOrders) ? snapshot.salesOrders : [];
      if (key === 'expenses') return Array.isArray(snapshot.expenses) ? snapshot.expenses : [];
      if (key === 'customers') return Array.isArray(snapshot.customers) ? snapshot.customers : [];
      if (key === 'purchases') return Array.isArray(snapshot.purchases) ? snapshot.purchases : [];
      if (key === 'suppliers') return Array.isArray(snapshot.suppliers) ? snapshot.suppliers : [];
      if (key === 'inventoryItems') return Array.isArray(snapshot.inventoryItems) ? snapshot.inventoryItems : [];
      if (key === 'creditSales') return Array.isArray(snapshot.creditSales) ? snapshot.creditSales : [];
      if (key === 'damagedStocks') return Array.isArray(snapshot.damagedStocks) ? snapshot.damagedStocks : [];
      return [];
    };
    const pad2 = (n) => String(n).padStart(2, '0');
    const keyFromDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const toDateKey = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
      try {
        const d = new Date(normalized);
        if (Number.isNaN(d.getTime())) return '';
        return keyFromDate(d);
      } catch {
        return '';
      }
    };
    const selectedDateKey = selectedDay ? keyFromDate(new Date(selectedYear, selectedMonth, selectedDay)) : '';
    const isInSelectedMonth = (key) => {
      const parts = String(key || '').split('-');
      if (parts.length < 2) return false;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return Number.isFinite(y) && Number.isFinite(m) && y === selectedYear && m === selectedMonth + 1;
    };
    const filterByPeriod = (records) => {
      return (records || []).filter((r) => {
        const key = toDateKey(r?.date);
        if (!key) return false;
        if (selectedDateKey) return key === selectedDateKey;
        return isInSelectedMonth(key);
      });
    };
    const toNumber = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    };
    const salesAllRaw = readArray('sales');
    const ordersAllRaw = readArray('salesOrders');
    const salesOrdersAll = ordersAllRaw.map((o) => {
      const isUsd = String(o?.currency || '').toUpperCase() === 'USD' || Boolean(o?.usdEnabled);
      const usdRate = toNumber(o?.usdRate);
      const total = toNumber(o?.total);
      const totalTzs = isUsd
        ? (Number.isFinite(Number(o?.totalTzs)) ? Number(o?.totalTzs) : (usdRate > 0 ? total * usdRate : 0))
        : total;
      const qty = (o?.items || []).reduce((s, it) => s + toNumber(it?.qty), 0);
      const firstItem = (o?.items || [])[0];
      const invoiceNo = (o?.invoiceNumber || '').toString().trim().length
        ? String(o.invoiceNumber)
        : `SO-${String(o?.orderNumber || o?.id || '').trim() || '—'}`;
      return {
        id: o?.id || o?.orderNumber || String(o?.orderDate || ''),
        date: o?.orderDateTime || o?.orderDate || o?.date || null,
        productName: firstItem?.item || 'Sales Order',
        productType: firstItem?.unit || 'Sales Order',
        quantity: qty,
        amount: totalTzs,
        finalTotal: totalTzs,
        customerName: o?.name || o?.customerName || 'Customer',
        status: o?.status || 'Open',
        currency: isUsd ? 'USD' : 'TZS',
        usdTotal: isUsd ? total : null,
        usdRate: isUsd ? usdRate : null,
        invoiceNumber: invoiceNo
      };
    });
    const salesAll = [...salesAllRaw, ...salesOrdersAll];
    const sales = filterByPeriod(salesAll);
    const getCategoryKey = (s) => {
      const raw = s?.productName || s?.productType || 'Unknown';
      return String(raw || 'Unknown').trim() || 'Unknown';
    };
    const primaryCategory = 'All Products';
    const categorySales = sales;

    const revenue = categorySales.reduce((sum, s) => sum + toNumber(s.amount || s.finalTotal), 0);
    const totalSales = categorySales.length;
    const avgSale = totalSales > 0 ? revenue / totalSales : 0;
    const expensesAll = readArray('expenses');
    const expensesMonth = filterByPeriod(expensesAll).reduce((sum, e) => sum + toNumber(e.amount), 0);
    const damageLosses = filterByPeriod(readArray('damagedStocks')).reduce(
      (sum, record) => sum + toNumber(record?.lossTotal ?? record?.estimatedValue ?? record?.amount),
      0
    );
    const totalOutflows = expensesMonth + damageLosses;
    const netProfit = revenue - totalOutflows;
    const unitsSoldTotal = categorySales.reduce((sum, s) => sum + toNumber(s.quantity), 0);

    const customerCount = (readArray('customers') || []).length;

    let inventoryValue = 0;
    try {
      const inv = readArray('inventoryItems');
      (Array.isArray(inv) ? inv : []).forEach((it) => {
        const qty = toNumber(it?.stockQuantity ?? it?.qty ?? it?.quantity ?? 0);
        const unitCost = Number(it?.buyingPrice ?? it?.buyPrice ?? it?.costPrice ?? 0) || 0;
        if (!Number.isFinite(qty) || qty <= 0) return;
        if (!(unitCost > 0)) return;
        inventoryValue += qty * unitCost;
      });
    } catch {}

    const byCategoryMap = {};
    categorySales.forEach((s) => {
      const name = s.productName || s.productType || 'Unknown';
      byCategoryMap[name] = (byCategoryMap[name] || 0) + toNumber(s.amount || s.finalTotal);
    });
    const revenueByCategory = Object.entries(byCategoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    const maxCategory = Math.max(...revenueByCategory.map((c) => c.value), 1);

    const revenueAll = revenue;
    const topCategoryValue = revenueByCategory.length ? revenueByCategory[0].value : 0;
    const donutShare = revenueAll > 0 ? Math.max(0, Math.min(1, topCategoryValue / revenueAll)) : 0;
    const donutPercent = Math.round(donutShare * 100);
    const donutAngle = Math.round(donutShare * 360);

    const groupedUnits = {};
    categorySales.forEach((s) => {
      const name = s.productName || s.productType || 'Unknown';
      const units = toNumber(s.quantity);
      groupedUnits[name] = (groupedUnits[name] || 0) + units;
    });
    const performers = Object.entries(groupedUnits)
      .map(([label, units]) => ({ label, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 2)
      .map((p, i) => ({ label: p.label, rank: i + 1, units: Math.round(p.units), growth: 0 }));

    const transactions = categorySales
      .slice(-20)
      .reverse()
      .map((s) => ({
        id: s.id || s.transactionId || s.invoiceId || s.ref || String(s.date || ''),
        invoiceNo: (s.invoiceNumber || s.invoiceNo || s.invoiceId || s.transactionId || s.ref || '').toString().trim()
          || `SALE-${String(s.id || '').trim() || String(s.date || '').slice(0, 10) || '—'}`,
        customer: s.customerName || s.buyer || s.storeName || 'Customer',
        items: s.productName || s.productType || 'Item',
        qty: toNumber(s.quantity),
        amount: toNumber(s.amount || s.finalTotal),
        status: s.status || s.paymentStatus || 'COMPLETED',
        date: s.date || null,
        type: (s.currency === 'USD' || s.usdTotal != null) ? 'Sales Order' : 'Sale',
        currency: s.currency || 'TZS',
        usdTotal: s.usdTotal,
        usdRate: s.usdRate
      }));

    const invoicedSales = readArray('invoicedSales');
    const invoicesFromOrders = ordersAllRaw.map((o) => {
      const isUsd = String(o?.currency || '').toUpperCase() === 'USD' || Boolean(o?.usdEnabled);
      const usdRate = toNumber(o?.usdRate);
      const total = toNumber(o?.total);
      const amount = isUsd
        ? (Number.isFinite(Number(o?.totalTzs)) ? Number(o?.totalTzs) : (usdRate > 0 ? total * usdRate : 0))
        : total;
      const invoiceNo = (o?.invoiceNumber || '').toString().trim().length
        ? String(o.invoiceNumber)
        : `SO-${String(o?.orderNumber || o?.id || '').trim() || '—'}`;
      const items = (o?.items || []).map((it) => ({
        item: it?.item,
        unit: it?.unit,
        description: it?.description,
        qty: toNumber(it?.qty),
        rate: toNumber(it?.rate),
        amount: toNumber(it?.qty) * toNumber(it?.rate)
      }));
      return {
        id: invoiceNo,
        customer: o.name || 'Customer',
        amount,
        date: o.orderDate || o.date || null,
        category: (o?.items || [])[0]?.item || 'Sales Order',
        currency: isUsd ? 'USD' : 'TZS',
        usdTotal: isUsd ? total : null,
        usdRate: isUsd ? usdRate : null,
        items
      };
    });
    const invoicesFromSales = salesAllRaw.map((s) => {
      const invoiceNo = (s?.invoiceNumber || s?.invoiceId || s?.transactionId || s?.ref || '').toString().trim();
      const fallback = `SALE-${String(s?.id || '').trim() || String(s?.date || '').slice(0, 10) || '—'}`;
      const qty = toNumber(s?.quantity);
      const amount = toNumber(s?.finalTotal || s?.amount || 0);
      const rate = qty > 0 ? (amount / qty) : 0;
      return {
        id: invoiceNo || fallback,
        customer: s.customerName || s.buyer || s.storeName || 'Customer',
        amount,
        date: s.date || null,
        category: getCategoryKey(s),
        currency: String(s?.currency || '').toUpperCase() === 'USD' ? 'USD' : 'TZS',
        usdTotal: s?.usdTotal != null ? toNumber(s?.usdTotal) : null,
        usdRate: s?.usdRate != null ? toNumber(s?.usdRate) : null,
        items: [{
          item: s?.productName || s?.productType || 'Sale',
          unit: s?.unit || s?.productType || '',
          qty,
          rate,
          amount
        }]
      };
    });
    const allInvoicesRaw = [...invoicedSales, ...invoicesFromOrders, ...invoicesFromSales].map((inv) => ({
      id: (inv.invoiceNumber || inv.id || inv.transactionId || inv.ref || '').toString().trim() || String(inv.date || ''),
      customer: inv.customerName || inv.buyer || inv.storeName || inv.customer || 'Customer',
      amount: toNumber(inv.finalTotal || inv.amount || 0),
      date: inv.date || null,
      category: getCategoryKey(inv),
      currency: String(inv?.currency || '').toUpperCase() === 'USD' ? 'USD' : 'TZS',
      usdTotal: inv?.usdTotal != null ? toNumber(inv.usdTotal) : null,
      usdRate: inv?.usdRate != null ? toNumber(inv.usdRate) : null,
      items: Array.isArray(inv?.items) ? inv.items : []
    }));
    const allInvoices = Array.from(
      allInvoicesRaw.reduce((m, inv) => {
        const prev = m.get(inv.id);
        if (!prev) m.set(inv.id, inv);
        else {
          const pd = prev.date ? new Date(prev.date).getTime() : 0;
          const nd = inv.date ? new Date(inv.date).getTime() : 0;
          if (nd >= pd) m.set(inv.id, inv);
        }
        return m;
      }, new Map()).values()
    );
    const topInvoices = allInvoices.sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return bd - ad;
    });

    return {
      revenue,
      totalSales,
      avgSale,
      expensesMonth,
      damageLosses,
      totalOutflows,
      netProfit,
      unitsSoldTotal,
      customerCount,
      inventoryValue,
      revenueByCategory,
      maxCategory,
      donutPercent,
      donutAngle,
      performers,
      transactions,
      topInvoices,
      primaryCategory
    };
  }, [refreshNonce, selectedDay, selectedMonth, selectedYear, snapshot]);

  const calendarMeta = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstWeekday = new Date(selectedYear, selectedMonth, 1).getDay();
    return { daysInMonth, firstWeekday };
  }, [selectedMonth, selectedYear]);

  const activeDays = useMemo(() => {
    void refreshNonce;
    const set = new Set();
    const readArray = (key) => {
      if (key === 'sales') return Array.isArray(snapshot.sales) ? snapshot.sales : [];
      if (key === 'salesOrders') return Array.isArray(snapshot.salesOrders) ? snapshot.salesOrders : [];
      if (key === 'expenses') return Array.isArray(snapshot.expenses) ? snapshot.expenses : [];
      return [];
    };
    const addIfMatch = (dateValue) => {
      const raw = String(dateValue || '').trim();
      if (!raw) return;
      const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : String(raw).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
      const d = new Date(dateKey);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== selectedYear) return;
      if (d.getMonth() !== selectedMonth) return;
      set.add(d.getDate());
    };
    readArray('sales').forEach((s) => addIfMatch(s?.date));
    readArray('salesOrders').forEach((o) => addIfMatch(o?.orderDate || o?.date));
    readArray('expenses').forEach((e) => addIfMatch(e?.date));
    return set;
  }, [refreshNonce, selectedMonth, selectedYear, snapshot]);

  const overview = useMemo(() => {
    void refreshNonce;
    const toNumber = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    };
    const readArray = (key) => {
      if (key === 'sales') return Array.isArray(snapshot.sales) ? snapshot.sales : [];
      if (key === 'salesOrders') return Array.isArray(snapshot.salesOrders) ? snapshot.salesOrders : [];
      return [];
    };
    const salesAllRaw = readArray('sales');
    const ordersAllRaw = readArray('salesOrders');
    const salesOrdersAll = ordersAllRaw.map((o) => {
      const isUsd = String(o?.currency || '').toUpperCase() === 'USD' || Boolean(o?.usdEnabled);
      const usdRate = toNumber(o?.usdRate);
      const total = toNumber(o?.total);
      const totalTzs = isUsd
        ? (Number.isFinite(Number(o?.totalTzs)) ? Number(o?.totalTzs) : (usdRate > 0 ? total * usdRate : 0))
        : total;
      return { date: o?.orderDateTime || o?.orderDate || o?.date || null, amount: totalTzs, finalTotal: totalTzs };
    });
    const salesAll = [...salesAllRaw, ...salesOrdersAll];

    const pad2 = (n) => String(n).padStart(2, '0');
    const keyFromDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    const toDateKey = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
      try {
        const d = new Date(normalized);
        if (Number.isNaN(d.getTime())) return '';
        return keyFromDate(d);
      } catch {
        return '';
      }
    };

    const parseTime = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return 0;
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const tt = Date.parse(`${raw}T00:00:00`);
        return Number.isFinite(tt) ? tt : 0;
      }
      const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
      const t = Date.parse(normalized);
      if (Number.isFinite(t)) return t;
      return 0;
    };

    const now = selectedDay
      ? new Date(selectedYear, selectedMonth, selectedDay, 23, 59, 59, 999)
      : new Date();

    if (overviewRange === 'days30' || overviewRange === 'days7') {
      const days = overviewRange === 'days7' ? 7 : 30;
      const dates = Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (days - 1 - i));
        return d;
      });
      const keys = dates.map((d) => keyFromDate(d));
      const idxByKey = new Map(keys.map((k, i) => [k, i]));
      const amountValues = new Array(days).fill(0);
      const countValues = new Array(days).fill(0);
      salesAll.forEach((s) => {
        const dateKey = toDateKey(s?.date);
        const idx = idxByKey.get(dateKey);
        if (idx === undefined) return;
        amountValues[idx] += toNumber(s.amount || s.finalTotal);
        countValues[idx] += 1;
      });
      const series = keys.map((k, i) => ({ label: k.slice(8, 10), amount: amountValues[i], count: countValues[i] }));
      const totalAmount = amountValues.reduce((a, b) => a + b, 0);
      const totalCount = countValues.reduce((a, b) => a + b, 0);
      const maxCount = Math.max(...countValues, 1);
      return { title: overviewRange === 'days7' ? 'Days 7' : 'Days 30', series, totalAmount, totalCount, maxCount };
    }

    const amountValues = new Array(12).fill(0);
    const countValues = new Array(12).fill(0);
    salesAll.forEach((s) => {
      const t = parseTime(s?.date);
      if (!t) return;
      const d = new Date(t);
      if (d.getFullYear() !== selectedYear) return;
      amountValues[d.getMonth()] += toNumber(s.amount || s.finalTotal);
      countValues[d.getMonth()] += 1;
    });
    const labels = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString(undefined, { month: 'short' }));
    const series = labels.map((label, i) => ({ label, amount: amountValues[i], count: countValues[i] }));
    const totalAmount = amountValues.reduce((a, b) => a + b, 0);
    const totalCount = countValues.reduce((a, b) => a + b, 0);
    const maxCount = Math.max(...countValues, 1);
    return { title: 'Months 12', series, totalAmount, totalCount, maxCount };
  }, [overviewRange, refreshNonce, selectedDay, selectedMonth, selectedYear, snapshot]);

  const profit = useMemo(() => {
    void refreshNonce;
    const toNumber = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    };
    const readArray = (key) => {
      if (key === 'sales') return Array.isArray(snapshot.sales) ? snapshot.sales : [];
      if (key === 'salesOrders') return Array.isArray(snapshot.salesOrders) ? snapshot.salesOrders : [];
      if (key === 'expenses') return Array.isArray(snapshot.expenses) ? snapshot.expenses : [];
      return [];
    };
    const salesAllRaw = readArray('sales');
    const ordersAllRaw = readArray('salesOrders');
    const salesOrdersAll = ordersAllRaw.map((o) => {
      const isUsd = String(o?.currency || '').toUpperCase() === 'USD' || Boolean(o?.usdEnabled);
      const usdRate = toNumber(o?.usdRate);
      const total = toNumber(o?.total);
      const totalTzs = isUsd
        ? (Number.isFinite(Number(o?.totalTzs)) ? Number(o?.totalTzs) : (usdRate > 0 ? total * usdRate : 0))
        : total;
      return { date: o?.orderDateTime || o?.orderDate || o?.date || null, amount: totalTzs, finalTotal: totalTzs };
    });
    const salesAll = [...salesAllRaw, ...salesOrdersAll];
    const expensesAll = readArray('expenses');
    const lossesAll = readArray('damagedStocks');

    const toMonthKey = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return null;
      try {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return null;
        return { y: d.getFullYear(), m: d.getMonth() };
      } catch {
        return null;
      }
    };

    const monthSales = new Array(12).fill(0);
    const monthExpenses = new Array(12).fill(0);
    const monthLosses = new Array(12).fill(0);

    salesAll.forEach((s) => {
      const t = toMonthKey(s?.date);
      if (!t) return;
      if (t.y !== selectedYear) return;
      monthSales[t.m] += toNumber(s.amount || s.finalTotal);
    });
    expensesAll.forEach((e) => {
      const t = toMonthKey(e?.date);
      if (!t) return;
      if (t.y !== selectedYear) return;
      monthExpenses[t.m] += toNumber(e.amount);
    });
    lossesAll.forEach((loss) => {
      const t = toMonthKey(loss?.rmaDate || loss?.date || loss?.createdAt);
      if (!t) return;
      if (t.y !== selectedYear) return;
      monthLosses[t.m] += toNumber(loss?.lossTotal ?? loss?.estimatedValue ?? loss?.amount);
    });

    const series = Array.from({ length: 12 }, (_, i) => {
      const value = monthSales[i] - monthExpenses[i] - monthLosses[i];
      const label = new Date(2000, i, 1).toLocaleString(undefined, { month: 'short' });
      return { key: `${selectedYear}-${String(i + 1).padStart(2, '0')}`, label, value };
    });
    const maxAbs = Math.max(...series.map((x) => Math.abs(x.value)), 1);
    return { series, maxAbs };
  }, [refreshNonce, selectedYear, snapshot]);

  const refreshData = () => {
    setRefreshNonce((v) => v + 1);
    setIsRefreshing(true);
    (async () => {
      try {
        await Promise.allSettled([Promise.resolve(refreshSubscriptionNow()), Promise.resolve(loadSnapshot())]);
      } finally {
        setIsRefreshing(false);
      }
    })();
  };

  const [insightsUpdatedAt, setInsightsUpdatedAt] = useState(() => new Date());
  const [insightsOpen, setInsightsOpen] = useState(false);

  const recommendations = useMemo(() => {
    void refreshNonce;
    const items = [];
    if (data.revenue <= 0) {
      items.push({
        tag: 'Sales',
        severity: 'High',
        title: 'Start recording sales',
        message: 'No sales found for this period. Add sales transactions to unlock performance insights.'
      });
    } else if (data.totalOutflows > data.revenue * 0.6) {
      items.push({
        tag: 'Sales',
        severity: 'Medium',
        title: 'Review expenses vs revenue',
        message: 'Expenses and damaged stock losses are high compared to revenue for this period. Consider reducing operational costs or increasing sales volume.'
      });
    } else {
      items.push({
        tag: 'Sales',
        severity: 'Low',
        title: 'Keep daily monitoring',
        message: 'Revenue and expenses look healthy. Continue tracking daily sales to maintain momentum.'
      });
    }

    if (data.customerCount === 0) {
      items.push({
        tag: 'Customers',
        severity: 'Medium',
        title: 'Add customers',
        message: 'Customer list is empty. Adding customers helps with reporting and repeat sales tracking.'
      });
    }

    if (data.inventoryValue <= 0) {
      items.push({
        tag: 'Stock',
        severity: 'High',
        title: 'Update inventory',
        message: 'Inventory value is not available. Sync products or record purchases so current stock can be valued.'
      });
    }

    return items.slice(0, 4);
  }, [data.customerCount, data.inventoryValue, data.revenue, data.totalOutflows, refreshNonce]);

  const salesCircleSize = useMemo(() => {
    const v = Math.max(0, Number(data.revenue) || 0);
    if (!v) return 192;
    const scaled = Math.log10(v + 1);
    const t = Math.max(0, Math.min(1, scaled / 7));
    return Math.round(192 + t * 96);
  }, [data.revenue]);
  const salesCircleInset = useMemo(() => Math.round(salesCircleSize * 0.16), [salesCircleSize]);
  const salesCircleFill = useMemo(() => {
    const rev = Math.max(0, Number(data.revenue) || 0);
    const exp = Math.max(0, Number(data.totalOutflows) || 0);
    const denom = rev + exp;
    return denom > 0 ? Math.max(0, Math.min(1, rev / denom)) : 0;
  }, [data.revenue, data.totalOutflows]);

  const headlineSummary = useMemo(() => {
    const totals = dashboardSummary?.totals || {};
    const counts = dashboardSummary?.counts || {};
    const revenue = Math.max(Number(totals.sales || 0), Number(data.revenue || 0));
    const expenses = Math.max(Number(totals.expenses || 0), Number(data.expensesMonth || 0));
    const losses = Math.max(Number(totals.losses || 0), Number(data.damageLosses || 0));
    const totalOutflows = expenses + losses;
    const profitValue = revenue - totalOutflows;
    return {
      revenue,
      expenses,
      losses,
      totalOutflows,
      profit: profitValue,
      damagedStocks: Math.max(Number(counts.damagedStocks || 0), Number(data.damagedStocksCount || 0))
    };
  }, [dashboardSummary, data.damageLosses, data.damagedStocksCount, data.expensesMonth, data.revenue]);

  return (
    <div className="bg-white min-h-screen">
      <style>{`
        @page { margin: 0; size: A4; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          .dashboard-invoice-preview, .dashboard-invoice-preview * { visibility: visible !important; }
          .dashboard-invoice-preview {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
        }
        @keyframes dashTabTap {
          0% { transform: scale(1); }
          45% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        .dash-tab-tap { animation: dashTabTap 170ms ease-out both; }
      `}</style>
      <div className="dashboard-invoice-preview" style={{ display: 'none' }}>
        {invoiceToPrint ? (
          <SalesOrderPrint
            companyDetails={companyInfo}
            salesOrderNumber=""
            invoiceNumber={invoiceToPrint.id}
            date={invoiceToPrint.date}
            dueDate=""
            billToName={invoiceToPrint.customer}
            billToAddress=""
            shipToName=""
            shipToAddress=""
            items={invoiceToPrint.items}
            notes=""
            subtotal={invoiceToPrint.currency === 'USD' && invoiceToPrint.usdTotal != null ? invoiceToPrint.usdTotal : invoiceToPrint.amount}
            taxRate={0}
            taxTotal={0}
            total={invoiceToPrint.currency === 'USD' && invoiceToPrint.usdTotal != null ? invoiceToPrint.usdTotal : invoiceToPrint.amount}
            currencyLabel={invoiceToPrint.currency === 'USD' ? 'USD' : 'TZS'}
            exchangeRate={invoiceToPrint.currency === 'USD' ? invoiceToPrint.usdRate : null}
            convertedCurrencyLabel="TZS"
          />
        ) : null}
      </div>
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Overview</h1>
            <p className="text-sm text-gray-600">POS performance for {data.primaryCategory}.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 flex items-center gap-2 disabled:opacity-60"
              disabled={isRefreshing}
              onClick={() => {
                refreshData();
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
              {subscriptionSummary.daysRemaining != null && subscriptionSummary.status ? (
                <span className="text-xs text-gray-500">
                  • {subscriptionSummary.status === 'trial' ? 'Trial' : 'Plan'} {subscriptionSummary.daysRemaining}/
                  {subscriptionSummary.status === 'trial' ? 7 : (Number(subscriptionSummary.durationDays || 30) || 30)}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Revenue</span>
              <Wallet className="w-4 h-4 text-green-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatTZS(headlineSummary.revenue)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Sales</span>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{data.totalSales.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Sale</span>
              <BarChart3 className="w-4 h-4 text-green-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatTZS(data.avgSale)}</div>
            <div className="mt-1 text-xs text-gray-600">Average per transaction</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Expenses</span>
              <Package className="w-4 h-4 text-green-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatTZS(headlineSummary.totalOutflows)}</div>
            <div className="mt-1 text-xs text-gray-600">
              {headlineSummary.losses > 0
                ? `Includes ${formatTZS(headlineSummary.losses)} damaged stock losses`
                : 'This period'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-gray-900 font-semibold">Sales Overview</div>
                <div className="text-xs text-gray-600 flex items-center gap-1">
                  This Year ({selectedYear})
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="shrink-0 inline-flex items-center rounded-xl bg-gray-100 border border-gray-200 p-1">
                {[
                  { id: 'months12', label: 'Months 12' },
                  { id: 'days30', label: 'Days 30' },
                  { id: 'days7', label: 'Days 7' }
                ].map((opt) => {
                  const active = overviewRange === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOverviewRange(opt.id)}
                      className={active ? 'px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold' : 'px-3 py-2 rounded-lg text-gray-700 text-xs font-semibold hover:bg-white'}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 text-3xl font-extrabold text-gray-900">{formatTZS(overview.totalAmount)}</div>
            <div className="mt-1 text-xs text-gray-600">{overview.totalCount.toLocaleString()} sales</div>

            <div className="mt-5 h-56 flex items-end justify-between gap-2">
              {overview.series.map((p, i) => {
                const h = Math.max(2, Math.round((p.count / overview.maxCount) * 180));
                return (
                  <div key={`${p.label}-${i}`} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                    <div className="text-[10px] text-gray-600">{p.count ? p.count.toLocaleString() : ''}</div>
                    <div className="w-full flex items-end justify-center">
                      <div className="w-2.5 rounded-full bg-green-600" style={{ height: `${h}px` }} />
                    </div>
                    <div className="text-[10px] text-gray-500 truncate w-full text-center">{p.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-5 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[156px] flex flex-col justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Net Profit</div>
                  <div className="mt-1 text-xs text-gray-600">This period</div>
                </div>
                <div className={`text-2xl font-extrabold ${headlineSummary.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatTZS(headlineSummary.profit)}
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Sales</span>
                    <span className="font-semibold text-gray-900">{formatTZS(headlineSummary.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Expenses</span>
                    <span className="font-semibold text-gray-900">{formatTZS(headlineSummary.expenses)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Damaged Stock Losses</span>
                    <span className="font-semibold text-gray-900">{formatTZS(headlineSummary.losses)}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Net Profit</span>
                    <span className="font-extrabold text-gray-900">{formatTZS(headlineSummary.profit)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[156px]">
                <div className="text-sm font-semibold text-gray-900">Profit Trend</div>
                <div className="mt-3 h-32">
                  <svg viewBox="0 0 320 128" preserveAspectRatio="none" className="w-full h-full">
                    <rect x="0" y="0" width="320" height="128" fill="transparent" />
                    {(() => {
                      const width = 320;
                      const height = 128;
                      const padX = 12;
                      const padY = 10;
                      const innerW = width - padX * 2;
                      const innerH = height - padY * 2;

                      const values = profit.series.map((p) => Number(p.value) || 0);
                      const min = Math.min(...values, 0);
                      const max = Math.max(...values, 0);
                      const range = Math.max(1, max - min);

                      const points = profit.series.map((p, i) => {
                        const x = padX + (i / Math.max(1, profit.series.length - 1)) * innerW;
                        const v = Number(p.value) || 0;
                        const t = (v - min) / range;
                        const y = padY + (1 - t) * innerH;
                        return { x, y, label: p.label, value: v };
                      });

                      const toSmoothPath = (pts) => {
                        if (!pts.length) return '';
                        if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
                        if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
                        const d = [`M${pts[0].x},${pts[0].y}`];
                        for (let i = 0; i < pts.length - 1; i += 1) {
                          const p0 = pts[Math.max(0, i - 1)];
                          const p1 = pts[i];
                          const p2 = pts[i + 1];
                          const p3 = pts[Math.min(pts.length - 1, i + 2)];
                          const cp1x = p1.x + (p2.x - p0.x) / 6;
                          const cp1y = p1.y + (p2.y - p0.y) / 6;
                          const cp2x = p2.x - (p3.x - p1.x) / 6;
                          const cp2y = p2.y - (p3.y - p1.y) / 6;
                          d.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
                        }
                        return d.join(' ');
                      };

                      const path = toSmoothPath(points);

                      const gridLines = 4;
                      const gridY = Array.from({ length: gridLines + 1 }, (_, i) => padY + (i / gridLines) * innerH);
                      return (
                        <>
                          {gridY.map((y, i) => (
                            <line key={`gy-${i}`} x1={padX} y1={y} x2={width - padX} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                          ))}
                          {points.map((pt, i) => (
                            <line key={`gx-${i}`} x1={pt.x} y1={padY} x2={pt.x} y2={height - padY} stroke="#f3f4f6" strokeWidth="1" />
                          ))}
                          <path d={path} fill="none" stroke="#2563eb" strokeWidth="2.5" />
                          {points.map((pt, i) => {
                            const prev = points[i - 1];
                            const up = !prev ? true : pt.value >= prev.value;
                            const color = up ? '#16a34a' : '#dc2626';
                            return <circle key={`pt-${i}`} cx={pt.x} cy={pt.y} r="4.2" fill={color} stroke="#ffffff" strokeWidth="2" />;
                          })}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-600">
                    {profit.series.map((p, i) => (
                      <div key={`lbl-${i}`} className="flex-1 text-center truncate">{p.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-gray-900 font-semibold">Recent Sales • {data.primaryCategory}</div>
                  <div className="text-sm text-gray-600">Latest sales for the selected category</div>
                </div>
                <button className="text-sm text-green-600">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full table-fixed">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-semibold text-gray-600">
                      <th className="px-4 py-3 w-[34%]">Date</th>
                      <th className="px-4 py-3 w-[26%]">Product</th>
                      <th className="px-4 py-3 w-[10%] text-right">Qty</th>
                      <th className="px-4 py-3 w-[14%] text-right">Rate</th>
                      <th className="px-4 py-3 w-[16%] text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.transactions.slice(0, 10).map((t) => {
                      const dateStr = formatDisplayDate(t.date);
                      const isUsd = String(t.currency || '').toUpperCase() === 'USD' || t.usdTotal != null;
                      const qty = Number(t.qty) || 0;
                      const usdTotal = Number(t.usdTotal) || 0;
                      const tzsTotal = isUsd ? (Number(t.amount) || 0) : Number(t.amount || 0);
                      const unitRate = qty > 0
                        ? (isUsd ? (usdTotal / qty) : (tzsTotal / qty))
                        : null;
                      return (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900 break-words">{dateStr}</div>
                            <div className="text-xs text-gray-600 break-words">{t.invoiceNo || ''}</div>
                            <div className="text-xs text-gray-600 break-words">{t.customer}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-gray-900 break-words">{t.items}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="text-sm font-semibold text-gray-900">{qty ? qty.toLocaleString() : '—'}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              {unitRate == null
                                ? '—'
                                : isUsd
                                  ? `USD ${unitRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                  : `TSH ${unitRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {isUsd ? (
                              <>
                                <div className="text-sm font-extrabold text-gray-900">USD {usdTotal.toLocaleString()}</div>
                                <div className="text-xs text-gray-600">TSH {Number(tzsTotal || 0).toLocaleString()}</div>
                              </>
                            ) : (
                              <>
                                <div className="text-sm font-extrabold text-gray-900">{formatTZS(t.amount)}</div>
                                <div className="text-xs text-gray-600">{t.type}</div>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {data.transactions.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-sm text-gray-600" colSpan={5}>No sales yet</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-900 font-semibold">Filter Period</div>
                <Calendar className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-sm text-gray-700 mb-3">
                {selectedDay
                  ? formatDisplayDate(new Date(selectedYear, selectedMonth, selectedDay).toISOString().slice(0, 10))
                  : new Date(selectedYear, selectedMonth, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-600">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={`${d}-${i}`} className="py-1">
                    {d}
                  </div>
                ))}
                {Array.from({ length: calendarMeta.firstWeekday }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {Array.from({ length: calendarMeta.daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = selectedDay === day;
                  const hasActivity = activeDays.has(day);
                  const base = hasActivity ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700 border border-gray-200';
                  const selected = 'bg-green-600 text-white border border-green-600';
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`py-2 rounded border ${isSelected ? selected : base} hover:bg-green-100`}
                      onClick={() => setSelectedDay(day)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={selectedDay ? 'mt-4 w-full px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800' : 'mt-4 w-full px-3 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm font-semibold cursor-not-allowed'}
                onClick={() => (selectedDay ? setSelectedDay(null) : null)}
              >
                {selectedDay ? 'Clear Date Filter' : 'Select a date'}
              </button>
              <div className="mt-3 flex items-center gap-2">
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-gray-900 font-semibold">Sales Overview</div>
              <div className="mt-4 flex items-center justify-center">
                <div className="relative" style={{ width: salesCircleSize, height: salesCircleSize }}>
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(#22c55e 0deg ${Math.round(salesCircleFill * 360)}deg, #e5e7eb 0deg 360deg)`
                    }}
                  />
                  <div
                    className="absolute rounded-full bg-white border border-gray-200"
                    style={{ top: salesCircleInset, left: salesCircleInset, right: salesCircleInset, bottom: salesCircleInset }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-extrabold text-gray-900">{formatTZS(data.revenue)}</div>
                      <div className="text-xs text-gray-600">Total Amount</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-6 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
                  Monthly Sales
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-200" />
                  Average
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-700 text-center">Inventory Summary</div>
                <div className="mt-3 divide-y divide-gray-100">
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-700">Inventory Value</span>
                    <span className="font-semibold text-gray-900">{formatTZS(data.inventoryValue)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-700">Customers</span>
                    <span className="font-semibold text-gray-900">{data.customerCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-700">Total Sales</span>
                    <span className="font-semibold text-gray-900">{data.totalSales.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-900 font-semibold">Invoice</div>
              </div>
              <div className="overflow-auto max-h-[360px]">
                <table className="min-w-[520px] w-full table-fixed">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-semibold text-gray-600">
                      <th className="px-4 py-2 w-[54%]">Invoice #</th>
                      <th className="px-4 py-2 w-[30%] text-right">Amount</th>
                      <th className="px-4 py-2 w-[16%] text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.topInvoices.slice(0, 50).map((inv, i) => {
                      const downloadInvoice = async () => {
                        flushSync(() => setInvoiceToPrint(inv));
                        await waitForInvoicePrintReady();
                        window.print();
                      };
                      return (
                        <tr key={`${inv.id}-${i}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 break-all">{inv.id}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">{formatTZS(inv.amount)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 hover:bg-white"
                              onClick={downloadInvoice}
                              aria-label="Download invoice"
                            >
                              <Download className="w-4 h-4 text-green-600" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {data.topInvoices.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-sm text-gray-600" colSpan={3}>No invoices yet</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 cursor-pointer" onClick={() => setInsightsOpen((v) => !v)}>
                  <div className="text-xs font-semibold text-green-700">AI INSIGHTS</div>
                  <div className="text-gray-900 font-semibold">Today's Recommendations</div>
                  <div className="mt-1 text-xs text-gray-600">Last updated: {formatDisplayDate(insightsUpdatedAt.toISOString())}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => {
                      setInsightsUpdatedAt(new Date());
                      refreshData();
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                    onClick={() => setInsightsOpen((v) => !v)}
                    aria-label="Toggle AI insights"
                  >
                    {insightsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {insightsOpen ? (
                <div className="mt-4 space-y-3">
                  {recommendations.map((r, idx) => {
                    const sev =
                      r.severity === 'High'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : r.severity === 'Medium'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700';
                    return (
                      <div key={`${r.title}-${idx}`} className="p-4 rounded-xl border border-gray-200 bg-white">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] font-semibold text-gray-600 uppercase">{r.tag}</div>
                          <div className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${sev}`}>{r.severity}</div>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-gray-900">{r.title}</div>
                        <div className="mt-1 text-sm text-gray-600">{r.message}</div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;
