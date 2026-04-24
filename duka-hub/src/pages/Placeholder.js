/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { appendSystemActivity } from '../utils/systemActivity';
import { elementToPdfFile } from '../utils/pdf';
import {
  Printer,
  Mail,
  ChevronDown,
  UserPlus,
  Plus,
  Share2,
  Copy,
  Trash2,
  Pencil,
  Search,
  Download,
  Upload,
  MessageCircle,
  ClipboardList,
  HandCoins,
  Building2,
  Scale,
  BadgeCheck,
  Rocket,
  FileText,
  Truck,
  PackageCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { formatDisplayDate } from '../utils/date';
import { UNIT_OPTIONS } from '../utils/units';
import { withMinimumDelay } from '../utils/loadingDelay';
import DateInput from '../shared/DateInput';
import SalesOrderPrint from '../shared/SalesOrderPrint';
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal';
import SystemPreferences from './SystemPreferences';
import { canDeleteRecords } from '../utils/deletePassword';
import { downloadExcelFile, printWithTitle } from '../utils/reportActions';
import SalesReport from './reports/SalesReport';
import ExpensesReport from './reports/ExpensesReport';
import PurchaseReport from './reports/PurchaseReport';
import SystemLogsPage from './SystemLogs';
import { customersApi } from '../services/customersApi';
import { damageStocksApi } from '../services/damageStocksApi';
import { expensesApi } from '../services/expensesApi';
import { productsApi } from '../services/productsApi';
import { salesApi } from '../services/salesApi';
import { listRuntimeCacheKeys, readRuntimeCache, removeRuntimeCache, writeRuntimeCache } from '../services/runtimeCache';
const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const localStore = {
  get(key, fallback) {
    return readRuntimeCache(String(key || ''), fallback);
  },
  set(key, value, options) {
    const k = String(key || '');
    if (!k) return false;
    writeRuntimeCache(k, value);
    if (!options?.silent) {
      try {
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}
    }
    return true;
  },
  del(key, options) {
    removeRuntimeCache(String(key || ''));
    if (!options?.silent) {
      try {
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}
    }
  },
  list() {
    return listRuntimeCacheKeys().sort();
  }
};

const getStoredJson = (key, fallback) => localStore.get(key, fallback);
const setStoredJson = (key, value) => Promise.resolve(localStore.set(key, value));

const mapCustomerToContactFields = (customer) => ({
  name: customer?.name || customer?.company || '',
  email: customer?.mainEmail || customer?.email || customer?.ccEmail || '',
  phone: customer?.mainPhone || customer?.phone || customer?.mobile || customer?.workPhone || '',
  billTo: customer?.billTo || customer?.address || '',
  shipTo: customer?.shipTo || customer?.address || ''
});

const getInventoryMovementDirection = (movement) => {
  const rawType = String(movement?.rawMovementType || movement?.movementType || '').trim().toUpperCase();
  if (rawType === 'STOCK_OUT' || rawType.endsWith('_OUT')) return 'stock_out';
  if (rawType === 'STOCK_IN' || rawType.endsWith('_IN') || rawType === 'OPENING_BALANCE') return 'stock_in';
  const quantityDelta = Number(movement?.quantityDelta);
  if (Number.isFinite(quantityDelta)) return quantityDelta < 0 ? 'stock_out' : 'stock_in';
  return rawType.toLowerCase().includes('out') ? 'stock_out' : 'stock_in';
};

const isInventoryMovementOut = (movement) => getInventoryMovementDirection(movement) === 'stock_out';
const isInventoryMovementIn = (movement) => getInventoryMovementDirection(movement) === 'stock_in';

function PlaceholderInner({ __localStore }) {
  const localStorage = __localStore;
  const { page } = useParams();
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try {
      const local = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (local) return local;
    } catch {}
    return null;
  }, [localStorage]);
  const isAdmin = true;
  const canDelete = canDeleteRecords();
  const restrictedForStaff = false;
  const [activeBusiness, setActiveBusiness] = React.useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem('activeBusiness') || '"eggs"');
      return v === 'meat' ? 'meat' : 'eggs';
    } catch {
      return 'eggs';
    }
  });
  React.useEffect(() => {
    const handler = () => {
      try {
        const v = JSON.parse(localStorage.getItem('activeBusiness') || '"eggs"');
        setActiveBusiness(v === 'meat' ? 'meat' : 'eggs');
      } catch {
        setActiveBusiness('eggs');
      }
    };
    window.addEventListener('activeBusinessChanged', handler);
    return () => window.removeEventListener('activeBusinessChanged', handler);
  }, [localStorage]);

  const NotAvailable = ({ forBusiness }) => (
    <div className="bg-white border border-red-200 rounded-xl p-6">
      <div className="text-sm font-semibold text-red-700">Not available</div>
      <div className="text-xs text-red-600 mt-1">This module is only available for {forBusiness} business type.</div>
    </div>
  );

  const AccountingHome = () => {
    const tiles = [
      { id: 'income', title: 'Income Overview', desc: 'Sales summary and trends', to: '/placeholder/income-overview' },
      { id: 'expense', title: 'Expense Overview', desc: 'Expense summary and categories', to: '/placeholder/expense-overview' },
      { id: 'stock', title: 'Stock Value', desc: 'Inventory valuation', to: '/placeholder/stock-value' },
      { id: 'closing', title: 'Period Closing', desc: 'Close months and keep snapshots', to: '/placeholder/period-closing' },
      { id: 'audit', title: 'Audit Trail', desc: 'System activity log', to: '/placeholder/audit-trail' }
    ];
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-lg text-gray-900">Accounting</div>
          <div className="text-sm text-gray-600 mt-1">Admin-only tools for summaries and audit.</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((t) => (
            <button key={t.id} type="button" className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:bg-gray-50" onClick={() => navigate(t.to)}>
              <div className="text-base text-gray-900">{t.title}</div>
              <div className="text-sm text-gray-600 mt-1">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const IncomeOverview = () => {
    const [fromDate, setFromDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 30).toISOString().slice(0, 10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [q, setQ] = useState('');
    const readArray = (key) => {
      const v = localStore.get(key, []);
      return Array.isArray(v) ? v : [];
    };
    const rows = useMemo(() => {
      const start = Date.parse(`${String(fromDate || '').slice(0, 10)}T00:00:00`);
      const end = Date.parse(`${String(toDate || '').slice(0, 10)}T23:59:59`);
      const term = String(q || '').trim().toLowerCase();
      const salesAll = [...readArray('sales'), ...readArray('salesOrders')];
      const list = salesAll
        .map((s) => {
          const date = String(s?.date || s?.createdAt || s?.timestamp || '');
          const ts = Date.parse(date);
          const amount = Number(s?.amount ?? s?.finalTotal ?? s?.total ?? 0) || 0;
          const customer = String(s?.customer || s?.customerName || '').trim();
          const id = String(s?.id || s?.invoiceNo || s?.invoiceNumber || '').trim();
          return { id: id || `${ts}-${Math.random().toString(16).slice(2)}`, date, ts, amount, customer };
        })
        .filter((r) => Number.isFinite(r.ts))
        .filter((r) => (!Number.isFinite(start) ? true : r.ts >= start) && (!Number.isFinite(end) ? true : r.ts <= end))
        .filter((r) => (term ? `${r.id} ${r.customer}`.toLowerCase().includes(term) : true))
        .sort((a, b) => b.ts - a.ts);
      const total = list.reduce((s, r) => s + Number(r.amount || 0), 0);
      return { list, total, count: list.length };
    }, [fromDate, q, toDate]);
    const bars = useMemo(() => {
      const start = Date.parse(`${String(fromDate || '').slice(0, 10)}T00:00:00`);
      const end = Date.parse(`${String(toDate || '').slice(0, 10)}T00:00:00`);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
      const map = new Map();
      rows.list.forEach((r) => {
        const k = String(r.date || '').slice(0, 10);
        if (!k) return;
        map.set(k, (map.get(k) || 0) + Number(r.amount || 0));
      });
      const days = Math.min(60, Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1);
      const out = [];
      for (let i = 0; i < days; i += 1) {
        const d = new Date(start + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        out.push({ day: d, value: map.get(d) || 0 });
      }
      const max = out.reduce((m, x) => Math.max(m, x.value), 0) || 1;
      return out.map((x) => ({ ...x, pct: Math.max(0, Math.min(100, (x.value / max) * 100)) }));
    }, [fromDate, rows.list, toDate]);
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-lg text-gray-900">Income Overview</div>
          <div className="text-sm text-gray-600 mt-1">Based on sales recorded in the system.</div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <div className="text-xs text-gray-600">From</div>
              <DateInput value={fromDate} onChange={setFromDate} />
            </div>
            <div>
              <div className="text-xs text-gray-600">To</div>
              <DateInput value={toDate} onChange={setToDate} />
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="text-xs text-gray-600">Search</div>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Customer or invoice..." />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-600">Total income</div>
            <div className="mt-1 text-xl text-gray-900">TZS {Number(rows.total || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-600">Transactions</div>
            <div className="mt-1 text-xl text-gray-900">{Number(rows.count || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-600">Average</div>
            <div className="mt-1 text-xl text-gray-900">TZS {(rows.count ? rows.total / rows.count : 0).toFixed(0)}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-sm text-gray-900">Daily income</div>
          <div className="mt-4 grid grid-cols-10 gap-2">
            {bars.map((b) => (
              <div key={b.day} className="h-28 flex items-end">
                <div className="w-full bg-green-600/80 rounded" style={{ height: `${b.pct}%` }} title={`${b.day} • TZS ${Number(b.value || 0).toLocaleString()}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ExpenseOverview = () => {
    const [fromDate, setFromDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 30).toISOString().slice(0, 10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [q, setQ] = useState('');
    const readArray = (key) => {
      const v = localStore.get(key, []);
      return Array.isArray(v) ? v : [];
    };
    const rows = useMemo(() => {
      const start = Date.parse(`${String(fromDate || '').slice(0, 10)}T00:00:00`);
      const end = Date.parse(`${String(toDate || '').slice(0, 10)}T23:59:59`);
      const term = String(q || '').trim().toLowerCase();
      const expenses = readArray('expenses');
      const list = expenses
        .map((e) => {
          const date = String(e?.date || e?.createdAt || '');
          const ts = Date.parse(date);
          const amount = Number(e?.amount ?? 0) || 0;
          const category = String(e?.category || e?.type || '').trim();
          const desc = String(e?.description || e?.note || '').trim();
          const id = String(e?.id || '').trim();
          return { id: id || `${ts}-${Math.random().toString(16).slice(2)}`, date, ts, amount, category, desc };
        })
        .filter((r) => Number.isFinite(r.ts))
        .filter((r) => (!Number.isFinite(start) ? true : r.ts >= start) && (!Number.isFinite(end) ? true : r.ts <= end))
        .filter((r) => (term ? `${r.category} ${r.desc}`.toLowerCase().includes(term) : true))
        .sort((a, b) => b.ts - a.ts);
      const total = list.reduce((s, r) => s + Number(r.amount || 0), 0);
      const byCat = {};
      list.forEach((r) => {
        const k = String(r.category || 'General');
        byCat[k] = (byCat[k] || 0) + Number(r.amount || 0);
      });
      const cats = Object.entries(byCat)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
      return { list, total, count: list.length, cats };
    }, [fromDate, q, toDate]);
    const maxCat = rows.cats.reduce((m, x) => Math.max(m, x.amount), 0) || 1;
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-lg text-gray-900">Expense Overview</div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <div className="text-xs text-gray-600">From</div>
              <DateInput value={fromDate} onChange={setFromDate} />
            </div>
            <div>
              <div className="text-xs text-gray-600">To</div>
              <DateInput value={toDate} onChange={setToDate} />
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="text-xs text-gray-600">Search</div>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Category or description..." />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-600">Total expenses</div>
            <div className="mt-1 text-xl text-gray-900">TZS {Number(rows.total || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-600">Records</div>
            <div className="mt-1 text-xl text-gray-900">{Number(rows.count || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-600">Average</div>
            <div className="mt-1 text-xl text-gray-900">TZS {(rows.count ? rows.total / rows.count : 0).toFixed(0)}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-sm text-gray-900">By category</div>
          <div className="mt-4 space-y-3">
            {rows.cats.map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-900">{c.category}</div>
                  <div className="text-sm text-gray-900">TZS {Number(c.amount || 0).toLocaleString()}</div>
                </div>
                <div className="h-3 rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.max(0, Math.min(100, (c.amount / maxCat) * 100))}%` }} />
                </div>
              </div>
            ))}
            {rows.cats.length === 0 ? <div className="text-sm text-gray-600">No expenses found</div> : null}
          </div>
        </div>
      </div>
    );
  };

  const StockValueAccounting = () => {
    const [q, setQ] = useState('');
    const rows = useMemo(() => {
      const norm = (v) => String(v || '').trim().toLowerCase();
      const term = norm(q);
      const itemsRaw = (() => {
        const v = localStore.get('inventoryItems', []);
        return Array.isArray(v) ? v : [];
      })();
      const list = itemsRaw
        .map((it) => {
          const name = String(it?.name || it?.itemName || '').trim();
          const qtyRaw = String(it?.qty ?? it?.quantity ?? 0).replace(/,/g, '');
          const qty = parseFloat(qtyRaw);
          const unitCost = Number(it?.buyingPrice ?? it?.buyPrice ?? it?.costPrice ?? 0) || 0;
          return { id: String(it?.id || name || Math.random()), name, qty: Number.isFinite(qty) ? qty : 0, unitCost, totalValue: (Number.isFinite(qty) ? qty : 0) * unitCost };
        })
        .filter((r) => r.name)
        .filter((r) => (term ? norm(r.name).includes(term) : true))
        .sort((a, b) => b.totalValue - a.totalValue);
      const totalValue = list.reduce((s, r) => s + Number(r.totalValue || 0), 0);
      const totalUnits = list.reduce((s, r) => s + Math.max(0, Number(r.qty || 0)), 0);
      return { list, totalValue, totalUnits };
    }, [q]);
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-lg text-gray-900">Stock Value</div>
          <div className="text-sm text-gray-600 mt-1">Based on inventory item quantities and buying price.</div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="text-xs text-gray-600">Search</div>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product..." />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              Value: TZS {Number(rows.totalValue || 0).toLocaleString()}
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              Units: {Number(rows.totalUnits || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-600">Product</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-600">Qty</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-600">Unit Cost</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.list.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{Number(r.qty || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{Number(r.unitCost || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{Number(r.totalValue || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {rows.list.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-600" colSpan={4}>No items found</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const PeriodClosing = () => {
    const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
    const [rows, setRows] = useState([]);
    const [saving, setSaving] = useState(false);
    const readArray = (key) => {
      const v = localStore.get(key, []);
      return Array.isArray(v) ? v : [];
    };
    useEffect(() => {
      setRows(readArray('dh_periodClosings'));
    }, []);
    const computeSnapshot = useCallback(() => {
      const m = String(period || '').trim();
      if (!/^\d{4}-\d{2}$/.test(m)) return null;
      const [yy, mm] = m.split('-');
      const y = Number(yy);
      const month = Number(mm);
      if (!Number.isFinite(y) || !Number.isFinite(month)) return null;
      const start = Date.parse(`${yy}-${mm}-01T00:00:00`);
      const end = Date.parse(new Date(y, month, 0, 23, 59, 59).toISOString());
      const salesAll = [...readArray('sales'), ...readArray('salesOrders')].map((s) => ({ date: String(s?.date || s?.createdAt || ''), amount: Number(s?.amount ?? s?.finalTotal ?? s?.total ?? 0) || 0 }));
      const expenses = readArray('expenses').map((e) => ({ date: String(e?.date || e?.createdAt || ''), amount: Number(e?.amount ?? 0) || 0 }));
      const income = salesAll.filter((r) => {
        const ts = Date.parse(r.date);
        return Number.isFinite(ts) && ts >= start && ts <= end;
      }).reduce((s, r) => s + r.amount, 0);
      const expense = expenses.filter((r) => {
        const ts = Date.parse(r.date);
        return Number.isFinite(ts) && ts >= start && ts <= end;
      }).reduce((s, r) => s + r.amount, 0);
      const items = readArray('inventoryItems');
      const stockValue = items.reduce((s, it) => {
        const qty = parseFloat(String(it?.qty ?? it?.quantity ?? 0).replace(/,/g, ''));
        const unitCost = Number(it?.buyingPrice ?? it?.buyPrice ?? it?.costPrice ?? 0) || 0;
        return s + (Number.isFinite(qty) ? qty : 0) * unitCost;
      }, 0);
      return { id: `CLOSE-${Date.now()}-${Math.random().toString(16).slice(2)}`, period: m, income, expense, profit: income - expense, stockValue, createdAt: new Date().toISOString() };
    }, [period]);
    const closePeriod = async () => {
      if (saving) return;
      const snap = computeSnapshot();
      if (!snap) return;
      setSaving(true);
      try {
        const existing = readArray('dh_periodClosings');
        const next = [snap, ...existing].slice(0, 200);
        localStore.set('dh_periodClosings', next);
        setRows(next);
      } finally {
        setSaving(false);
      }
    };
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-lg text-gray-900">Period Closing</div>
          <div className="text-sm text-gray-600 mt-1">Creates a snapshot for a month (income, expense, profit, stock value).</div>
          <div className="mt-4 flex items-end gap-3 flex-wrap">
            <div>
              <div className="text-xs text-gray-600">Month</div>
              <input className="px-3 py-2 border border-gray-300 rounded-lg" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <button type="button" className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60" onClick={closePeriod} disabled={saving}>
              {saving ? 'Closing...' : 'Close Period'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-600">Period</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-600">Income</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-600">Expense</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-600">Profit</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-600">Stock Value</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.period}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{Number(r.income || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{Number(r.expense || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{Number(r.profit || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{Number(r.stockValue || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{formatDisplayDate(r.createdAt)}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-600" colSpan={6}>No period closings yet</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const AuditTrail = () => {
    return <SystemLogsPage />;
  };

  const SupportPage = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-lg text-gray-900">Support</div>
          <div className="text-sm text-gray-600 mt-1">Get help, report issues, or request features.</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              onClick={() => {
                const subject = encodeURIComponent('DukaHub Support');
                const body = encodeURIComponent('Hello support team,\n\nI need help with:\n\n');
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}
            >
              Email Support
            </button>
            <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50" onClick={() => navigate('/placeholder/notifications')}>
              Open Activity
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ChickenProcessing = () => {
    const [records, setRecords] = React.useState(() => JSON.parse(localStorage.getItem('production_chicken_processing') || '[]'));
    const [form, setForm] = React.useState({
      date: new Date().toISOString().slice(0,10),
      birdsProcessed: '',
      avgWeightKg: '',
      losses: '',
      lossesReason: '',
      notes: ''
    });
    if (activeBusiness !== 'meat') return <NotAvailable forBusiness="Chicken Meat" />;
    const submit = (e) => {
      e.preventDefault();
      if (!form.birdsProcessed) return;
      const rec = { id: Date.now(), ...form, birdsProcessed: Number(form.birdsProcessed || 0), avgWeightKg: Number(form.avgWeightKg || 0), losses: Number(form.losses || 0) };
      const next = [...records, rec];
      localStorage.setItem('production_chicken_processing', JSON.stringify(next));
      setRecords(next);
      window.dispatchEvent(new CustomEvent('dataUpdated'));
      setForm({ date: new Date().toISOString().slice(0,10), birdsProcessed: '', avgWeightKg: '', losses: '', lossesReason: '', notes: '' });
    };
    const totalProcessed = records.reduce((s,r)=>s+(r.birdsProcessed||0),0);
    const totalLosses = records.reduce((s,r)=>s+(r.losses||0),0);
    const avgWeight = (() => {
      const weights = records.map(r=>Number(r.avgWeightKg||0)).filter(n=>n>0);
      if (!weights.length) return 0;
      return (weights.reduce((s,n)=>s+n,0)/weights.length);
    })();
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Total Birds Processed</div>
            <div className="text-xl font-bold text-gray-900">{totalProcessed.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Total Losses</div>
            <div className="text-xl font-bold text-gray-900">{totalLosses.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Avg Weight (kg)</div>
            <div className="text-xl font-bold text-gray-900">{avgWeight.toFixed(2)}</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">Record Processing</div>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-700">Date</label>
              <DateInput value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Birds Processed</label>
              <input type="number" value={form.birdsProcessed} onChange={e=>setForm({...form,birdsProcessed:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" required />
            </div>
            <div>
              <label className="text-xs text-gray-700">Average Weight (kg)</label>
              <input type="number" step="0.01" value={form.avgWeightKg} onChange={e=>setForm({...form,avgWeightKg:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Losses (count)</label>
              <input type="number" value={form.losses} onChange={e=>setForm({...form,losses:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Losses Reason</label>
              <input type="text" value={form.lossesReason} onChange={e=>setForm({...form,lossesReason:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-700">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" rows="3" />
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
            </div>
          </form>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">Recent Records</div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-600">
                  <th className="px-3 py-2 border">Date</th>
                  <th className="px-3 py-2 border">Birds</th>
                  <th className="px-3 py-2 border">Avg kg</th>
                  <th className="px-3 py-2 border">Losses</th>
                  <th className="px-3 py-2 border">Reason</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r=>(
                  <tr key={r.id} className="text-sm">
                    <td className="px-3 py-2 border">{r.date}</td>
                    <td className="px-3 py-2 border">{Number(r.birdsProcessed||0).toLocaleString()}</td>
                    <td className="px-3 py-2 border">{Number(r.avgWeightKg||0).toFixed(2)}</td>
                    <td className="px-3 py-2 border">{Number(r.losses||0).toLocaleString()}</td>
                    <td className="px-3 py-2 border">{r.lossesReason||''}</td>
                  </tr>
                ))}
                {records.length===0 && (
                  <tr><td className="px-3 py-4 text-center text-gray-600 border" colSpan={5}>No records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const EggProduction = () => {
    const [records, setRecords] = React.useState(() => JSON.parse(localStorage.getItem('production_egg_production') || '[]'));
    const [form, setForm] = React.useState({
      date: new Date().toISOString().slice(0,10),
      eggsCollected: '',
      brokenEggs: '',
      trays: '',
      notes: ''
    });
    if (activeBusiness !== 'eggs') return <NotAvailable forBusiness="Eggs" />;
    const submit = (e) => {
      e.preventDefault();
      if (!form.eggsCollected) return;
      const rec = { id: Date.now(), ...form, eggsCollected: Number(form.eggsCollected||0), brokenEggs: Number(form.brokenEggs||0), trays: Number(form.trays||0) };
      const next = [...records, rec];
      localStorage.setItem('production_egg_production', JSON.stringify(next));
      setRecords(next);
      window.dispatchEvent(new CustomEvent('dataUpdated'));
      setForm({ date: new Date().toISOString().slice(0,10), eggsCollected: '', brokenEggs: '', trays: '', notes: '' });
    };
    const totalEggs = records.reduce((s,r)=>s+(r.eggsCollected||0),0);
    const totalBroken = records.reduce((s,r)=>s+(r.brokenEggs||0),0);
    const totalTrays = records.reduce((s,r)=>s+(r.trays||0),0);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Eggs Collected</div>
            <div className="text-xl font-bold text-gray-900">{totalEggs.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Broken Eggs</div>
            <div className="text-xl font-bold text-gray-900">{totalBroken.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Trays</div>
            <div className="text-xl font-bold text-gray-900">{totalTrays.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">Record Egg Production</div>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-700">Date</label>
              <DateInput value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Eggs Collected</label>
              <input type="number" value={form.eggsCollected} onChange={e=>setForm({...form,eggsCollected:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" required />
            </div>
            <div>
              <label className="text-xs text-gray-700">Broken Eggs</label>
              <input type="number" value={form.brokenEggs} onChange={e=>setForm({...form,brokenEggs:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Trays</label>
              <input type="number" value={form.trays} onChange={e=>setForm({...form,trays:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-700">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" rows="3" />
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
            </div>
          </form>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">Recent Records</div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-600">
                  <th className="px-3 py-2 border">Date</th>
                  <th className="px-3 py-2 border">Eggs</th>
                  <th className="px-3 py-2 border">Broken</th>
                  <th className="px-3 py-2 border">Trays</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r=>(
                  <tr key={r.id} className="text-sm">
                    <td className="px-3 py-2 border">{r.date}</td>
                    <td className="px-3 py-2 border">{Number(r.eggsCollected||0).toLocaleString()}</td>
                    <td className="px-3 py-2 border">{Number(r.brokenEggs||0).toLocaleString()}</td>
                    <td className="px-3 py-2 border">{Number(r.trays||0).toLocaleString()}</td>
                  </tr>
                ))}
                {records.length===0 && (
                  <tr><td className="px-3 py-4 text-center text-gray-600 border" colSpan={4}>No records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const PaymentDueAlerts = () => {
    const [nonce, setNonce] = useState(0);
    const toMoney = (n) => {
      try {
        return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n || 0));
      } catch {
        const x = Number(n || 0);
        return x.toFixed ? x.toFixed(2) : String(x);
      }
    };
    const currentUser = (() => {
      try {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
      } catch {
        return null;
      }
    })();
    const businessId = String(currentUser?.businessId || currentUser?.id || '');
    React.useEffect(() => {
      const onEvent = () => setNonce((n) => n + 1);
      window.addEventListener('dataUpdated', onEvent);
      window.addEventListener('companyInfoUpdated', onEvent);
      window.addEventListener('notificationsUpdated', onEvent);
      window.addEventListener('billingHistoryUpdated', onEvent);
      window.addEventListener('storage', onEvent);
      return () => {
        window.removeEventListener('dataUpdated', onEvent);
        window.removeEventListener('companyInfoUpdated', onEvent);
        window.removeEventListener('notificationsUpdated', onEvent);
        window.removeEventListener('billingHistoryUpdated', onEvent);
        window.removeEventListener('storage', onEvent);
      };
    }, []);
    const billingHistory = useMemo(() => {
      void nonce;
      try {
        const key = `billingHistory:${businessId}`;
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        const list = Array.isArray(arr) ? arr : [];
        // Fallback: if there is an active plan but no history stored, compose one virtual entry
        let out = list.slice();
        try {
          const ci = localStore.get('companyInfo', {}) || {};
          const planId = String(ci.subscriptionPlan || '').trim();
          if (planId && out.length === 0) {
            out = [
              {
                id: `BILL-VIRTUAL-${Date.now()}`,
                businessId,
                planId,
                planTitle: planId.charAt(0).toUpperCase() + planId.slice(1),
                amount: Number(ci.subscriptionPrice || 0),
                paidAt: String(ci.subscriptionStartedAt || ''),
                endsAt: String(ci.subscriptionEndsAt || ''),
                period: String(ci.subscriptionPeriod || ''),
                months: Number(ci.subscriptionMonths || 0),
                provider: String(ci.paymentProvider || ''),
                phone: String(ci.paymentPhone || '')
              }
            ];
          }
        } catch {}
        return out;
      } catch {
        return [];
      }
    }, [businessId, nonce]);
    const companyInfo = useMemo(() => {
      void nonce;
      return localStore.get('companyInfo', {}) || {};
    }, [nonce]);

    const formatDate = (iso) => {
      if (!iso) return '—';
      const t = Date.parse(String(iso));
      if (!Number.isFinite(t)) return String(iso || '—');
      const d = new Date(t);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const currentBill = useMemo(() => {
      const arr = billingHistory.slice().sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
      return arr[0] || null;
    }, [billingHistory]);

    const statusRaw = String(companyInfo?.subscriptionPaymentStatus || currentUser?.subscriptionPaymentStatus || '').trim().toLowerCase();
    const planType = String(companyInfo?.subscriptionPlan || currentUser?.subscriptionPlan || currentBill?.planId || '').trim().toLowerCase();
    const planTitle = planType ? planType.charAt(0).toUpperCase() + planType.slice(1) : '—';
    const paidAt = String(companyInfo?.subscriptionStartedAt || currentUser?.subscriptionStartedAt || currentBill?.paidAt || '').trim();
    const endsAt = String(companyInfo?.subscriptionEndsAt || currentUser?.subscriptionEndsAt || currentBill?.endsAt || '').trim();
    const trialEndsAtStored = String(companyInfo?.subscriptionTrialEndsAt || currentUser?.subscriptionTrialEndsAt || '').trim();
    const provider = String(companyInfo?.paymentProvider || currentUser?.paymentProvider || currentBill?.provider || '').trim();
    const paymentPhone = String(companyInfo?.paymentPhone || currentUser?.paymentPhone || currentBill?.phone || '').trim();
    const months = (() => {
      const v = Number(companyInfo?.subscriptionMonths ?? currentUser?.subscriptionMonths ?? currentBill?.months ?? (statusRaw === 'trial' ? 0 : 1));
      if (statusRaw === 'trial') return Number.isFinite(v) && v >= 0 ? v : 0;
      return Number.isFinite(v) && v > 0 ? v : 1;
    })();
    const planPrices = { starter: 15000, professional: 35000, enterprise: 60000 };
    const rawMonthly = (() => {
      const v = Number(companyInfo?.subscriptionRawMonthlyPrice ?? currentUser?.subscriptionRawMonthlyPrice ?? planPrices[planType] ?? 0);
      return Number.isFinite(v) && v >= 0 ? v : 0;
    })();
    const discountedMonthly = rawMonthly;
    const amountDue = Math.round(rawMonthly * months);
    const paidAmount = (() => {
      const v = Number(companyInfo?.subscriptionAmountPaid ?? currentUser?.subscriptionAmountPaid ?? currentBill?.amount ?? 0);
      return Number.isFinite(v) && v >= 0 ? v : 0;
    })();

    const trialEndsAt = useMemo(() => {
      if (statusRaw !== 'trial') return '';
      const base = String(paidAt || currentUser?.createdAt || '').trim();
      const t = Date.parse(base);
      if (!Number.isFinite(t)) return trialEndsAtStored || '';
      const maxTrial = t + 7 * 24 * 60 * 60 * 1000;
      const storedT = Date.parse(trialEndsAtStored);
      if (Number.isFinite(storedT)) return new Date(Math.min(storedT, maxTrial)).toISOString();
      return new Date(maxTrial).toISOString();
    }, [currentUser?.createdAt, paidAt, statusRaw, trialEndsAtStored]);

    const effectiveDueAt = statusRaw === 'trial' ? trialEndsAt : endsAt;

    const daysRemain = useMemo(() => {
      const t = Date.parse(effectiveDueAt);
      if (!Number.isFinite(t)) return null;
      const msLeft = t - Date.now();
      return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    }, [effectiveDueAt]);

    const status = useMemo(() => {
      if (statusRaw === 'trial') return 'Free Trial';
      if (!effectiveDueAt) return 'Unknown';
      if (daysRemain == null) return 'Unknown';
      if (daysRemain <= 0) return 'Expired';
      if (daysRemain <= 7) return 'Due Soon';
      return 'Active';
    }, [daysRemain, effectiveDueAt, statusRaw]);

    const periodLabel = useMemo(() => {
      if (statusRaw === 'trial') return '7 Days';
      if (months === 12) return '1 Year (360 days)';
      const days = months * 30;
      return `${months} Month(s) (${days} days)`;
    }, [months, statusRaw]);

    const statusPill =
      status === 'Expired'
        ? 'bg-red-50 border border-red-200 text-red-700'
        : status === 'Due Soon'
        ? 'bg-orange-50 border border-orange-200 text-orange-700'
        : status === 'Active'
        ? 'bg-green-50 border border-green-200 text-green-700'
        : status === 'Free Trial'
        ? 'bg-blue-50 border border-blue-200 text-blue-700'
        : 'bg-gray-50 border border-gray-200 text-gray-700';

    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-base font-semibold text-gray-900">Payment Due Alert</div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusPill}`}>{status}</span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-600">Plan type</div>
              <div className="mt-1 text-lg text-gray-900">{planTitle}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-600">{statusRaw === 'trial' ? 'Trial' : 'Amount due'}</div>
              <div className="mt-1 text-lg text-gray-900">{statusRaw === 'trial' ? 'Free' : `TZS ${toMoney(amountDue)}`}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-600">Due date</div>
              <div className="mt-1 text-lg text-gray-900">{formatDate(effectiveDueAt)}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-600">{statusRaw === 'trial' ? 'Trial days remain' : 'Days remain'}</div>
              <div className="mt-1 text-lg text-gray-900">{daysRemain == null ? '—' : String(Math.max(0, daysRemain))}</div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="overflow-auto rounded-2xl border border-gray-200">
              <table className="min-w-[840px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Plan type</th>
                    <th className="text-left px-4 py-3 font-semibold">Period</th>
                    <th className="text-left px-4 py-3 font-semibold">Discount</th>
                    <th className="text-left px-4 py-3 font-semibold">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold">Payment date</th>
                    <th className="text-left px-4 py-3 font-semibold">Due date</th>
                    <th className="text-left px-4 py-3 font-semibold">Days remain</th>
                    <th className="text-left px-4 py-3 font-semibold">Other</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 text-gray-900">{planTitle}</td>
                    <td className="px-4 py-3 text-gray-700">{periodLabel}</td>
                    <td className="px-4 py-3 text-gray-700">{discountPercent ? `${discountPercent}%` : '—'}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {statusRaw === 'trial'
                        ? amountDue > 0
                          ? `Free (After trial: TZS ${toMoney(amountDue)})`
                          : 'Free (Choose plan after trial)'
                        : `TZS ${toMoney(amountDue)}`}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(paidAt)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(effectiveDueAt)}</td>
                    <td className="px-4 py-3 text-gray-700">{daysRemain == null ? '—' : String(Math.max(0, daysRemain))}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {provider ? `${provider}${paymentPhone ? ` - ${paymentPhone}` : ''}` : '—'}
                      {paidAmount ? ` • Paid: TZS ${toMoney(paidAmount)}` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FeedConsumption = () => {
    const isMeat = activeBusiness === 'meat';
    const storageKey = isMeat ? 'production_feed_meat' : 'production_feed_eggs';
    const [records, setRecords] = React.useState(() => JSON.parse(localStorage.getItem(storageKey) || '[]'));
    const [form, setForm] = React.useState({
      date: new Date().toISOString().slice(0,10),
      feedType: isMeat ? 'starter' : 'layer',
      quantityKg: '',
      costPerKg: '',
      notes: ''
    });
    React.useEffect(()=> {
      setForm(prev=>({ ...prev, feedType: isMeat ? 'starter' : 'layer' }));
    }, [isMeat]);
    const submit = (e) => {
      e.preventDefault();
      if (!form.quantityKg) return;
      const rec = { id: Date.now(), ...form, quantityKg: Number(form.quantityKg||0), costPerKg: Number(form.costPerKg||0) };
      const next = [...records, rec];
      localStorage.setItem(storageKey, JSON.stringify(next));
      setRecords(next);
      window.dispatchEvent(new CustomEvent('dataUpdated'));
      setForm({ date: new Date().toISOString().slice(0,10), feedType: isMeat ? 'starter' : 'layer', quantityKg: '', costPerKg: '', notes: '' });
    };
    const totalKg = records.reduce((s,r)=>s+(r.quantityKg||0),0);
    const totalCost = records.reduce((s,r)=>s+((r.quantityKg||0)*(r.costPerKg||0)),0);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Total Feed (kg)</div>
            <div className="text-xl font-bold text-gray-900">{totalKg.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Total Cost</div>
            <div className="text-xl font-bold text-gray-900">TSH {totalCost.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">Record Feed Consumption</div>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-700">Date</label>
              <DateInput value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Feed Type</label>
              <select value={form.feedType} onChange={e=>setForm({...form,feedType:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2">
                {isMeat ? (
                  <>
                    <option value="starter">Starter</option>
                    <option value="grower">Grower</option>
                    <option value="finisher">Finisher</option>
                  </>
                ) : (
                  <>
                    <option value="layer">Layer</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-700">Quantity (kg)</label>
              <input type="number" value={form.quantityKg} onChange={e=>setForm({...form,quantityKg:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" required />
            </div>
            <div>
              <label className="text-xs text-gray-700">Cost per kg (TSH)</label>
              <input type="number" value={form.costPerKg} onChange={e=>setForm({...form,costPerKg:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-700">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" rows="3" />
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const Mortality = () => {
    const isMeat = activeBusiness === 'meat';
    const storageKey = isMeat ? 'production_mortality_meat' : 'production_mortality_eggs';
    const [records, setRecords] = React.useState(() => JSON.parse(localStorage.getItem(storageKey) || '[]'));
    const [form, setForm] = React.useState({
      date: new Date().toISOString().slice(0,10),
      count: '',
      cause: '',
      notes: ''
    });
    const submit = (e) => {
      e.preventDefault();
      if (!form.count) return;
      const rec = { id: Date.now(), ...form, count: Number(form.count||0) };
      const next = [...records, rec];
      localStorage.setItem(storageKey, JSON.stringify(next));
      setRecords(next);
      window.dispatchEvent(new CustomEvent('dataUpdated'));
      setForm({ date: new Date().toISOString().slice(0,10), count: '', cause: '', notes: '' });
    };
    const totalDeaths = records.reduce((s,r)=>s+(r.count||0),0);
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 p-3">
          <div className="text-xs text-gray-600">Total Mortality</div>
          <div className="text-xl font-bold text-gray-900">{totalDeaths.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">Record Mortality</div>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-700">Date</label>
              <DateInput value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Deaths</label>
              <input type="number" value={form.count} onChange={e=>setForm({...form,count:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" required />
            </div>
            <div>
              <label className="text-xs text-gray-700">Cause</label>
              <input type="text" value={form.cause} onChange={e=>setForm({...form,cause:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-700">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" rows="3" />
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const HealthTreatment = () => {
    const isMeat = activeBusiness === 'meat';
    const storageKey = isMeat ? 'production_health_meat' : 'production_health_eggs';
    const [records, setRecords] = React.useState(() => JSON.parse(localStorage.getItem(storageKey) || '[]'));
    const [form, setForm] = React.useState({
      date: new Date().toISOString().slice(0,10),
      medication: '',
      dosage: '',
      cost: '',
      withdrawalPeriod: '',
      notes: ''
    });
    const submit = (e) => {
      e.preventDefault();
      if (!form.medication) return;
      const rec = { id: Date.now(), ...form, cost: Number(form.cost||0) };
      const next = [...records, rec];
      localStorage.setItem(storageKey, JSON.stringify(next));
      setRecords(next);
      window.dispatchEvent(new CustomEvent('dataUpdated'));
      setForm({ date: new Date().toISOString().slice(0,10), medication: '', dosage: '', cost: '', withdrawalPeriod: '', notes: '' });
    };
    const totalCost = records.reduce((s,r)=>s+(r.cost||0),0);
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 p-3">
          <div className="text-xs text-gray-600">Total Treatment Cost</div>
          <div className="text-xl font-bold text-gray-900">TSH {totalCost.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">Record Health / Treatments</div>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-700">Date</label>
              <DateInput value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Medication</label>
              <input type="text" value={form.medication} onChange={e=>setForm({...form,medication:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" required />
            </div>
            <div>
              <label className="text-xs text-gray-700">Dosage</label>
              <input type="text" value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Cost (TSH)</label>
              <input type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            {isMeat ? null : (
              <div>
                <label className="text-xs text-gray-700">Withdrawal Period</label>
                <input type="text" value={form.withdrawalPeriod} onChange={e=>setForm({...form,withdrawalPeriod:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" placeholder="e.g., 7 days" />
              </div>
            )}
            <div className="md:col-span-3">
              <label className="text-xs text-gray-700">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" rows="3" />
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const VaccinationSchedule = () => {
    const isMeat = activeBusiness === 'meat';
    const storageKey = isMeat ? 'production_vaccination_meat' : 'production_vaccination_eggs';
    const [records, setRecords] = React.useState(() => JSON.parse(localStorage.getItem(storageKey) || '[]'));
    const [form, setForm] = React.useState({
      date: new Date().toISOString().slice(0,10),
      vaccine: '',
      method: '',
      notes: ''
    });
    const submit = (e) => {
      e.preventDefault();
      if (!form.vaccine) return;
      const rec = { id: Date.now(), ...form };
      const next = [...records, rec];
      localStorage.setItem(storageKey, JSON.stringify(next));
      setRecords(next);
      window.dispatchEvent(new CustomEvent('dataUpdated'));
      setForm({ date: new Date().toISOString().slice(0,10), vaccine: '', method: '', notes: '' });
    };
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">Record Vaccination</div>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-700">Date</label>
              <DateInput value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Vaccine</label>
              <input type="text" value={form.vaccine} onChange={e=>setForm({...form,vaccine:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" required />
            </div>
            <div>
              <label className="text-xs text-gray-700">Method</label>
              <input type="text" value={form.method} onChange={e=>setForm({...form,method:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" placeholder="e.g., spray, water" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-700">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" rows="3" />
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ProductionPerformance = () => {
    const isMeat = activeBusiness === 'meat';
    if (isMeat) {
      const proc = JSON.parse(localStorage.getItem('production_chicken_processing') || '[]');
      const feed = JSON.parse(localStorage.getItem('production_feed_meat') || '[]');
      const mortality = JSON.parse(localStorage.getItem('production_mortality_meat') || '[]');
      const totalProcessedWeight = proc.reduce((s,r)=>s+((r.birdsProcessed||0)*(r.avgWeightKg||0)),0);
      const totalFeedKg = feed.reduce((s,r)=>s+(r.quantityKg||0),0);
      const fcr = totalProcessedWeight > 0 ? (totalFeedKg / totalProcessedWeight) : 0;
      const totalDeaths = mortality.reduce((s,r)=>s+(r.count||0),0);
      const totalProcessedBirds = proc.reduce((s,r)=>s+(r.birdsProcessed||0),0);
      const mortalityRate = totalProcessedBirds > 0 ? (totalDeaths / totalProcessedBirds) * 100 : 0;
      const avgWeight = (() => {
        const weights = proc.map(r=>Number(r.avgWeightKg||0)).filter(n=>n>0);
        if (!weights.length) return 0;
        return weights.reduce((s,n)=>s+n,0)/weights.length;
      })();
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">FCR</div>
            <div className="text-xl font-bold text-gray-900">{fcr.toFixed(2)}</div>
          </div>
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Mortality Rate</div>
            <div className="text-xl font-bold text-gray-900">{mortalityRate.toFixed(2)}%</div>
          </div>
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Average Weight</div>
            <div className="text-xl font-bold text-gray-900">{avgWeight.toFixed(2)} kg</div>
          </div>
        </div>
      );
    } else {
      const eggs = JSON.parse(localStorage.getItem('production_egg_production') || '[]');
      const feed = JSON.parse(localStorage.getItem('production_feed_eggs') || '[]');
      const totalEggs = eggs.reduce((s,r)=>s+(r.eggsCollected||0),0);
      const totalTrays = eggs.reduce((s,r)=>s+(r.trays||0),0);
      const layingRate = totalTrays > 0 ? (totalEggs / totalTrays) : 0;
      const totalFeedCost = feed.reduce((s,r)=>s+((r.quantityKg||0)*(r.costPerKg||0)),0);
      const costPerTray = totalTrays > 0 ? (totalFeedCost / totalTrays) : 0;
      const eggsPerBird = 0;
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Laying Rate (eggs/tray)</div>
            <div className="text-xl font-bold text-gray-900">{layingRate.toFixed(2)}</div>
          </div>
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Eggs per Bird</div>
            <div className="text-xl font-bold text-gray-900">{eggsPerBird.toFixed(2)}</div>
          </div>
          <div className="bg-white border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Cost per Tray</div>
            <div className="text-xl font-bold text-gray-900">TSH {costPerTray.toFixed(0)}</div>
          </div>
        </div>
      );
    }
  };

  const InventoryReport = () => {
    const [version, setVersion] = useState(0);
    const [tab, setTab] = useState('all');
    const [query, setQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [inventoryItemsForReport, setInventoryItemsForReport] = useState([]);
    const [stockMovementsForReport, setStockMovementsForReport] = useState([]);

    useEffect(() => {
      let alive = true;
      const load = async () => {
        try {
          const snapshot = await productsApi.loadInventorySnapshot();
          const items = snapshot?.items;
          if (!alive) return;
          setInventoryItemsForReport(Array.isArray(items) ? items : []);
        } catch {
          if (!alive) return;
          setInventoryItemsForReport([]);
        }
        try {
          const snapshot = await productsApi.loadInventorySnapshot();
          const rows = snapshot?.movements;
          if (!alive) return;
          setStockMovementsForReport(Array.isArray(rows) ? rows : []);
        } catch {
          if (!alive) return;
          setStockMovementsForReport([]);
        }
      };
      const onData = () => {
        setVersion((v) => v + 1);
        void load();
      };
      void load();
      window.addEventListener('dataUpdated', onData);
      return () => {
        alive = false;
        window.removeEventListener('dataUpdated', onData);
      };
    }, []);

    const colors = useMemo(() => ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#22C55E', '#F97316'], []);

    const computed = useMemo(() => {
      const cacheBuster = version;
      const norm = (s) => String(s || '').trim().toLowerCase();
      const items = (Array.isArray(inventoryItemsForReport) ? inventoryItemsForReport : []).filter((it) =>
        String(it?.name || it?.itemName || it?.productName || '').trim()
      );
      const knownKeys = new Set(items.map((it) => norm(it?.name || it?.itemName || it?.productName)));
      const stockAll = Array.isArray(stockMovementsForReport) ? stockMovementsForReport : [];

      const inByName = {};
      const outByName = {};
      stockAll.forEach((r) => {
        const key = norm(r?.itemName || r?.name || r?.productName);
        if (!key) return;
        const qty = Number(r?.quantity || 0) || 0;
        if (!qty) return;
        if (isInventoryMovementOut(r)) outByName[key] = (outByName[key] || 0) + qty;
        else if (isInventoryMovementIn(r)) inByName[key] = (inByName[key] || 0) + qty;
      });

      const defaultMin = (() => {
        try {
          const stored = localStore.get('systemPreferences:default', null);
          const v = stored?.inventory?.lowStockThreshold ?? stored?.inventory?.defaultLowStockThreshold ?? null;
          const n = Number(v);
          return Number.isFinite(n) && n > 0 ? n : 10;
        } catch {
          return 10;
        }
      })();

      const rows = items.map((it) => {
        const name = String(it.name || it.itemName || it.productName || '').trim();
        const category = String(it.category || it.itemType || it.group || '').trim();
        const unit = String(it.unit || it.unitName || it.measurementUnit || '').trim();
        const baseQty = Number(it.qty ?? it.quantity ?? it.stock ?? it.stockLevel ?? 0);
        const minLevelRaw = Number(it.reorderLevel ?? it.minLevel ?? it.lowStockLevel ?? defaultMin);
        const minLevel = Number.isFinite(minLevelRaw) && minLevelRaw >= 0 ? minLevelRaw : defaultMin;
        const selling = Number(it.sellingPrice ?? it.unitPrice ?? it.price ?? 0);
        const key = norm(name);
        const movementKnown = Object.prototype.hasOwnProperty.call(inByName, key) || Object.prototype.hasOwnProperty.call(outByName, key);
        const qty = movementKnown ? (inByName[key] || 0) - (outByName[key] || 0) : baseQty;
        const unitPrice = Number.isFinite(selling) ? selling : 0;
        const totalValue = Math.max(0, Number(qty || 0)) * unitPrice;
        const status = qty <= 0 ? 'out' : qty <= minLevel ? 'low' : 'in';
        return {
          id: String(it.id || it.sku || it.barcode || name || Math.random()),
          name,
          category: category || 'Uncategorized',
          unit,
          qty: Number.isFinite(qty) ? qty : 0,
          minLevel,
          unitPrice,
          totalValue,
          status
        };
      });

      const totals = rows.reduce(
        (acc, r) => {
          acc.products += r.name ? 1 : 0;
          acc.units += Math.max(0, r.qty);
          acc.low += r.status === 'low' ? 1 : 0;
          acc.out += r.status === 'out' ? 1 : 0;
          acc.value += r.totalValue;
          return acc;
        },
        { products: 0, units: 0, low: 0, out: 0, value: 0 }
      );

      const categories = {};
      rows.forEach((r) => {
        const k = r.category || 'Other';
        if (!categories[k]) categories[k] = { category: k, count: 0, value: 0 };
        categories[k].count += 1;
        categories[k].value += r.totalValue;
      });
      const categoryList = Object.values(categories).sort((a, b) => b.count - a.count);

      const toMonthId = (d) => {
        const t = Date.parse(String(d || ''));
        const dt = Number.isFinite(t) ? new Date(t) : null;
        if (!dt) return '';
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      };

      const now = new Date();
      const monthIds = Array.from({ length: 6 }).map((_, i) => {
        const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      });

      const trend = monthIds.map((m) => ({ month: m, stockIn: 0, stockOut: 0, net: 0 }));
      const idx = Object.fromEntries(trend.map((t, i) => [t.month, i]));

      stockAll.forEach((r) => {
        const m = toMonthId(r.date || r.createdAt || r.timestamp || r.ts);
        const i = idx[m];
        if (i == null) return;
        const qty = Number(r?.quantity || 0) || 0;
        if (!qty) return;
        if (isInventoryMovementOut(r)) trend[i].stockOut += qty;
        else if (isInventoryMovementIn(r)) trend[i].stockIn += qty;
      });
      trend.forEach((t) => {
        t.net = t.stockIn - t.stockOut;
      });

      const currentMonth = monthIds[monthIds.length - 1];
      const fastestMap = {};
      stockAll.forEach((r) => {
        if (!isInventoryMovementOut(r)) return;
        const m = toMonthId(r.date || r.createdAt || r.timestamp || r.ts);
        if (m !== currentMonth) return;
        const key = norm(r?.itemName || r?.name || r?.productName);
        if (!key || !knownKeys.has(key)) return;
        if (!fastestMap[key]) fastestMap[key] = { name: String(r?.itemName || r?.name || r?.productName || '').trim(), qty: 0, category: '' };
        fastestMap[key].qty += Number(r.quantity || 0);
      });
      const fastest = Object.values(fastestMap)
        .filter((x) => x.name)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 6);

      return { rows, totals, categoryList, trend, fastest, cacheBuster };
    }, [inventoryItemsForReport, stockMovementsForReport, version]);

    const donut = useMemo(() => {
      const total = computed.categoryList.reduce((s, c) => s + c.count, 0) || 1;
      let acc = 0;
      const segments = computed.categoryList.slice(0, 6).map((c, i) => {
        const start = (acc / total) * 100;
        acc += c.count;
        const end = (acc / total) * 100;
        return `${colors[i % colors.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      });
      const used = computed.categoryList.slice(0, 6).reduce((s, c) => s + c.count, 0);
      if (used < total) segments.push(`#E5E7EB ${(used / total) * 100}% 100%`);
      return `conic-gradient(${segments.join(', ')})`;
    }, [computed.categoryList, colors]);

    const filteredRows = useMemo(() => {
      const q = String(query || '').trim().toLowerCase();
      return computed.rows
        .filter((r) => {
          if (!r.name) return false;
          if (categoryFilter !== 'all' && String(r.category || '') !== categoryFilter) return false;
          if (tab === 'in' && r.status !== 'in') return false;
          if (tab === 'low' && r.status !== 'low') return false;
          if (tab === 'out' && r.status !== 'out') return false;
          if (q && !String(r.name || '').toLowerCase().includes(q) && !String(r.category || '').toLowerCase().includes(q)) return false;
          return true;
        })
        .sort((a, b) => {
          if (sortBy === 'stock') return b.qty - a.qty;
          if (sortBy === 'value') return b.totalValue - a.totalValue;
          return String(a.name || '').localeCompare(String(b.name || ''));
        });
    }, [computed.rows, categoryFilter, query, sortBy, tab]);

    const productsBar = useMemo(() => {
      const list = (computed.rows || []).filter((r) => String(r?.name || '').trim());
      const sorted = list.slice().sort((a, b) => Number(b.qty || 0) - Number(a.qty || 0));
      const maxQty = sorted.reduce((m, r) => Math.max(m, Number(r.qty || 0)), 0) || 1;
      return { rows: sorted, maxQty };
    }, [computed.rows]);

    const money = (n) => {
      const v = Number(n || 0);
      if (!Number.isFinite(v)) return '0';
      return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    };

    const exportCsv = () => {
      const rows = filteredRows.map((r) => ({
        Product: r.name,
        Category: r.category,
        Stock: r.qty,
        UnitPrice: r.unitPrice,
        TotalValue: r.totalValue,
        Status: r.status === 'in' ? 'In Stock' : r.status === 'low' ? 'Low Stock' : 'Out of Stock'
      }));
      const cols = ['Product', 'Category', 'Stock', 'UnitPrice', 'TotalValue', 'Status'];
      const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
      const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="inventory-report space-y-6">
        <style>{`
          .report-print-only { display: none; }
          @media print {
            @page { size: landscape; margin: 12mm; }
            body * { visibility: hidden !important; }
            .report-print-scope, .report-print-scope * { visibility: visible !important; }
            .report-print-scope { position: absolute !important; inset: 0 !important; padding: 16px !important; background: white !important; }
            .report-no-print { display: none !important; }
            .report-print-only { display: block !important; }
          }
        `}</style>
        <div className="flex items-center justify-end gap-2 flex-wrap">
            <button type="button" className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50" onClick={exportCsv}>
              Export
            </button>
            <button type="button" className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700" onClick={() => window.print()}>
              Print
            </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-lg font-extrabold text-gray-900">Stock Overview</div>
              <div className="text-xs text-gray-500">Last updated: {new Date().toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'in', label: 'In Stock' },
                { id: 'low', label: 'Low Stock' },
                { id: 'out', label: 'Out of Stock' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={tab === t.id ? 'px-4 py-2 rounded-2xl bg-gray-900 text-white text-sm font-semibold' : 'px-4 py-2 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-gray-50'}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-700">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div className="mt-4 text-2xl font-extrabold text-gray-900">{money(computed.totals.products)}</div>
              <div className="text-xs text-gray-600">Total Products</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Scale className="w-5 h-5" />
              </div>
              <div className="mt-4 text-2xl font-extrabold text-gray-900">{money(computed.totals.units)}</div>
              <div className="text-xs text-gray-600">Total Units In Stock</div>
            </div>
            <div className="bg-white rounded-2xl border border-orange-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="mt-4 text-2xl font-extrabold text-gray-900">{money(computed.totals.low)}</div>
              <div className="text-xs text-orange-700 font-semibold">Low Stock Items</div>
            </div>
            <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
                <XCircle className="w-5 h-5" />
              </div>
              <div className="mt-4 text-2xl font-extrabold text-gray-900">{money(computed.totals.out)}</div>
              <div className="text-xs text-red-700 font-semibold">Out of Stock</div>
            </div>
            <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                <HandCoins className="w-5 h-5" />
              </div>
              <div className="mt-4 text-2xl font-extrabold text-gray-900">{money(computed.totals.value)}</div>
              <div className="text-xs text-gray-600">Total Stock Value (TZS)</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="report-print-scope lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="report-print-only">
                  <div className="text-lg font-semibold text-gray-900">Inventory Report</div>
                </div>
                <div className="report-no-print text-base font-extrabold text-gray-900">Product Inventory</div>
              </div>
              <div className="report-no-print text-sm text-gray-600 font-semibold">View all →</div>
            </div>
            <div className="p-5">
              <div className="report-no-print flex items-center gap-3 flex-wrap">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 min-w-[220px] px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-800"
                >
                  <option value="all">All Categories</option>
                  {computed.categoryList.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-800"
                >
                  <option value="name">Sort by: Name</option>
                  <option value="stock">Sort by: Stock</option>
                  <option value="value">Sort by: Value</option>
                </select>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 tracking-wider">
                      <th className="text-left py-3 px-2 font-extrabold">PRODUCT</th>
                      <th className="text-left py-3 px-2 font-extrabold">CATEGORY</th>
                      <th className="text-left py-3 px-2 font-extrabold">STOCK LEVEL</th>
                      <th className="text-right py-3 px-2 font-extrabold">UNIT PRICE</th>
                      <th className="text-right py-3 px-2 font-extrabold">TOTAL VALUE</th>
                      <th className="text-right py-3 px-2 font-extrabold">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.slice(0, 10).map((r) => {
                      const pct = r.minLevel > 0 ? Math.max(0, Math.min(100, (r.qty / (r.minLevel * 2)) * 100)) : 0;
                      const barColor = r.status === 'out' ? 'bg-red-500' : r.status === 'low' ? 'bg-orange-500' : 'bg-green-500';
                      const statusPill =
                        r.status === 'in'
                          ? 'bg-green-50 border border-green-200 text-green-700'
                          : r.status === 'low'
                          ? 'bg-orange-50 border border-orange-200 text-orange-700'
                          : 'bg-red-50 border border-red-200 text-red-700';
                      return (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <div className="font-extrabold text-gray-900">{r.name || '—'}</div>
                            <div className="text-xs text-gray-500">{r.unit ? `Unit: ${r.unit}` : ''}</div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
                              {r.category}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-extrabold text-gray-900 whitespace-nowrap">{money(r.qty)} {r.unit || ''}</div>
                              <div className="flex-1 max-w-[180px] h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div className={`h-2 ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-semibold text-gray-900">TZS {money(r.unitPrice)}</td>
                          <td className="py-3 px-2 text-right font-extrabold text-gray-900">TZS {money(r.totalValue)}</td>
                          <td className="py-3 px-2 text-right">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold ${statusPill}`}>
                              {r.status === 'in' ? 'In Stock' : r.status === 'low' ? 'Low Stock' : 'Out of Stock'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredRows.length ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-sm text-gray-600">
                          No products found. Add products in Products & Store.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-base font-extrabold text-gray-900">Stock by Category</div>
              <div className="text-sm text-gray-600 font-semibold">{money(computed.totals.products)} Products</div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center">
                <div className="relative w-44 h-44 rounded-full" style={{ background: donut }}>
                  <div className="absolute inset-5 rounded-full bg-white flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-extrabold text-gray-900">{money(computed.totals.products)}</div>
                      <div className="text-xs text-gray-600 font-semibold">Products</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                {computed.categoryList.slice(0, 6).map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-gray-700 font-semibold truncate">{c.category}</span>
                    </div>
                    <div className="text-gray-700 font-semibold">{money(c.count)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-base font-extrabold text-gray-900">Stock by Product</div>
              <div className="text-sm text-gray-600 font-semibold">{money(computed.totals.products)} products</div>
            </div>
            <div className="p-6">
              <div className="max-h-[320px] overflow-auto pr-2 space-y-3">
                {productsBar.rows.map((r) => {
                  const qty = Math.max(0, Number(r.qty || 0));
                  const pct = Math.max(0, Math.min(100, (qty / productsBar.maxQty) * 100));
                  return (
                    <div key={r.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 text-sm font-extrabold text-gray-900 truncate">{r.name}</div>
                        <div className="text-sm font-extrabold text-gray-900">{money(qty)}</div>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-green-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {productsBar.rows.length === 0 ? <div className="text-sm text-gray-600">No products found</div> : null}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-base font-extrabold text-gray-900">Fastest Moving Items</div>
              <div className="text-sm text-green-700 font-semibold">This month</div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {computed.fastest.length ? (
                  computed.fastest.map((x, i) => (
                    <div key={`${x.name}-${i}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-xs font-extrabold text-gray-700">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-gray-900 truncate">{x.name}</div>
                          <div className="text-xs text-gray-500">Units/month</div>
                        </div>
                      </div>
                      <div className="text-sm font-extrabold text-gray-900">{money(x.qty)} sold</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600">No stock-out records yet. Sales and stock-out updates will appear here.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SalesOrder = () => {
    const navigate = useNavigate();
    const SO_PAD = 6;
    const INV_PAD = 4;
    const getNowTime = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    };
    const nextSoInit = (() => {
      try {
        const v = parseInt(localStorage.getItem('nextSoNumber') || '1150', 10);
        return Number.isFinite(v) ? v : 1150;
      } catch { return 1150; }
    })();
    const nextInvInit = (() => {
      try {
        const v = parseInt(localStorage.getItem('nextInvoiceNumber') || '1', 10);
        return Number.isFinite(v) ? v : 1;
      } catch { return 1; }
    })();
    const [header, setHeader] = useState({
      orderNumber: String(nextSoInit).padStart(SO_PAD, '0'),
      orderDate: new Date().toISOString().slice(0,10),
      orderTime: getNowTime(),
      terms: 'Net 30',
      invoiceNumber: String(nextInvInit).padStart(INV_PAD, '0')
    });
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [vatEnabled, setVatEnabled] = useState(false);
    const VAT_RATE = 0.18;
    const [usdEnabled, setUsdEnabled] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem('salesOrderUsdEnabled') || 'false');
      } catch {
        return false;
      }
    });
    const [usdRate, setUsdRate] = useState(() => {
      try {
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return localStorage.getItem(`usdToTzsRate:${ym}`) || localStorage.getItem('usdToTzsRate') || '';
      } catch {
        return '';
      }
    });
    const [customers, setCustomers] = useState([]);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showCustomerMenu, setShowCustomerMenu] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [newCustomer, setNewCustomer] = useState({
      company: '',
      prefix: '',
      firstName: '',
      middle: '',
      lastName: '',
      jobTitle: '',
      mainPhone: '',
      workPhone: '',
      mobile: '',
      fax: '',
      mainEmail: '',
      ccEmail: '',
      website: '',
      other1: '',
      address: '',
      city: '',
      country: '',
      taxId: '',
      billTo: '',
      shipTo: '',
      defaultShipTo: true
    });
    const [customer, setCustomer] = useState({
      name: '',
      email: '',
      phone: '',
      billTo: '',
      shipTo: ''
    });
    const [items, setItems] = useState([
      { item: '', description: '', unit: 'try', qty: 1, rate: 0 }
    ]);
    const [productMenu, setProductMenu] = useState({ visible: false, row: -1, direction: 'down', x: 0, y: 0, width: 320 });
    const [productQuery, setProductQuery] = useState('');
    const [productCatalog, setProductCatalog] = useState([]);
    const [salesOrderStockMovements, setSalesOrderStockMovements] = useState([]);
    const [clipboard, setClipboard] = useState(null);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, row: -1, key: '' });
    const [clipboardRow, setClipboardRow] = useState(null);
    const [unitMenu, setUnitMenu] = useState({ visible: false, row: -1, direction: 'down', x: 0, y: 0, width: 112 });
    const [activeBusiness, setActiveBusiness] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem('activeBusiness') || '"eggs"');
      } catch {
        return 'eggs';
      }
    });
    const loadCustomers = useCallback(async () => {
      try {
        const list = await customersApi.list();
        setCustomers(Array.isArray(list) ? list : []);
      } catch {
        setCustomers([]);
      }
    }, []);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [paid, setPaid] = useState(false);
    const [saveLoading, setSaveLoading] = useState('');
    const unitOptions = UNIT_OPTIONS;
    const usdRateMonthId = useMemo(() => {
      const d = String(header?.orderDate || '').slice(0, 10);
      const t = Date.parse(`${d}T00:00:00`);
      const dt = Number.isFinite(t) ? new Date(t) : new Date();
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    }, [header?.orderDate]);
    const usdRateStorageKey = useMemo(() => `usdToTzsRate:${usdRateMonthId}`, [usdRateMonthId]);
    const prevUsdRateMonthId = useMemo(() => {
      const m = String(usdRateMonthId || '').match(/^(\d{4})-(\d{2})$/);
      if (!m) return '';
      const y = Number(m[1]);
      const mm = Number(m[2]);
      if (!Number.isFinite(y) || !Number.isFinite(mm) || mm < 1 || mm > 12) return '';
      const prevMm = mm === 1 ? 12 : mm - 1;
      const prevY = mm === 1 ? y - 1 : y;
      return `${prevY}-${String(prevMm).padStart(2, '0')}`;
    }, [usdRateMonthId]);
    const usdRateKeyRef = React.useRef(usdRateStorageKey);
    React.useEffect(() => {
      usdRateKeyRef.current = usdRateStorageKey;
    }, [usdRateStorageKey]);
    const exchangeRate = useMemo(() => {
      const raw = String(usdRate || '').replace(/,/g, '');
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }, [usdRate]);
    const currencyPrefix = usdEnabled ? 'USD' : 'TSH';
    const businessIdForPrefs = useMemo(() => {
      const role = String(currentUser?.role || '').toLowerCase();
      if (role === 'staff') return String(currentUser?.businessId || '');
      return String(currentUser?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.businessId, currentUser?.id, currentUser?.role]);
    const allowNegativeStock = useMemo(() => {
      const key = `systemPreferences:${businessIdForPrefs || 'default'}`;
      try {
        const prefs = localStore.get(key, null);
        return Boolean(prefs?.sales?.allowNegativeStock);
      } catch {
        return false;
      }
    }, [businessIdForPrefs]);
    const totals = useMemo(() => {
      const subtotal = items.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
      const tax = vatEnabled ? subtotal * VAT_RATE : 0;
      const shipping = 0;
      const total = subtotal + tax + shipping;
      return { subtotal, tax, shipping, total };
    }, [items, vatEnabled]);
    const totalsTzs = useMemo(() => {
      if (!usdEnabled) return totals.total;
      if (!exchangeRate) return null;
      return totals.total * exchangeRate;
    }, [exchangeRate, totals.total, usdEnabled]);
    const formatMoney = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n.toLocaleString() : '0';
    };
    const shareTotalText = useMemo(() => {
      if (!usdEnabled) return `TSH ${formatMoney(totals.total)}`;
      if (!exchangeRate) return `USD ${formatMoney(totals.total)} (TZS —)`;
      return `USD ${formatMoney(totals.total)} (TSH ${formatMoney(totalsTzs)} @ ${formatMoney(exchangeRate)})`;
    }, [exchangeRate, totals.total, totalsTzs, usdEnabled]);

    const loadProductCatalogFromStorage = React.useCallback(() => {
      Promise.resolve()
        .then(async () => {
          const items = await productsApi.list().catch(() => []);
          const arr = Array.isArray(items) ? items : [];
          const filtered = arr
            .filter((p) => {
              const name = String(p?.name || p?.itemName || '').trim();
              return Boolean(name);
            })
            .filter((p) => !Boolean(p?.isStoreOnly));
          setProductCatalog(filtered);
        })
        .catch(() => {
          setProductCatalog([]);
        });
    }, []);

    const loadSalesOrderMovementsFromStorage = React.useCallback(() => {
      Promise.resolve()
        .then(async () => {
          const snapshot = await productsApi.loadInventorySnapshot();
          const rows = Array.isArray(snapshot?.movements) ? snapshot.movements : [];
          setSalesOrderStockMovements(rows);
        })
        .catch(() => {
          setSalesOrderStockMovements([]);
        });
    }, []);
    const companyInfo = useMemo(() => {
      return localStore.get('companyInfo', {}) || {};
    }, []);
    const dueDate = useMemo(() => {
      const base = String(header.orderDate || '').slice(0, 10);
      if (!base) return '';
      const days = (() => {
        const m = String(header.terms || '').match(/(\d+)/);
        const n = m ? Number(m[1]) : 0;
        return Number.isFinite(n) ? n : 0;
      })();
      if (!days) return '';
      const d = new Date(`${base}T00:00:00`);
      if (Number.isNaN(d.getTime())) return '';
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    }, [header.orderDate, header.terms]);
    const printItems = useMemo(() => {
      return (Array.isArray(items) ? items : []).map((r) => {
        const qty = Number(r.qty) || 0;
        const rate = Number(r.rate) || 0;
        const amount = qty * (Number(r.rate) || 0);
        return { item: r.item, qty, unit: r.unit, rate, amount };
      });
    }, [items]);

    React.useEffect(() => {
      void loadCustomers();
    }, [loadCustomers]);
    React.useEffect(() => {
      try {
        const chosen = JSON.parse(localStorage.getItem('selectedCustomerForOrder') || 'null');
        if (chosen) {
          setCustomer(mapCustomerToContactFields(chosen));
          localStorage.removeItem('selectedCustomerForOrder');
        }
      } catch {}
    }, []);
    React.useEffect(() => {
      try {
        const raw = localStorage.getItem('selectedProductForSale') || '';
        if (!raw) return;
        const sel = JSON.parse(raw);
        if (!sel || typeof sel !== 'object') return;
        const productName = String(sel.productName || '').trim();
        const unit = String(sel.unit || '').trim();
        const rate = (() => {
          const n = typeof sel.price === 'number' ? sel.price : parseFloat(String(sel.price || '').replace(/,/g, ''));
          return Number.isFinite(n) ? n : 0;
        })();
        if (productName) {
          setItems((prev) => {
            const next = Array.isArray(prev) && prev.length ? prev.slice() : [{ item: '', description: '', unit: 'try', qty: 1, rate: 0 }];
            next[0] = { ...next[0], item: productName, unit: unit || next[0].unit, rate };
            return next;
          });
        }
        const type = String(sel.productType || '').trim().toLowerCase();
        if (type === 'eggs' || type === 'chickens') {
          const mapped = type === 'chickens' ? 'meat' : 'eggs';
          setActiveBusiness(mapped);
          try {
            localStorage.setItem('activeBusiness', JSON.stringify(mapped));
          } catch {}
        }
        localStorage.removeItem('selectedProductForSale');
      } catch {}
    }, []);
    React.useEffect(() => {
      const handler = () => {
        void loadCustomers();
        try {
          const chosen = JSON.parse(localStorage.getItem('selectedCustomerForOrder') || 'null');
          if (chosen) {
            setCustomer(mapCustomerToContactFields(chosen));
            localStorage.removeItem('selectedCustomerForOrder');
          }
        } catch {}
      };
      window.addEventListener('dataUpdated', handler);
      return () => window.removeEventListener('dataUpdated', handler);
    }, [loadCustomers]);
    React.useEffect(() => {
      const onData = () => {
        loadProductCatalogFromStorage();
        loadSalesOrderMovementsFromStorage();
      };
      loadProductCatalogFromStorage();
      loadSalesOrderMovementsFromStorage();
      window.addEventListener('dataUpdated', onData);
      return () => {
        window.removeEventListener('dataUpdated', onData);
      };
    }, [loadProductCatalogFromStorage, loadSalesOrderMovementsFromStorage]);
    const productStock = useMemo(() => {
      const norm = (v) => String(v || '').trim().toLowerCase();
      const normalizeType = (raw) => {
        const t = String(raw || '').trim().toLowerCase();
        if (!t) return 'general';
        if (t === 'meat') return 'chickens';
        return t;
      };

      const metaByCompound = new Map();
      const typeByNameKey = new Map();
      const types = new Set();

      (Array.isArray(productCatalog) ? productCatalog : []).forEach((p) => {
        const displayName = String(p?.name || p?.itemName || '').trim();
        const nameKey = norm(displayName);
        if (!nameKey) return;
        const typeKey = normalizeType(p?.category || p?.itemType || 'general');
        types.add(typeKey);
        if (!typeByNameKey.has(nameKey)) typeByNameKey.set(nameKey, typeKey);
        const compound = `${typeKey}__${nameKey}`;
        if (!metaByCompound.has(compound)) {
          const baseQtyRaw = String(p?.qty ?? p?.quantity ?? 0).replace(/,/g, '');
          const baseQty = parseFloat(baseQtyRaw);
          metaByCompound.set(compound, {
            name: displayName,
            nameKey,
            typeKey,
            unit: String(p?.unit || '').trim(),
            baseQty: Number.isFinite(baseQty) ? baseQty : 0
          });
        }
      });

      const inByCompound = new Map();
      const outByCompound = new Map();
      const seen = new Set();
      const inAny = new Map();
      const outAny = new Map();
      const seenAny = new Set();

      (Array.isArray(salesOrderStockMovements) ? salesOrderStockMovements : []).forEach((m) => {
        const rawName = String(m?.itemName || '').trim();
        const nameKey = norm(rawName);
        if (!nameKey) return;
        const qty = Number(m?.quantity || 0) || 0;
        if (!qty) return;
        const typeKey = normalizeType(m?.itemType || typeByNameKey.get(nameKey) || 'general');
        const compound = `${typeKey}__${nameKey}`;
        if (!metaByCompound.has(compound)) return;
        if (isInventoryMovementOut(m)) outByCompound.set(compound, (outByCompound.get(compound) || 0) + qty);
        else if (isInventoryMovementIn(m)) inByCompound.set(compound, (inByCompound.get(compound) || 0) + qty);
        seen.add(compound);
        if (isInventoryMovementOut(m)) outAny.set(nameKey, (outAny.get(nameKey) || 0) + qty);
        else if (isInventoryMovementIn(m)) inAny.set(nameKey, (inAny.get(nameKey) || 0) + qty);
        seenAny.add(nameKey);
      });

      const remainByCompound = new Map();
      metaByCompound.forEach((m, compound) => {
        const base = Number(m?.baseQty || 0) || 0;
        const qtyIn = inByCompound.get(compound) || 0;
        const qtyOut = outByCompound.get(compound) || 0;
        const remain = seen.has(compound) ? qtyIn - qtyOut : base;
        remainByCompound.set(compound, remain);
      });

      const getTypeForName = (name) => {
        const key = norm(name);
        return normalizeType(typeByNameKey.get(key) || 'general');
      };
      const getUnitForName = (name) => {
        const nameKey = norm(name);
        const typeKey = getTypeForName(name);
        const compound = `${typeKey}__${nameKey}`;
        return String(metaByCompound.get(compound)?.unit || '').trim();
      };
      const getRemain = (name, typeOverride) => {
        const nameKey = norm(name);
        const typeKey = normalizeType(typeOverride || getTypeForName(nameKey));
        const compound = `${typeKey}__${nameKey}`;
        if (seen.has(compound)) return remainByCompound.get(compound);
        if (seenAny.has(nameKey)) return (inAny.get(nameKey) || 0) - (outAny.get(nameKey) || 0);
        return remainByCompound.get(compound);
      };

      return { norm, normalizeType, getTypeForName, getUnitForName, getRemain, remainByCompound };
    }, [productCatalog, salesOrderStockMovements]);
    React.useEffect(() => {
      const handler = () => {
        try {
          const t = JSON.parse(localStorage.getItem('activeBusiness') || '"eggs"');
          setActiveBusiness(t === 'meat' ? 'meat' : 'eggs');
        } catch {
          setActiveBusiness('eggs');
        }
      };
      window.addEventListener('activeBusinessChanged', handler);
      return () => window.removeEventListener('activeBusinessChanged', handler);
    }, []);
    React.useEffect(() => {
      try {
        const sel = JSON.parse(localStorage.getItem('selectedOrderForEdit') || 'null');
        if (sel) {
          setEditingOrderId(sel.id || null);
          const isPersistedSale = sel._sourceType === 'sale' || Boolean(sel.persisted);
          const isUsdSale = Boolean(sel.usdEnabled) || String(sel.currency || '').toUpperCase() === 'USD';
          const selectedUsdRate = Number(sel.usdRate ?? sel.exchangeRate) || 0;
          const dateTime = String(sel.orderDateTime || sel.createdAt || sel.orderDate || '').trim();
          const timePart = (() => {
            if (!dateTime) return '';
            const m = dateTime.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
            if (m) return `${m[1]}:${m[2]}:${m[3] || '00'}`;
            const m2 = dateTime.match(/\b(\d{2}):(\d{2})(?::(\d{2}))?\b/);
            if (m2) return `${m2[1]}:${m2[2]}:${m2[3] || '00'}`;
            return '';
          })();
          setHeader(prev => ({
            orderNumber: sel.orderNumber || sel.saleNumber || prev.orderNumber,
            orderDate: (sel.orderDate || '').slice(0,10) || prev.orderDate,
            orderTime: timePart || '00:00:00',
            terms: sel.terms || sel.paymentTerms || prev.terms,
            invoiceNumber: sel.invoiceNumber || prev.invoiceNumber
          }));
          setPaid((sel.status || '') === 'Paid');
          setPaymentMethod(String(sel.paymentMethod || '').trim() || 'cash');
          setUsdEnabled(isUsdSale);
          setUsdRate(isUsdSale && selectedUsdRate > 0 ? String(selectedUsdRate) : '');
          setCustomer({
            name: sel.customerName || sel.customer || sel.name || '',
            email: sel.email || sel.customerEmail || '',
            phone: sel.phone || sel.customerPhone || '',
            billTo: sel.billTo || '',
            shipTo: sel.shipTo || ''
          });
          const nextItems = (Array.isArray(sel.items) ? sel.items : []).map((it) => {
            const quantity = Number(it?.qty ?? it?.quantity) || 0;
            const storedRate = Number(it?.rate ?? it?.unitPrice ?? it?.price) || 0;
            const rate = isPersistedSale && isUsdSale && selectedUsdRate > 0 ? storedRate / selectedUsdRate : storedRate;
            return {
              item: it?.item || it?.productName || '',
              description: it?.description || '',
              unit: it?.unit || 'try',
              qty: quantity,
              rate
            };
          });
          setItems(nextItems.length ? nextItems : [{ item: '', description: '', unit: 'try', qty: 1, rate: 0 }]);
          localStorage.removeItem('selectedOrderForEdit');
        }
      } catch {}
    }, []);
    React.useEffect(() => {
      if (editingOrderId) return;
      const id = window.setInterval(() => {
        setHeader((prev) => ({ ...prev, orderTime: getNowTime() }));
      }, 30000);
      return () => window.clearInterval(id);
    }, [editingOrderId]);
    React.useEffect(() => {
      try {
        localStorage.setItem('salesOrderUsdEnabled', JSON.stringify(Boolean(usdEnabled)));
      } catch {}
    }, [usdEnabled]);
    React.useEffect(() => {
      if (editingOrderId) return;
      if (!usdEnabled) return;
      try {
        const currentKey = String(usdRateStorageKey || '').trim();
        const prevKey = prevUsdRateMonthId ? `usdToTzsRate:${prevUsdRateMonthId}` : '';
        let v = (currentKey ? localStorage.getItem(currentKey) : '') || '';
        if (!String(v || '').trim()) {
          v = (prevKey ? localStorage.getItem(prevKey) : '') || localStorage.getItem('usdToTzsRate') || '';
          if (String(v || '').trim() && currentKey) {
            try {
              localStorage.setItem(currentKey, String(v));
            } catch {}
          }
        }
        setUsdRate(String(v || ''));
      } catch {}
    }, [editingOrderId, prevUsdRateMonthId, usdEnabled, usdRateStorageKey]);
    React.useEffect(() => {
      try {
        const key = String(usdRateKeyRef.current || '').trim();
        if (key) localStorage.setItem(key, String(usdRate || ''));
        localStorage.setItem('usdToTzsRate', String(usdRate || ''));
      } catch {}
    }, [usdRate]);

    const setHeaderField = (k, v) => setHeader(prev => ({ ...prev, [k]: v }));
    const setCustomerField = (k, v) => setCustomer(prev => ({ ...prev, [k]: v }));
    const updateItem = (i, k, v) => {
      setItems(prev => prev.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
    };
    const addItem = () => setItems(prev => [...prev, { item: '', description: '', unit: 'try', qty: 1, rate: 0 }]);
    const addProductToOrder = (product, targetRowIndex) => {
      const name = String(product?.name || product?.itemName || '').trim();
      if (!name) return;
      const typeKey = productStock.normalizeType(product?.category || product?.itemType || 'general');
      const remain = productStock.getRemain(name, typeKey);
      const outOfStock = Number.isFinite(remain) ? remain <= 0 : false;
      void outOfStock;
      const unit = String(product?.unit || '').trim() || 'try';
      const rate = (() => {
        const raw = product?.sellingPrice ?? product?.sellPrice ?? product?.price ?? 0;
        const n = typeof raw === 'number' ? raw : parseFloat(String(raw || '').replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
      })();
      setItems((prev) => {
        const next = Array.isArray(prev) ? prev.slice() : [];
        const forcedIndex = Number.isFinite(targetRowIndex) && targetRowIndex >= 0 ? targetRowIndex : -1;
        const idx = forcedIndex >= 0 ? forcedIndex : next.findIndex((r) => !String(r?.item || '').trim());
        const row = { item: name, unit, qty: 1, rate };
        if (idx >= 0) next[idx] = { ...next[idx], ...row };
        else next.push(row);
        return next.length ? next : [row];
      });
      setProductQuery('');
      setProductMenu({ visible: false, row: -1, direction: 'down', x: 0, y: 0, width: 320 });
    };
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const insertRowAt = (index) => {
      setItems(prev => {
        const row = { item: '', description: '', unit: 'try', qty: 1, rate: 0 };
        const next = [...prev];
        next.splice(index, 0, row);
        return next;
      });
    };
    const insertRowBelow = (index) => insertRowAt(index + 1);
    const showMenu = (e, rowIndex, key) => {
      e.preventDefault();
      setContextMenu({ visible: true, x: e.pageX, y: e.pageY, row: rowIndex, key });
    };
    const hideMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
    const duplicateRow = (index) => {
      setItems(prev => {
        const next = [...prev];
        const dup = { ...next[index] };
        next.splice(index + 1, 0, dup);
        return next;
      });
    };
    const copyRow = (index) => {
      setClipboardRow(items[index] ? { ...items[index] } : null);
      hideMenu();
    };
    const pasteRow = (index) => {
      if (!clipboardRow) return;
      setItems(prev => prev.map((r, idx) => idx === index ? { ...clipboardRow } : r));
      hideMenu();
    };
    const clearRow = (index) => {
      setItems(prev => prev.map((r, idx) => idx === index ? { item: '', description: '', unit: 'try', qty: 0, rate: 0 } : r));
      hideMenu();
    };
    const moveRowUp = (index) => {
      if (index <= 0) return;
      setItems(prev => {
        const next = [...prev];
        const t = next[index - 1];
        next[index - 1] = next[index];
        next[index] = t;
        return next;
      });
      hideMenu();
    };
    const moveRowDown = (index) => {
      setItems(prev => {
        if (index < 0 || index >= prev.length - 1) return prev;
        const next = [...prev];
        const t = next[index + 1];
        next[index + 1] = next[index];
        next[index] = t;
        return next;
      });
      hideMenu();
    };
    const insertRowsBelow = (index, count) => {
      setItems(prev => {
        const next = [...prev];
        const rows = Array.from({ length: count }).map(()=>({ item: '', description: '', unit: 'try', qty: 1, rate: 0 }));
        next.splice(index + 1, 0, ...rows);
        return next;
      });
      hideMenu();
    };
    const addRowEnd = () => {
      setItems(prev => [...prev, { item: '', description: '', unit: 'try', qty: 1, rate: 0 }]);
      hideMenu();
    };
    const copyCell = () => {
      const { row, key } = contextMenu;
      if (row < 0) return;
      if (key === 'amount') {
        const amt = (Number(items[row].qty) || 0) * (Number(items[row].rate) || 0);
        setClipboard(String(amt));
      } else {
        setClipboard(String(items[row][key] ?? ''));
      }
      hideMenu();
    };
    const pasteCell = () => {
      const { row, key } = contextMenu;
      if (row < 0 || key === 'amount' || key === 'item' || clipboard == null) return;
      if (key === 'qty' || key === 'rate') {
        const num = Number(clipboard);
        updateItem(row, key, isNaN(num) ? 0 : num);
      } else {
        updateItem(row, key, clipboard);
      }
      hideMenu();
    };
    const clearCell = () => {
      setItems([{ item: '', description: '', unit: 'try', qty: 1, rate: 0 }]);
      hideMenu();
    };
    const clearForm = () => {
      setEditingOrderId(null);
      setHeader({
        orderNumber: String((() => { try { const v = parseInt(localStorage.getItem('nextSoNumber') || '1150', 10); return Number.isFinite(v) ? v : 1150; } catch { return 1150; } })()).padStart(SO_PAD, '0'),
        orderDate: new Date().toISOString().slice(0,10),
        orderTime: getNowTime(),
        terms: 'Net 30',
        invoiceNumber: String((() => { try { const v = parseInt(localStorage.getItem('nextInvoiceNumber') || '1', 10); return Number.isFinite(v) ? v : 1; } catch { return 1; } })()).padStart(INV_PAD, '0')
      });
      setCustomer({ name: '', email: '', phone: '', billTo: '', shipTo: '' });
      setItems([{ item: '', description: '', unit: 'try', qty: 1, rate: 0 }]);
      setPaid(false);
      setPaymentMethod('cash');
      try {
        localStorage.removeItem('selectedOrderForEdit');
      } catch {}
    };
    const saveOrder = async () => {
      const normName = (v) => String(v || '').trim().toLowerCase();
      const catalogKeys = new Set((Array.isArray(productCatalog) ? productCatalog : []).map((p) => normName(p?.name || p?.itemName || '')));
      const cleaned = (Array.isArray(items) ? items : [])
        .map((r) => ({
          item: String(r?.item || '').trim(),
          description: String(r?.description || ''),
          unit: String(r?.unit || 'try'),
          qty: Number(r?.qty) || 0,
          rate: Number(r?.rate) || 0
        }))
        .filter((r) => r.item || r.qty || r.rate || String(r.description || '').trim());

      const invalidBlank = cleaned.find((r) => !r.item && (r.qty > 0 || r.rate > 0 || String(r.description || '').trim()));
      if (invalidBlank) {
        window.alert('Please select item from Products before saving.');
        return false;
      }
      const invalidUnknown = cleaned.find((r) => r.item && !catalogKeys.has(normName(r.item)));
      if (invalidUnknown) {
        window.alert(`"${invalidUnknown.item}" is not in Products. Please select from Products.`);
        return false;
      }

      const resolved = cleaned
        .filter((r) => r.item)
        .map((r) => {
          const matchedProduct =
            (Array.isArray(productCatalog) ? productCatalog : []).find((p) => normName(p?.name || p?.itemName || '') === normName(r.item)) || null;
          const itemType = productStock.getTypeForName(r.item);
          const unitFromProduct = productStock.getUnitForName(r.item);
          return {
            ...r,
            itemType,
            productId: String(matchedProduct?.id || '').trim(),
            unit: unitFromProduct || r.unit
          };
        });
      if (!allowNegativeStock) {
        const insufficient = resolved.find((r) => {
          if (!r.item) return false;
          const remain = productStock.getRemain(r.item, r.itemType);
          if (!Number.isFinite(remain)) return false;
          return (Number(r.qty) || 0) > remain;
        });
        if (insufficient) {
          const remain = productStock.getRemain(insufficient.item, insufficient.itemType);
          window.alert(`"${insufficient.item}" is out of stock. Remaining: ${Number(remain || 0).toLocaleString()}`);
          return false;
        }
      }

      const dateOnly = String(header.orderDate || '').slice(0, 10);
      const timeOnly = (() => {
        const raw = String(header.orderTime || '').trim();
        const m = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (!m) return '00:00:00';
        return `${m[1]}:${m[2]}:${m[3] || '00'}`;
      })();
      const orderDateTime = dateOnly ? `${dateOnly}T${timeOnly}` : '';
      const orderItemType = (() => {
        const first = String(resolved[0]?.itemType || '').trim();
        if (!first) return 'mixed';
        const allSame = resolved.every((r) => String(r?.itemType || '').trim() === first);
        return allSame ? first : 'mixed';
      })();
      const customerName = String(customer?.name || '').trim() || 'Walk-in';
      const customerPayload = { ...(customer || {}), name: customerName };
      const orderId = editingOrderId || Date.now();
      const order = {
        id: orderId,
        ...header,
        orderDate: dateOnly,
        orderDateTime,
        ...customerPayload,
        paymentMethod,
        itemType: orderItemType,
        currency: usdEnabled ? 'USD' : 'TZS',
        usdEnabled: Boolean(usdEnabled),
        usdRate: usdEnabled ? exchangeRate : 0,
        items: resolved.map((r) => {
          const amount = (Number(r.qty)||0) * (Number(r.rate)||0);
          const amountTzs = usdEnabled ? (exchangeRate ? amount * exchangeRate : null) : amount;
          return { ...r, amount, amountTzs };
        }),
        subtotal: totals.subtotal,
        tax: totals.tax,
        shipping: totals.shipping,
        total: totals.total,
        totalTzs: usdEnabled ? (exchangeRate ? totalsTzs : null) : totals.total,
        status: paid ? 'Paid' : 'Open'
      };
      try {
        const existingSales = await salesApi.list().catch(() => []);
        const nowIso = new Date().toISOString();
        let savedOrder = null;
        let savedLocally = false;
        const unitPriceTzs = (it) => {
          if (!usdEnabled) return Number(it?.rate) || 0;
          const qty = Number(it?.qty) || 0;
          const amtTzs = Number(it?.amountTzs);
          if (Number.isFinite(amtTzs) && qty > 0) return amtTzs / qty;
          if (exchangeRate && Number(it?.rate)) return Number(it.rate) * Number(exchangeRate);
          return 0;
        };
        const backendPayload = {
          saleNumber: header.orderNumber,
          orderNumber: header.orderNumber,
          invoiceNumber: header.invoiceNumber,
          customerName,
          phone: String(customerPayload.phone || '').trim(),
          email: String(customerPayload.email || '').trim(),
          billTo: String(customerPayload.billTo || '').trim(),
          shipTo: String(customerPayload.shipTo || '').trim(),
          customerAddress: String(customerPayload.billTo || customerPayload.shipTo || '').trim(),
          paymentMethod,
          saleType: 'retail',
          status: paid ? 'Paid' : 'Open',
          paymentTerms: String(header.terms || '').trim(),
          date: dateOnly,
          orderDate: dateOnly,
          orderDateTime,
          currency: usdEnabled ? 'USD' : 'TZS',
          usdEnabled: Boolean(usdEnabled),
          usdRate: usdEnabled ? exchangeRate : 0,
          subtotal: usdEnabled ? totalsTzs : totals.subtotal,
          tax: usdEnabled ? Number(totals.tax || 0) * Number(exchangeRate || 0) : totals.tax,
          shipping: usdEnabled ? Number(totals.shipping || 0) * Number(exchangeRate || 0) : totals.shipping,
          finalTotal: usdEnabled ? totalsTzs : totals.total,
          amount: usdEnabled ? totalsTzs : totals.total,
          amountPaid: paid ? (usdEnabled ? totalsTzs : totals.total) : 0,
          balanceDue: paid ? 0 : (usdEnabled ? totalsTzs : totals.total),
          description: resolved.map((r) => String(r?.item || '').trim()).filter(Boolean).join(', '),
          items: resolved.map((r) => ({
            productId: String(r?.productId || '').trim() || undefined,
            item: String(r?.item || '').trim(),
            productName: String(r?.item || '').trim(),
            productType: String(r?.itemType || '').trim() || 'general',
            qty: Number(r?.qty) || 0,
            unit: String(r?.unit || 'pcs').trim() || 'pcs',
            rate: usdEnabled ? unitPriceTzs(r) : Number(r?.rate) || 0,
            amountTzs: Number(r?.amountTzs),
            total: usdEnabled ? Number(r?.amountTzs) || 0 : (Number(r?.qty) || 0) * (Number(r?.rate) || 0)
          }))
        };
        const syncedSale = editingOrderId
          ? (Array.isArray(existingSales) ? existingSales : []).find((entry) => String(entry?.id || '') === String(editingOrderId) && entry?.persisted)
          : null;
        if (syncedSale) {
          savedOrder = await salesApi.update(editingOrderId, backendPayload);
          savedLocally = false;
        } else if (editingOrderId) {
          savedOrder = await salesApi.create(backendPayload);
          savedLocally = !savedOrder?.persisted;
        } else {
          savedOrder = await salesApi.create(backendPayload);
          savedLocally = !savedOrder?.persisted;
        }

        try {
          if (customerName && customerName !== 'Walk-in') {
            const existingCustomers = await customersApi.list().catch(() => []);
            const phoneKey = String(customerPayload.phone || '').trim();
            const nameKey = normName(customerName);
            const existingCustomer = (Array.isArray(existingCustomers) ? existingCustomers : []).find((c) => {
              const n = normName(c?.name || '');
              if (!n || n !== nameKey) return false;
              const p = String(c?.phone || c?.mainPhone || '').trim();
              if (!phoneKey) return true;
              return p === phoneKey;
            });
            if (existingCustomer?.id) {
              await customersApi.update(existingCustomer.id, {
                ...existingCustomer,
                name: String(existingCustomer?.name || customerName).trim() || customerName,
                mainEmail: String(existingCustomer?.mainEmail || existingCustomer?.email || customerPayload.email || '').trim(),
                mainPhone: String(existingCustomer?.mainPhone || existingCustomer?.phone || customerPayload.phone || '').trim(),
                billTo: String(existingCustomer?.billTo || existingCustomer?.billedTo || customerPayload.billTo || '').trim(),
                shipTo: String(existingCustomer?.shipTo || existingCustomer?.shippedTo || customerPayload.shipTo || '').trim()
              });
            } else {
              await customersApi.create({
                name: customerName,
                mainEmail: String(customerPayload.email || '').trim(),
                mainPhone: String(customerPayload.phone || '').trim(),
                billTo: String(customerPayload.billTo || '').trim(),
                shipTo: String(customerPayload.shipTo || '').trim(),
                address: String(customerPayload.billTo || '').trim()
              });
            }
          }
        } catch {}

        const catalog = Array.isArray(productCatalog) ? productCatalog : [];
        const findInventoryItemId = (name) => {
          const key = normName(name);
          const hit = catalog.find((p) => normName(p?.name || p?.itemName || '') === key);
          const idRaw = hit?.id;
          const id = idRaw != null ? Number(idRaw) : null;
          return id && Number.isFinite(id) ? id : null;
        };

        void orderDateTime;
        void dateOnly;
        void customerName;
        void customerPayload;
        void paymentMethod;
        void orderItemType;
        void resolved;
        void findInventoryItemId;

        if (savedLocally) {
          try {
            const totalTzs = Number(savedOrder?.finalTotal ?? order.totalTzs ?? order.total) || 0;
            appendSystemActivity(
              'sales_sync',
              'Sale saved locally',
              `Invoice ${String(savedOrder?.invoiceNumber || order.invoiceNumber || '').trim() || '—'} • TSH ${totalTzs.toLocaleString()}`,
              'Sales',
              'warning',
              { saleId: savedOrder?.id || orderId, invoiceNumber: savedOrder?.invoiceNumber || order.invoiceNumber, orderNumber: savedOrder?.saleNumber || order.orderNumber }
            );
          } catch {}
        }
        if (!editingOrderId) {
          try {
            const so = parseInt(localStorage.getItem('nextSoNumber') || '1150', 10);
            const inv = parseInt(localStorage.getItem('nextInvoiceNumber') || '1', 10);
            localStorage.setItem('nextSoNumber', String((Number.isFinite(so) ? so : 1150) + 1));
            localStorage.setItem('nextInvoiceNumber', String((Number.isFinite(inv) ? inv : 1) + 1));
          } catch {}
        }
        try {
          window.dispatchEvent(new CustomEvent('dataUpdated'));
        } catch {}
      } catch (e) {
        window.alert(String(e?.message || 'Unable to save sale. Please try again.'));
        return false;
      }
      return true;
    };
    const saveAndClose = () => {
      if (saveLoading) return;
      let shouldNavigate = false;
      setSaveLoading('close');
      void withMinimumDelay(async () => {
        const ok = await saveOrder();
        if (!ok) return;
        shouldNavigate = true;
      }, 5000).finally(() => {
        setSaveLoading('');
        if (shouldNavigate) navigate('/placeholder/sales-history');
      });
    };
    const saveAndNew = () => {
      if (saveLoading) return;
      let shouldClear = false;
      setSaveLoading('new');
      void withMinimumDelay(async () => {
        const ok = await saveOrder();
        if (!ok) return;
        shouldClear = true;
      }, 5000).finally(() => {
        setSaveLoading('');
        if (shouldClear) clearForm();
      });
    };
    const closeForm = () => {
      if (saveLoading) return;
      setSaveLoading('close-only');
      void withMinimumDelay(async () => {}, 5000).finally(() => {
        setSaveLoading('');
        navigate('/placeholder/sales-history');
      });
    };
    const createCopy = () => {
      try {
        const so = parseInt(localStorage.getItem('nextSoNumber') || '1150', 10);
        const inv = parseInt(localStorage.getItem('nextInvoiceNumber') || '1', 10);
        setHeader(prev => ({
          ...prev,
          orderNumber: String((Number.isFinite(so) ? so : 1150)).padStart(SO_PAD, '0'),
          invoiceNumber: String((Number.isFinite(inv) ? inv : 1)).padStart(INV_PAD, '0'),
          orderDate: new Date().toISOString().slice(0,10),
          orderTime: getNowTime()
        }));
      } catch {
        setHeader(prev => ({
          ...prev,
          orderNumber: String(1150).padStart(SO_PAD, '0'),
          invoiceNumber: String(1).padStart(INV_PAD, '0'),
          orderDate: new Date().toISOString().slice(0,10),
          orderTime: getNowTime()
        }));
      }
    };
    const deleteCurrent = () => {
      if (!canDelete) return;
      setDeleteModalOpen(true);
    };

    const confirmDeleteCurrent = () => {
      if (!canDelete) {
        setDeleteModalOpen(false);
        return;
      }
      if (deleteLoading) return;
      const startedAt = Date.now();
      setDeleteLoading(true);
      window.setTimeout(async () => {
        try {
          const currentId = editingOrderId;
          if (currentId) {
            await salesApi.remove(currentId);
            try {
              localStorage.removeItem('selectedOrderForEdit');
            } catch {}
          }
        } catch (error) {
          try {
            window.alert(String(error?.message || 'Unable to delete sale.'));
          } catch {}
          setDeleteLoading(false);
          return;
        }
        clearForm();
        const elapsed = Date.now() - startedAt;
        const remaining = 5000 - elapsed;
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
        setDeleteLoading(false);
        setDeleteModalOpen(false);
        navigate('/placeholder/sales-history');
      }, 0);
    };

    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <ConfirmDeleteModal
          open={deleteModalOpen}
          title="Delete Sales Order?"
          description="Your sales order will be permanently deleted and cannot be recovered."
          confirmText="Delete"
          loading={deleteLoading}
          onCancel={() => (deleteLoading ? null : setDeleteModalOpen(false))}
          onConfirm={confirmDeleteCurrent}
        />
        <style>{`
          input.no-spin::-webkit-outer-spin-button,
          input.no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          input.no-spin[type=number] { -moz-appearance: textfield; }
          .so-invoice-preview { position: absolute; left: -10000px; top: 0; width: 900px; background: white; }
          @page { margin: 0; size: A4; }
          @media print {
            html, body { margin: 0 !important; padding: 0 !important; }
            body * { visibility: hidden !important; }
            .so-invoice-preview, .so-invoice-preview * { visibility: visible !important; }
            .so-invoice-preview {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
            }
          }
        `}</style>
        <div className="so-invoice-preview">
          <SalesOrderPrint
            companyDetails={companyInfo}
            salesOrderNumber={header.orderNumber}
            invoiceNumber={header.invoiceNumber}
            date={header.orderDate}
            dueDate={dueDate}
            billToName={customer.name}
            billToAddress={customer.billTo}
            shipToName={(String(customer.shipTo || '').split('\n')[0] || '').toString()}
            shipToAddress={customer.shipTo}
            items={printItems}
            notes={header.memo || header.notes || ''}
            subtotal={totals.subtotal}
            taxRate={vatEnabled ? VAT_RATE * 100 : 0}
            taxTotal={totals.tax}
            total={totals.total}
            currencyLabel={usdEnabled ? 'USD' : 'TZS'}
            exchangeRate={usdEnabled ? exchangeRate : null}
            convertedCurrencyLabel="TZS"
          />
        </div>
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Sales Order</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2" onClick={()=>window.print()}>
              <Printer size={16} />
              <span className="text-sm">Print</span>
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                const subject = encodeURIComponent(`Invoice ${header.invoiceNumber}`);
                const body = encodeURIComponent(`Dear ${customer.name || 'Customer'},\n\nPlease find invoice ${header.invoiceNumber} dated ${header.orderDate}.\nTotal: ${shareTotalText}\n\nThank you.`);
                window.location.href = `mailto:${customer.email || ''}?subject=${subject}&body=${body}`;
              }}
            >
              <Mail size={16} />
              <span className="text-sm">Email</span>
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
              onClick={async () => {
                const invoiceEl = document.querySelector('.so-invoice-preview');
                const invoiceNo = String(header.invoiceNumber || '').trim() || 'Invoice';
                const fileName = `Invoice_${invoiceNo}.pdf`;
                const shareText = `Invoice ${invoiceNo} • Date ${header.orderDate} • Total ${shareTotalText}`;
                try {
                  const file = await elementToPdfFile(invoiceEl, fileName);
                  const url = URL.createObjectURL(file);
                  try {
                    if (navigator?.canShare && navigator.canShare({ files: [file] }) && navigator?.share) {
                      await navigator.share({
                        title: `Invoice ${invoiceNo}`,
                        text: shareText,
                        files: [file]
                      });
                    } else {
                      const rawPhone = String(customer?.phone || '').trim();
                      const digits = rawPhone.replace(/[^\d]/g, '');
                      const waUrl = digits.length >= 9 ? `https://wa.me/${digits}?text=${encodeURIComponent(shareText)}` : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                      const isMobile = /Android|iPhone|iPad|iPod/i.test(String(navigator?.userAgent || ''));
                      if (isMobile) {
                        try {
                          const scheme = digits.length >= 9 ? `whatsapp://send?phone=${digits}&text=${encodeURIComponent(shareText)}` : `whatsapp://send?text=${encodeURIComponent(shareText)}`;
                          window.location.href = scheme;
                        } catch {}
                      }
                      try {
                        window.open(waUrl, '_blank');
                      } catch {
                        window.location.href = waUrl;
                      }
                      try {
                        window.open(url, '_blank');
                      } catch {}
                    }
                  } catch {
                    const rawPhone = String(customer?.phone || '').trim();
                    const digits = rawPhone.replace(/[^\d]/g, '');
                    const waUrl = digits.length >= 9 ? `https://wa.me/${digits}?text=${encodeURIComponent(shareText)}` : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                    try {
                      window.open(waUrl, '_blank');
                    } catch {
                      window.location.href = waUrl;
                    }
                    try {
                      window.open(url, '_blank');
                    } catch {}
                  }
                  window.setTimeout(() => {
                    try {
                      URL.revokeObjectURL(url);
                    } catch {}
                  }, 60000);
                } catch {
                  const rawPhone = String(customer?.phone || '').trim();
                  const digits = rawPhone.replace(/[^\d]/g, '');
                  const waUrl = digits.length >= 9 ? `https://wa.me/${digits}?text=${encodeURIComponent(shareText)}` : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                  try {
                    window.open(waUrl, '_blank');
                  } catch {
                    window.location.href = waUrl;
                  }
                }
              }}
            >
              <MessageCircle size={16} />
              <span className="text-sm">WhatsApp</span>
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
              onClick={createCopy}
            >
              <Copy size={16} />
              <span className="text-sm">Create Copy</span>
            </button>
            {canDelete ? (
              <button
                data-delete-trigger="true"
                className="px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-2"
                onClick={deleteCurrent}
              >
                <Trash2 size={16} />
                <span className="text-sm">Delete</span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
          <div>
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="px-4 py-2 flex items-end gap-2">
              <div className="w-80 relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Customer</label>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 px-3 py-2 border rounded-lg text-base"
                    value={customer.name}
                    onChange={(e)=>setCustomerField('name', e.target.value)}
                    placeholder="Select or type customer"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 border rounded-lg hover:bg-gray-100"
                    onClick={() => setShowCustomerMenu(v => !v)}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showCustomerMenu && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow">
                    <div className="max-h-48 overflow-auto">
                      {customers.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No customers yet</div>
                      )}
                      {customers.map((c) => (
                        <button
                          key={c.name + (c.email || '')}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                          onClick={() => {
                            setCustomer({
                              name: c.name || '',
                              email: c.email || '',
                              phone: c.phone || '',
                              billTo: c.billTo || c.address || '',
                              shipTo: c.shipTo || c.address || ''
                            });
                            setShowCustomerMenu(false);
                          }}
                        >
                          {c.name} {c.email ? `• ${c.email}` : ''}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-200">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                        onClick={() => {
                          setShowCustomerMenu(false);
                          setShowCustomerModal(true);
                        }}
                      >
                        <UserPlus size={16} />
                        Add new customer
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="mx-auto flex flex-wrap items-end gap-2 justify-center">
                <div className="w-36">
                  <label className="block text-sm font-semibold text-gray-700 mb-0.5">Date</label>
                  <DateInput className="w-full px-2 py-1.5 border rounded-lg text-sm" value={header.orderDate} onChange={(e)=>setHeaderField('orderDate', e.target.value)} />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-semibold text-gray-700 mb-0.5">Time</label>
                  <input className="w-full px-2 py-1.5 border rounded-lg text-sm bg-gray-100" type="time" step="1" value={String(header.orderTime || '').slice(0,8) || '00:00:00'} disabled />
                </div>
                <div className="w-36">
                  <label className="block text-sm font-semibold text-gray-700 mb-0.5">Invoice No.</label>
                  <input
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                    value={header.invoiceNumber}
                    maxLength={4}
                    onChange={(e)=>{
                      const digits = e.target.value.replace(/[^\d]/g, '').slice(0,4);
                      setHeaderField('invoiceNumber', digits);
                    }}
                    placeholder="0000"
                  />
                </div>
              </div>
              <div className="ml-auto flex items-end gap-2">
                <div className="w-24">
                  <label className="block text-sm font-semibold text-gray-700 mb-0.5">Status</label>
                  <div className="flex items-center gap-2">
                    <input id="paidToggle" type="checkbox" className="w-4 h-4" checked={paid} onChange={(e)=>setPaid(e.target.checked)} />
                    <label htmlFor="paidToggle" className="text-sm text-gray-700">{paid ? 'Paid' : 'Open'}</label>
                  </div>
                </div>
                <div className="w-44">
                  <label className="block text-sm text-gray-700 mb-0.5">Sell with</label>
                  <select className="w-full px-2 py-1.5 border rounded-lg text-base" value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)}>
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile money</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="credit_card">Credit card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-3 pb-3">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-start-9 col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name / Address</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-12" value={customer.billTo} onChange={(e)=>setCustomerField('billTo', e.target.value)} placeholder="Billing address" />
                </div>
                <div className="col-start-11 col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ship To</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-12" value={customer.shipTo} onChange={(e)=>setCustomerField('shipTo', e.target.value)} placeholder="Shipping address" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold">ITEMS</div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2" onClick={addItem}>
                  <Plus size={16} />
                  <span className="text-sm">Add Line</span>
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto">
            <table className="min-w-[980px] w-full table-fixed border-collapse border border-gray-200">
                <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center w-1/12 border border-gray-200">No.</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-3/12 border border-gray-200">Product/Service</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-2/12 border border-gray-200">Description</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-1/12 border border-gray-200">Unit</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">{activeBusiness === 'meat' ? 'Weight' : 'Qty'}</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Rate</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-2/12 border border-gray-200">Amount</th>
                  </tr>
                </thead>
              <tbody>
                  {items.map((row, i) => {
                    const amount = (Number(row.qty)||0) * (Number(row.rate)||0);
                    const remain = row.item ? productStock.getRemain(row.item) : null;
                    const outOfStock = row.item ? (Number.isFinite(remain) ? remain <= 0 : false) : false;
                    return (
                      <tr key={i} className="align-middle">
                      <td className="px-3 py-2 border border-gray-200 text-center select-none">{i + 1}</td>
                      <td className="px-3 py-2 border border-gray-200">
                        <button
                          type="button"
                          data-no-loading="true"
                          className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none flex items-center justify-between gap-2"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const spaceAbove = rect.top;
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const direction = (spaceBelow < 320 && spaceAbove > spaceBelow) ? 'up' : 'down';
                            const anchorY = direction === 'up' ? rect.top : rect.bottom;
                            const panelWidth = Math.max(320, rect.width);
                            const left = Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12));
                            loadProductCatalogFromStorage();
                            loadSalesOrderMovementsFromStorage();
                            setProductMenu({ visible: true, row: i, direction, x: left, y: anchorY, width: panelWidth });
                            setProductQuery('');
                          }}
                        >
                          <span className={row.item ? (outOfStock ? 'text-red-700 font-semibold' : 'text-gray-900') : 'text-gray-400'}>
                            {row.item ? row.item : 'Select item'}
                          </span>
                          <ChevronDown size={14} className={outOfStock ? 'text-red-700' : 'text-gray-600'} />
                        </button>
                        </td>
                      <td className="px-3 py-2 border border-gray-200" onContextMenu={(e)=>showMenu(e,i,'description')}>
                          <input
                          className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none"
                            value={row.description}
                            onChange={(e)=>updateItem(i,'description',e.target.value)}
                            placeholder="Description"
                          />
                        </td>
                      <td className="px-3 py-2 border border-gray-200 relative" onContextMenu={(e)=>showMenu(e,i,'unit')}>
                        <button
                          type="button"
                          data-no-loading="true"
                          className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none flex items-center justify-between"
                          onClick={(e)=>{
                            const rect = e.currentTarget.getBoundingClientRect();
                            const spaceAbove = rect.top;
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const direction = (spaceBelow < 220 && spaceAbove > spaceBelow) ? 'up' : 'down';
                            const anchorY = direction === 'up' ? rect.top : rect.bottom;
                            setUnitMenu({ visible: true, row: i, direction, x: rect.left, y: anchorY, width: Math.max(112, rect.width) });
                          }}
                        >
                          <span className="truncate">{row.unit || 'try'}</span>
                          <ChevronDown size={14} />
                        </button>
                        
                      </td>
                      <td className="px-3 py-2 border border-gray-200" onContextMenu={(e)=>showMenu(e,i,'qty')}>
                          <input
                            type="number"
                            min="0"
                          className="w-full px-2 py-1 text-sm text-right appearance-none no-spin bg-transparent focus:outline-none"
                            inputMode="numeric"
                            value={row.qty}
                            onChange={(e)=>updateItem(i,'qty',e.target.value)}
                            placeholder="0"
                          />
                        </td>
                      <td className="px-3 py-2 border border-gray-200" onContextMenu={(e)=>showMenu(e,i,'rate')}>
                          <input
                            type="number"
                            min="0"
                          className="w-full px-2 py-1 text-sm text-right appearance-none no-spin bg-transparent focus:outline-none"
                            inputMode="decimal"
                            value={row.rate}
                            onChange={(e)=>updateItem(i,'rate',e.target.value)}
                            placeholder="0.00"
                          />
                        </td>
                      <td className="px-3 py-2 border border-gray-200" onContextMenu={(e)=>showMenu(e,i,'amount')}>
                          <input
                          className="w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none"
                            value={amount.toLocaleString()}
                            readOnly
                            aria-label="Amount"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        {contextMenu.visible && (
          <div className="fixed inset-0 z-50" onClick={hideMenu}>
            <div
              className="absolute bg-white border border-gray-200 rounded-md shadow text-sm"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e)=>e.stopPropagation()}
            >
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={()=>{insertRowAt(contextMenu.row); hideMenu();}}>Insert Row Above</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={()=>{insertRowBelow(contextMenu.row); hideMenu();}}>Insert Row Below</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={()=>{removeItem(contextMenu.row); hideMenu();}}>Delete Row</button>
              <div className="border-t border-gray-200 my-1"></div>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={copyCell}>Copy</button>
              <button className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${clipboard == null || contextMenu.key === 'amount' ? 'text-gray-400 cursor-not-allowed' : ''}`} onClick={pasteCell} disabled={clipboard == null || contextMenu.key === 'amount'}>Paste</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={clearCell}>Clear Cell</button>
              <button className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${contextMenu.row <= 0 || contextMenu.key === 'amount' ? 'text-gray-400 cursor-not-allowed' : ''}`} onClick={()=>{ if (contextMenu.row > 0 && contextMenu.key !== 'amount') { updateItem(contextMenu.row, contextMenu.key, items[contextMenu.row - 1][contextMenu.key] ); } hideMenu(); }} disabled={contextMenu.row <= 0 || contextMenu.key === 'amount'}>Fill Down</button>
              <div className="border-t border-gray-200 my-1"></div>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={()=>duplicateRow(contextMenu.row)}>Duplicate Row</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={()=>copyRow(contextMenu.row)}>Copy Row</button>
              <button className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${!clipboardRow ? 'text-gray-400 cursor-not-allowed' : ''}`} onClick={()=>pasteRow(contextMenu.row)} disabled={!clipboardRow}>Paste Row</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={()=>clearRow(contextMenu.row)}>Clear Row</button>
              <button className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${contextMenu.row === 0 ? 'text-gray-400 cursor-not-allowed' : ''}`} onClick={()=>moveRowUp(contextMenu.row)} disabled={contextMenu.row === 0}>Move Row Up</button>
              <button className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${contextMenu.row >= items.length - 1 ? 'text-gray-400 cursor-not-allowed' : ''}`} onClick={()=>moveRowDown(contextMenu.row)} disabled={contextMenu.row >= items.length - 1}>Move Row Down</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={()=>insertRowsBelow(contextMenu.row, 5)}>Insert 5 Rows Below</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={addRowEnd}>Add Row at End</button>
            </div>
          </div>
        )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-2">
              <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-sm">
                <div className="text-sm font-medium text-gray-700 mb-1">Message</div>
                <textarea className="w-full px-3 py-2 border rounded-lg h-14 text-sm" placeholder="Message displayed on sales order" />
              </div>
            </div>
            <div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">VAT (18%)</span>
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={vatEnabled} onChange={(e)=>setVatEnabled(e.target.checked)} />
                      <div className="w-9 h-5 bg-gray-200 peer-checked:bg-green-500 rounded-full relative transition-colors">
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${vatEnabled ? 'translate-x-4' : ''}`}></div>
                      </div>
                    </label>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{currencyPrefix} {formatMoney(totals.tax)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">{currencyPrefix} {formatMoney(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Shipping</span>
                  <span className="text-sm font-semibold text-gray-900">{currencyPrefix} {formatMoney(totals.shipping)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">{currencyPrefix} {formatMoney(totals.total)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-600">USD</span>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={usdEnabled} onChange={(e)=>setUsdEnabled(e.target.checked)} />
                        <div className="w-9 h-5 bg-gray-200 peer-checked:bg-green-500 rounded-full relative transition-colors">
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${usdEnabled ? 'translate-x-4' : ''}`}></div>
                        </div>
                      </label>
                    </div>
                    {usdEnabled ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Rate (TZS/USD)</span>
                        <input
                          type="number"
                          className="no-spin w-28 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                          placeholder="e.g. 2600"
                          value={usdRate}
                          onChange={(e) => {
                            usdRateKeyRef.current = usdRateStorageKey;
                            setUsdRate(e.target.value);
                          }}
                          min="0"
                        />
                      </div>
                    ) : null}
                  </div>

                  {usdEnabled ? (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Total (TZS)</span>
                      <span className="text-lg font-bold text-green-700">TSH {exchangeRate ? formatMoney(totalsTzs) : '—'}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              className={saveLoading ? 'px-4 py-2 rounded-lg bg-green-600/70 text-white cursor-not-allowed inline-flex items-center gap-2' : 'px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2'}
              onClick={saveAndClose}
              disabled={!!saveLoading}
              type="button"
            >
              {saveLoading === 'close' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{saveLoading === 'close' ? 'Saving...' : 'Save & Close'}</span>
            </button>
            <button
              className={saveLoading ? 'px-4 py-2 rounded-lg bg-blue-600/70 text-white cursor-not-allowed inline-flex items-center gap-2' : 'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2'}
              onClick={saveAndNew}
              disabled={!!saveLoading}
              type="button"
            >
              {saveLoading === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{saveLoading === 'new' ? 'Saving...' : 'Save & New'}</span>
            </button>
            <button
              className={saveLoading ? 'px-4 py-2 rounded-lg border border-gray-300 text-gray-500 cursor-not-allowed inline-flex items-center gap-2' : 'px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100 inline-flex items-center gap-2'}
              onClick={closeForm}
              disabled={!!saveLoading}
              type="button"
            >
              {saveLoading === 'close-only' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{saveLoading === 'close-only' ? 'Closing...' : 'Close'}</span>
            </button>
          </div>
          </div>
          <div className="border-l border-gray-200 bg-gray-50 p-5">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Summary</div>
              <div className="space-y-2 text-sm text-gray-700 italic">
                <div className="flex justify-between">
                  <span>Customer</span>
                  <span className="font-medium text-gray-900">{customer.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Date</span>
                  <span className="font-medium text-gray-900">{header.orderDate || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="font-medium text-gray-900">{paid ? 'Paid' : 'Open'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{currencyPrefix} {formatMoney(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-medium text-gray-900">{currencyPrefix} {formatMoney(totals.tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-semibold text-gray-900">{currencyPrefix} {formatMoney(totals.total)}</span>
                </div>
                {usdEnabled ? (
                  <div className="flex justify-between">
                    <span>Total (TZS)</span>
                    <span className="font-semibold text-green-700">TSH {exchangeRate ? formatMoney(totalsTzs) : '—'}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Notes</div>
              <div className="text-sm text-gray-600">Review order details before saving or sharing.</div>
            </div>
          </div>
        </div>
        {unitMenu.visible && <div className="fixed inset-0 z-40" onClick={()=>setUnitMenu({ visible:false, row:-1, direction:'down', x:0, y:0, width:112 })}></div>}
        {unitMenu.visible && (
          <div
            className="fixed z-50"
            style={{ top: unitMenu.y, left: unitMenu.x }}
          >
            <div
              className="bg-white border border-gray-200 rounded-md shadow max-h-60 overflow-y-auto"
              style={{ transform: unitMenu.direction === 'up' ? 'translateY(-100%)' : 'none', minWidth: unitMenu.width }}
            >
              {unitOptions.map(u => (
                <button
                  key={u}
                  type="button"
                  data-no-loading="true"
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={()=>{ 
                    updateItem(unitMenu.row,'unit',u); 
                    setUnitMenu({ visible:false, row:-1, direction:'down', x:0, y:0, width:112 }); 
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        )}
        {productMenu.visible && <div className="fixed inset-0 z-40" onClick={() => setProductMenu({ visible: false, row: -1, direction: 'down', x: 0, y: 0, width: 320 })} />}
        {productMenu.visible ? (
          <div className="fixed z-50" style={{ top: productMenu.y, left: productMenu.x }}>
            <div
              className="bg-white border border-gray-200 rounded-md shadow overflow-hidden"
              style={{ transform: productMenu.direction === 'up' ? 'translateY(-100%)' : 'none', minWidth: productMenu.width }}
            >
              <div className="p-2 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Search product..."
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </div>
              </div>
              <div className="max-h-[320px] overflow-auto">
                {(() => {
                  const q = String(productQuery || '').trim().toLowerCase();
                  const list = (Array.isArray(productCatalog) ? productCatalog : [])
                    .filter((p) => String(p?.status || 'active').toLowerCase() !== 'inactive')
                    .filter((p) => {
                      if (!q) return true;
                      const hay = [p?.name, p?.sku, p?.barcode, p?.category].map((x) => String(x || '').toLowerCase()).join(' ');
                      return hay.includes(q);
                    })
                    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
                  if (!list.length) {
                    return <div className="px-4 py-6 text-sm text-gray-600 text-center">No products found.</div>;
                  }
                  return (
                    <div className="divide-y divide-gray-100">
                      {list.map((p) => {
                        const name = String(p?.name || '').trim();
                        const unit = String(p?.unit || '').trim();
                        const priceRaw = p?.sellingPrice ?? p?.sellPrice ?? p?.price ?? 0;
                        const priceNum = typeof priceRaw === 'number' ? priceRaw : parseFloat(String(priceRaw || '').replace(/,/g, ''));
                        const priceText = Number.isFinite(priceNum) ? priceNum.toLocaleString() : '0';
                        const typeKey = productStock.normalizeType(p?.category || p?.itemType || 'general');
                        const remain = productStock.getRemain(name, typeKey);
                        const outOfStock = Number.isFinite(remain) ? remain <= 0 : false;
                        return (
                          <button
                            key={String(p?.id || name)}
                            type="button"
                            className={
                              'w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3'
                            }
                            onClick={() => addProductToOrder(p, productMenu.row)}
                          >
                            <div>
                              <div className={outOfStock ? 'text-sm font-semibold text-red-700' : 'text-sm font-semibold text-gray-900'}>{name || '—'}</div>
                              <div className="text-xs text-gray-600">
                                {unit ? `Unit: ${unit}` : 'Unit: —'} {String(p?.sku || '').trim() ? `• SKU: ${String(p.sku).trim()}` : ''}
                              </div>
                              {Number.isFinite(remain) ? (
                                <div className={outOfStock ? 'text-xs text-red-600 mt-0.5' : 'text-xs text-gray-600 mt-0.5'}>
                                  Remaining: {Number(remain || 0).toLocaleString()}
                                </div>
                              ) : null}
                            </div>
                            <div className="text-sm font-semibold text-green-700">TSH {priceText}</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : null}
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
            <div className="bg-white border border-gray-200 rounded-xl w-full max-w-6xl">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="text-gray-900 font-semibold">Add Customer</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-700">Customer</div>
                  <input
                    className="px-3 py-2 border rounded-lg text-sm w-64"
                    placeholder="Company or customer"
                    value={newCustomer.company}
                    onChange={(e)=>setNewCustomer(prev=>({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex">
                <div className="w-48 border-r border-gray-200 p-3 space-y-1">
                  <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm font-medium">Address Info</button>
                  <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm">Payment Settings</button>
                  <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm">Additional Info</button>
                  <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm">Job Info</button>
                </div>
                <div className="flex-1 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-1">Company Name</div>
                      <input className="w-full px-3 py-2 border rounded-lg text-sm" value={newCustomer.company} onChange={(e)=>setNewCustomer(prev=>({ ...prev, company: e.target.value }))} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-1">Full Name</div>
                      <div className="grid grid-cols-4 gap-2">
                        <input className="px-2 py-2 border rounded-lg text-sm" placeholder="Mr/Ms" value={newCustomer.prefix} onChange={(e)=>setNewCustomer(prev=>({ ...prev, prefix: e.target.value }))} />
                        <input className="px-2 py-2 border rounded-lg text-sm" placeholder="First" value={newCustomer.firstName} onChange={(e)=>setNewCustomer(prev=>({ ...prev, firstName: e.target.value }))} />
                        <input className="px-2 py-2 border rounded-lg text-sm" placeholder="M.I." value={newCustomer.middle} onChange={(e)=>setNewCustomer(prev=>({ ...prev, middle: e.target.value }))} />
                        <input className="px-2 py-2 border rounded-lg text-sm" placeholder="Last" value={newCustomer.lastName} onChange={(e)=>setNewCustomer(prev=>({ ...prev, lastName: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-1">Job Title</div>
                      <input className="w-full px-3 py-2 border rounded-lg text-sm" value={newCustomer.jobTitle} onChange={(e)=>setNewCustomer(prev=>({ ...prev, jobTitle: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="col-span-1">
                      <div className="grid grid-cols-2 gap-2">
                        <input className="px-3 py-2 border rounded-lg text-sm" placeholder="Main Phone" value={newCustomer.mainPhone} onChange={(e)=>setNewCustomer(prev=>({ ...prev, mainPhone: e.target.value }))} />
                        <input className="px-3 py-2 border rounded-lg text-sm" placeholder="Main Email" value={newCustomer.mainEmail} onChange={(e)=>setNewCustomer(prev=>({ ...prev, mainEmail: e.target.value }))} />
                        <input className="px-3 py-2 border rounded-lg text-sm" placeholder="Work Phone" value={newCustomer.workPhone} onChange={(e)=>setNewCustomer(prev=>({ ...prev, workPhone: e.target.value }))} />
                        <input className="px-3 py-2 border rounded-lg text-sm" placeholder="CC Email" value={newCustomer.ccEmail} onChange={(e)=>setNewCustomer(prev=>({ ...prev, ccEmail: e.target.value }))} />
                        <input className="px-3 py-2 border rounded-lg text-sm" placeholder="Mobile" value={newCustomer.mobile} onChange={(e)=>setNewCustomer(prev=>({ ...prev, mobile: e.target.value }))} />
                        <input className="px-3 py-2 border rounded-lg text-sm" placeholder="Website" value={newCustomer.website} onChange={(e)=>setNewCustomer(prev=>({ ...prev, website: e.target.value }))} />
                        <input className="px-3 py-2 border rounded-lg text-sm" placeholder="Fax" value={newCustomer.fax} onChange={(e)=>setNewCustomer(prev=>({ ...prev, fax: e.target.value }))} />
                        <input className="px-3 py-2 border rounded-lg text-sm" placeholder="Other 1" value={newCustomer.other1} onChange={(e)=>setNewCustomer(prev=>({ ...prev, other1: e.target.value }))} />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="text-sm font-semibold text-gray-700">Address Details</div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Invoice/Bill To</div>
                            <textarea className="w-full px-3 py-2 border rounded-lg text-base h-36" value={newCustomer.billTo} onChange={(e)=>setNewCustomer(prev=>({ ...prev, billTo: e.target.value }))} />
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Ship To</div>
                            <textarea className="w-full px-3 py-2 border rounded-lg text-base h-36" value={newCustomer.shipTo} onChange={(e)=>setNewCustomer(prev=>({ ...prev, shipTo: e.target.value }))} />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <button className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>setNewCustomer(prev=>({ ...prev, shipTo: prev.billTo }))}>Copy ›</button>
                          <label className="inline-flex items-center text-base text-gray-700 gap-2">
                            <input type="checkbox" checked={newCustomer.defaultShipTo} onChange={(e)=>setNewCustomer(prev=>({ ...prev, defaultShipTo: e.target.checked }))} />
                            Default shipping address
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-80 border-l border-gray-200 p-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Customers</div>
                  <input
                    className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                    placeholder="Search customers"
                    value={customerSearch}
                    onChange={(e)=>setCustomerSearch(e.target.value)}
                  />
                  <div className="h-[28rem] overflow-auto space-y-2">
                    {customers
                      .filter(c=>{
                        const q = customerSearch.trim().toLowerCase();
                        if (!q) return true;
                        const s = [
                          c.name, c.company, c.mainEmail, c.ccEmail, c.mainPhone, c.mobile, c.address, c.billTo, c.shipTo
                        ].map(x => (x || '').toLowerCase()).join(' ');
                        return s.includes(q);
                      })
                      .map((c)=>(
                      <div key={c.name + (c.mainEmail || '')} className="border border-gray-200 rounded-lg p-2">
                        <div className="text-sm font-semibold text-gray-900">{c.name || c.company || '—'}</div>
                        <div className="text-xs text-gray-600">{[c.mainEmail, c.ccEmail].filter(Boolean).join(' • ')}</div>
                        <div className="text-xs text-gray-600">{[c.mainPhone, c.mobile, c.workPhone].filter(Boolean).join(' • ')}</div>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[11px] text-gray-500">Bill To</div>
                            <div className="text-xs text-gray-700 whitespace-pre-line">{c.billTo || c.address || ''}</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-gray-500">Ship To</div>
                            <div className="text-xs text-gray-700 whitespace-pre-line">{c.shipTo || c.address || ''}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-100 text-xs"
                            onClick={()=>{
                              setCustomer(mapCustomerToContactFields(c));
                              setShowCustomerModal(false);
                            }}
                          >
                            Use
                          </button>
                          <button
                            className="px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 text-xs"
                            onClick={async ()=>{
                              try {
                                await customersApi.remove(c.id);
                                await loadCustomers();
                              } catch (err) {
                                try { window.alert(String(err?.message || 'Unable to delete customer')); } catch {}
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {customers.length === 0 && (
                      <div className="text-xs text-gray-600">No customers yet</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={async ()=>{
                  const displayName = newCustomer.company || [newCustomer.prefix, newCustomer.firstName, newCustomer.middle, newCustomer.lastName].filter(Boolean).join(' ');
                  if (!displayName.trim()) return;
                  try {
                    const created = await customersApi.create({
                      ...newCustomer,
                      name: displayName,
                      mainPhone: newCustomer.mainPhone || newCustomer.mobile || '',
                      mainEmail: newCustomer.mainEmail || newCustomer.ccEmail || '',
                      billTo: newCustomer.billTo || newCustomer.address || '',
                      shipTo: newCustomer.defaultShipTo ? (newCustomer.shipTo || newCustomer.billTo || newCustomer.address || '') : (newCustomer.shipTo || '')
                    });
                    await loadCustomers();
                    setCustomer(mapCustomerToContactFields(created));
                  } catch (err) {
                    try { window.alert(String(err?.message || 'Unable to save customer')); } catch {}
                    return;
                  }
                  setShowCustomerModal(false);
                }}>OK</button>
                <button className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100" onClick={()=>setShowCustomerModal(false)}>Cancel</button>
                <button className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100">Help</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const SalesHistory = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [fromDate, setFromDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0,10));
    const [hideHeader, setHideHeader] = useState(false);
    const [sortKey, setSortKey] = useState('date_desc');
    const [periodLabel] = useState('This Month-to-date');
    const [refreshKey, setRefreshKey] = useState(0);
    const [shWidths, setShWidths] = useState([160,100,110,180,180,90,90,130,120,120,140,140,110]);
    const onShMouseDown = (i, e) => {
      const startX = e.clientX;
      const startW = shWidths[i];
      const move = (ev) => {
        const dx = ev.clientX - startX;
        setShWidths(prev => prev.map((w, idx) => idx === i ? Math.max(80, startW + dx) : w));
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    };
    const normalizeHistoryItems = useCallback((record) => {
      const items = Array.isArray(record?.items) ? record.items : [];
      if (items.length) {
        return items.map((it) => {
          const quantity = Number(it?.quantity ?? it?.qty ?? record?.quantity ?? 0) || 0;
          const unitPrice = Number(it?.unitPrice ?? it?.price ?? it?.rate ?? record?.price ?? 0) || 0;
          const amount = Number(it?.total ?? it?.amount ?? quantity * unitPrice) || 0;
          return {
            productName: String(it?.productName || it?.item || record?.productName || '').trim(),
            description: String(it?.description || record?.description || record?.notes || '').trim(),
            unit: String(it?.unit || record?.unit || '').trim(),
            quantity,
            unitPrice,
            amount
          };
        });
      }
      const quantity = Number(record?.quantity ?? 0) || 0;
      const unitPrice = Number(record?.price ?? record?.unitPrice ?? 0) || 0;
      const amount = Number(record?.amount ?? record?.finalTotal ?? record?.total ?? quantity * unitPrice) || 0;
      if (!quantity && !unitPrice && !amount && !String(record?.productName || '').trim()) {
        return [];
      }
      return [
        {
          productName: String(record?.productName || record?.description || '').trim(),
          description: String(record?.description || record?.notes || '').trim(),
          unit: String(record?.unit || '').trim(),
          quantity,
          unitPrice,
          amount
        }
      ];
    }, []);
    const normalizeHistoryRecord = useCallback((record, sourceType) => {
      const date = String(
        record?.date ||
        record?.saleDate ||
        record?.orderDateTime ||
        record?.orderDate ||
        record?.createdAt ||
        ''
      ).trim();
      const customerName = String(record?.customerName || record?.customer || record?.name || '').trim();
      const saleNumber = String(record?.saleNumber || record?.invoiceNumber || record?.invoiceNo || record?.orderNumber || record?.id || '').trim();
      const paymentMethod = String(record?.paymentMethod || '').trim();
      const rawStatus = String(record?.status || '').trim();
      const status = rawStatus || (paymentMethod.toLowerCase() === 'credit' ? 'Open' : 'Paid');
      return {
        ...record,
        _sourceType: sourceType,
        date,
        customerName,
        saleNumber,
        paymentMethod,
        status,
        items: normalizeHistoryItems(record)
      };
    }, [normalizeHistoryItems]);
    React.useEffect(() => {
      let alive = true;
      Promise.resolve()
        .then(async () => {
          const sales = await salesApi.list().catch(() => []);
          const combined = [
            ...(Array.isArray(sales) ? sales : []).map((sale) => normalizeHistoryRecord(sale, 'sale'))
          ];
          const list = combined;
          if (!alive) return;
          setOrders(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (!alive) return;
          setOrders([]);
        });
      return () => {
        alive = false;
      };
    }, [refreshKey]);
    React.useEffect(() => {
      const onEvent = () => setRefreshKey((v) => v + 1);
      window.addEventListener('dataUpdated', onEvent);
      return () => window.removeEventListener('dataUpdated', onEvent);
    }, []);
    const filtered = useMemo(() => {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      const rows = [];
      let truncated = false;
      const MAX_ROWS = 2000;
      orders.forEach(o => {
        if (rows.length >= MAX_ROWS) {
          truncated = true;
          return;
        }
        const oDate = new Date(o.date || o.orderDate || o.createdAt || '');
        if (isNaN(oDate)) return;
        if (oDate < start || oDate > end) return;
        (o.items || []).forEach((it, idx) => {
          if (rows.length >= MAX_ROWS) {
            truncated = true;
            return;
          }
          const qty = Number(it.quantity) || 0;
          const currency = String(o.currency || (o.usdEnabled ? 'USD' : 'TZS')).trim().toUpperCase() === 'USD' ? 'USD' : 'TZS';
          const usdRate = Number(o.usdRate ?? o.exchangeRate) || 0;
          const rawUnitPrice = Number(it.unitPrice) || 0;
          const rawAmount = Number(it.amount ?? qty * rawUnitPrice) || 0;
          const isPersistedUsdSale = currency === 'USD' && Boolean(o.persisted);
          const usdUnitPrice = currency === 'USD'
            ? (isPersistedUsdSale
                ? (usdRate > 0 ? rawUnitPrice / usdRate : rawUnitPrice)
                : rawUnitPrice)
            : rawUnitPrice;
          const usdAmount = currency === 'USD'
            ? (isPersistedUsdSale
                ? (usdRate > 0 ? rawAmount / usdRate : rawAmount)
                : rawAmount)
            : null;
          const tzsAmount = currency === 'USD'
            ? (isPersistedUsdSale
                ? rawAmount
                : (Number.isFinite(Number(it.amountTzs)) ? Number(it.amountTzs) : (usdRate > 0 && usdAmount != null ? usdAmount * usdRate : null)))
            : rawAmount;
          const amount = currency === 'USD' ? (usdAmount ?? 0) : rawAmount;
          rows.push({
            id: `${o.id}-${idx}`,
            orderId: o.id,
            date: String(o.date || '').slice(0, 10),
            invoiceNo: o.invoiceNumber || o.saleNumber || '',
            soNo: '',
            name: o.customerName || '',
            item: it.productName || '',
            description: it.description || '',
            qty,
            unit: it.unit || '',
            price: usdUnitPrice,
            amount,
            amountTzs: tzsAmount,
            paymentMethod: String(o.paymentMethod || '').trim(),
            currency,
            usdRate: currency === 'USD' ? usdRate : 0,
            usdAmount,
            tzsAmount,
            status: String(o.status || '').trim(),
            raw: o
          });
        });
      });
      const sorted = [...rows].sort((a,b)=>{
        switch (sortKey) {
          case 'date_asc': return (a.date > b.date) ? 1 : (a.date < b.date ? -1 : 0);
          case 'date_desc': return (a.date < b.date) ? 1 : (a.date > b.date ? -1 : 0);
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          default: return 0;
        }
      });
      return { lines: sorted, truncated };
    }, [orders, fromDate, toDate, sortKey]);
    const filteredLines = filtered.lines;
    const totals = useMemo(() => {
      const totalUsd = filteredLines.reduce((sum, row) => {
        if (row.currency !== 'USD') return sum;
        const value = row.usdAmount;
        return sum + (Number.isFinite(Number(value)) ? Number(value) : 0);
      }, 0);
      const totalTzs = filteredLines.reduce((sum, row) => {
        const value = row.currency === 'USD' ? row.tzsAmount : row.amount;
        return sum + (Number.isFinite(Number(value)) ? Number(value) : 0);
      }, 0);
      const missingRates = filteredLines.some((row) => row.currency === 'USD' && !(Number(row.usdRate) > 0));
      return { totalUsd, totalTzs, missingRates };
    }, [filteredLines]);
    const hasUsd = useMemo(() => filteredLines.some((row) => row.currency === 'USD'), [filteredLines]);
    const reportDateRange = `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}`;
    const printSalesHistory = useCallback(() => {
      printWithTitle(`Sales History - ${fromDate} to ${toDate}`);
    }, [fromDate, toDate]);
    const exportExcel = () => {
      const header = ['Date','Invoice No.','Customer Name','Item','Qty','Unit','Currency','Sales Price','Amount USD','Rate','Amount TZS','Sell With','Status'];
      const rows = filteredLines.map((r) => [
        r.date,
        r.invoiceNo,
        r.name,
        r.item,
        String(r.qty ?? ''),
        r.unit,
        r.currency === 'USD' ? 'USD' : 'TZS',
        String(Number(r.price || 0)),
        r.currency === 'USD' ? String(Number(r.usdAmount || 0)) : '',
        r.currency === 'USD' ? String(Number(r.usdRate || 0) || '') : '',
        r.currency === 'USD' ? String(r.tzsAmount == null ? '' : Number(r.tzsAmount)) : String(Number(r.amount || 0)),
        r.paymentMethod || '',
        (r.raw.status || '') || 'Open'
      ]);
      downloadExcelFile(`sales_history_${new Date().toISOString().slice(0, 10)}.xls`, {
        title: 'Sales History',
        subtitle: `${String(fromDate || '').slice(0, 10)} - ${String(toDate || '').slice(0, 10)}`,
        rows: [header, ...rows]
      });
    };
    const toggleOrderStatus = () => {
      window.alert('Status changes are not available in this view.');
    };
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <style>{`
          .sales-history-print-only { display: none; }
          @media print {
            @page { size: landscape; margin: 12mm; }
            body * { visibility: hidden !important; }
            .sales-history-print-scope, .sales-history-print-scope * { visibility: visible !important; }
            .sales-history-print-scope {
              position: absolute !important;
              inset: 0 !important;
              padding: 16px !important;
              background: white !important;
            }
            .sales-history-no-print { display: none !important; }
            .sales-history-print-only { display: block !important; }
          }
        `}</style>
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Customize Report</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Comment on Report</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Share Template</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Memorize</button>
            <button type="button" className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={printSalesHistory}>Print</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>{
              const subject = encodeURIComponent('Sales by Customer Detail');
              const body = encodeURIComponent('Please find the Sales by Customer Detail report.');
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}>E-mail</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={exportExcel}>Excel</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>setHideHeader(v=>!v)}>{hideHeader ? 'Show Header' : 'Hide Header'}</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>setRefreshKey(k=>k+1)}>Refresh</button>
          </div>
        </div>
        <div className="p-4 sales-history-print-scope">
          <div className="sales-history-print-only mb-4">
            <div className="text-lg font-semibold text-gray-900">Sales History</div>
            <div className="text-sm text-gray-700">{reportDateRange}</div>
            <div className="mt-1 text-xs text-gray-600">
              {filteredLines.length} line{filteredLines.length === 1 ? '' : 's'} printed
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap sales-history-no-print">
            <div className="px-3 py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 text-sm">{periodLabel}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">From</span>
              <DateInput className="px-3 py-2 border rounded-lg text-sm" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">To</span>
              <DateInput className="px-3 py-2 border rounded-lg text-sm" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Sort By</span>
              <select className="px-3 py-2 border rounded-lg text-sm" value={sortKey} onChange={(e)=>setSortKey(e.target.value)}>
                <option value="date_desc">Default</option>
                <option value="date_asc">Date Asc</option>
                <option value="name_asc">Customer A→Z</option>
                <option value="name_desc">Customer Z→A</option>
              </select>
            </div>
          </div>
          {!hideHeader && (
            <div className="text-center mt-4">
              <div className="text-xs text-gray-600">Accrual Basis</div>
              <div className="text-lg font-semibold text-gray-900">Sales by Customer Detail</div>
              <div className="text-sm text-gray-700">{reportDateRange}</div>
            </div>
          )}
          <div className="mt-4 border rounded-lg">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-[1280px] w-full table-fixed border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: shWidths[0] }}>
                      Date
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(0,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: shWidths[2] }}>
                      Invoice No.
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(2,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: shWidths[3] }}>
                      Customer Name
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(3,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: shWidths[4] }}>
                      Item
                      <div className="absolute right-0 top-0 h-full cursor-col-resize sales-history-no-print" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(4,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: shWidths[5] }}>
                      Qty
                      <div className="absolute right-0 top-0 h-full cursor-col-resize sales-history-no-print" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(5,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: shWidths[6] }}>
                      U/M
                      <div className="absolute right-0 top-0 h-full cursor-col-resize sales-history-no-print" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(6,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: shWidths[7] }}>
                      Sales Price
                      <div className="absolute right-0 top-0 h-full cursor-col-resize sales-history-no-print" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(7,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: shWidths[8] }}>
                      Amount (USD)
                      <div className="absolute right-0 top-0 h-full cursor-col-resize sales-history-no-print" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(8,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: shWidths[9] }}>
                      Rate
                      <div className="absolute right-0 top-0 h-full cursor-col-resize sales-history-no-print" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(9,e)}></div>
                    </th>
                    <th className="px-3 py-2 pr-6 text-xs text-gray-700 text-right border-b relative" style={{ width: shWidths[10] }}>
                      Amount (TZS)
                      <div className="absolute right-0 top-0 h-full cursor-col-resize sales-history-no-print" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(10,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: shWidths[11] }}>
                      Sell with
                      <div className="absolute right-0 top-0 h-full cursor-col-resize sales-history-no-print" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(11,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-center border-b relative" style={{ width: shWidths[12] }}>
                      Status
                      <div className="absolute right-0 top-0 h-full cursor-col-resize sales-history-no-print" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(12,e)}></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="px-3 py-2 text-sm text-gray-800" style={{ width: shWidths[0] }}>{r.date}</td>
                      <td className="px-3 py-2 text-sm text-gray-800" style={{ width: shWidths[2] }}>
                        <span className="sales-history-print-only">{r.invoiceNo || '—'}</span>
                        {r.raw ? (
                          <button className="underline text-blue-700 sales-history-no-print" onClick={()=>{
                            try { localStorage.setItem('selectedOrderForEdit', JSON.stringify(r.raw)); } catch {}
                            navigate('/placeholder/sales-order');
                          }}>{r.invoiceNo || '—'}</button>
                        ) : (
                          <span className="sales-history-no-print">{r.invoiceNo || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-800" style={{ width: shWidths[3] }}>{r.name}</td>
                      <td className="px-3 py-2 text-sm text-gray-800" style={{ width: shWidths[4] }}>{r.item}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-800" style={{ width: shWidths[5] }}>{r.qty}</td>
                      <td className="px-3 py-2 text-sm text-gray-800" style={{ width: shWidths[6] }}>{r.unit}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-800" style={{ width: shWidths[7] }}>
                        {r.currency === 'USD' ? 'USD' : 'TSH'} {Number(r.price || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-800" style={{ width: shWidths[8] }}>
                        {r.currency === 'USD' ? `USD ${Number(r.usdAmount || 0).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-800" style={{ width: shWidths[9] }}>
                        {r.currency === 'USD' ? (r.usdRate ? Number(r.usdRate).toLocaleString() : '—') : '—'}
                      </td>
                      <td className="px-3 py-2 pr-6 text-sm text-right text-gray-800" style={{ width: shWidths[10] }}>
                        {r.currency === 'USD'
                          ? (r.tzsAmount == null ? '—' : `TSH ${Number(r.tzsAmount || 0).toLocaleString()}`)
                          : `TSH ${Number(r.amount || 0).toLocaleString()}`}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-800" style={{ width: shWidths[11] }}>
                        {r.paymentMethod || '—'}
                      </td>
                      <td className="px-3 py-2 text-sm text-center" style={{ width: shWidths[12] }}>
                        <span className="sales-history-print-only">{String(r.status || 'Open')}</span>
                        <button
                          type="button"
                          className={`${(() => {
                            const status = String(r.status || '').toLowerCase();
                            return status === 'paid' || status === 'completed'
                              ? 'px-2 py-1 rounded bg-green-100 text-green-700 text-xs hover:bg-green-200'
                              : 'px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs hover:bg-gray-200';
                          })()} sales-history-no-print`}
                          onClick={() => toggleOrderStatus(r.orderId)}
                          title="Click to toggle Paid/Open"
                        >
                          {String(r.status || 'Open')}
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 text-sm font-semibold text-gray-900" colSpan={8}>Total Amount</td>
                    <td className="px-3 py-2 text-sm font-semibold text-right text-gray-900">
                      {hasUsd ? `USD ${Number(totals.totalUsd || 0).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700">
                      {totals.missingRates ? 'Rate missing' : ''}
                    </td>
                    <td className="px-3 py-2 pr-6 text-sm font-semibold text-right text-gray-900">
                      TSH {Number(totals.totalTzs || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm"></td>
                    <td className="px-3 py-2 text-sm"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            {filteredLines.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-600">
                <div>No records for selected period</div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100"
                    onClick={()=>{
                      setFromDate('1970-01-01');
                      setToDate('2999-12-31');
                    }}
                  >
                    Show All Dates
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                    onClick={()=>navigate('/placeholder/sales-order')}
                  >
                    Go to Sales Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SalesCustomers = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [sortKey, setSortKey] = useState('name_asc');
    const [filterCompany, setFilterCompany] = useState('all');
    const [filterEmail, setFilterEmail] = useState('all');
    const [filterPhone, setFilterPhone] = useState('all');
    const [custWidths, setCustWidths] = useState([180,180,220,130,260,260,140]);
    const onCustMouseDown = (i, e) => {
      const startX = e.clientX;
      const startW = custWidths[i];
      const move = (ev) => {
        const dx = ev.clientX - startX;
        setCustWidths(prev => prev.map((w, idx) => idx === i ? Math.max(80, startW + dx) : w));
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    };
    const [newCustomer, setNewCustomer] = useState({
      name: '',
      company: '',
      mainEmail: '',
      mainPhone: '',
      billTo: '',
      shipTo: ''
    });
    const [deleteCustomerModal, setDeleteCustomerModal] = useState({ open: false, customer: null });
    const [deleteCustomerLoading, setDeleteCustomerLoading] = useState(false);
    const loadCustomers = useCallback(async () => {
      try {
        const list = await customersApi.list();
        setCustomers(Array.isArray(list) ? list : []);
      } catch {
        setCustomers([]);
      }
    }, []);
    React.useEffect(() => {
      void loadCustomers();
    }, [loadCustomers]);
    const addCustomer = async () => {
      const displayName = newCustomer.name || newCustomer.company;
      if (!displayName || !displayName.trim()) return;
      try {
        await customersApi.create({
          name: displayName,
          company: newCustomer.company || '',
          mainEmail: newCustomer.mainEmail || '',
          mainPhone: newCustomer.mainPhone || '',
          billTo: newCustomer.billTo || '',
          shipTo: newCustomer.shipTo || '',
          address: newCustomer.billTo || ''
        });
        await loadCustomers();
        setShowAdd(false);
        setNewCustomer({ name: '', company: '', mainEmail: '', mainPhone: '', billTo: '', shipTo: '' });
      } catch (err) {
        try { window.alert(String(err?.message || 'Unable to save customer')); } catch {}
        return false;
      }
      return true;
    };
    const deleteCustomer = (c) => {
      if (!canDelete) return;
      setDeleteCustomerModal({ open: true, customer: c });
    };

    const confirmDeleteCustomer = () => {
      if (!canDelete) {
        setDeleteCustomerModal({ open: false, customer: null });
        return;
      }
      if (deleteCustomerLoading) return;
      const c = deleteCustomerModal.customer;
      if (!c) return;
      const startedAt = Date.now();
      setDeleteCustomerLoading(true);
      (async () => {
        try {
          await customersApi.remove(c.id);
          await loadCustomers();
        } catch (err) {
          try { window.alert(String(err?.message || 'Unable to delete customer')); } catch {}
        } finally {
          const elapsed = Date.now() - startedAt;
          const remaining = 5000 - elapsed;
          if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
          setDeleteCustomerLoading(false);
          setDeleteCustomerModal({ open: false, customer: null });
        }
      })();
    };

    const cancelDeleteCustomer = () => {
      if (deleteCustomerLoading) return;
      setDeleteCustomerModal({ open: false, customer: null });
      setDeleteCustomerLoading(false);
      return;
    };
    const filtered = React.useMemo(() => {
      const q = customerSearch.trim().toLowerCase();
      let arr = customers.filter(c => {
        if (!q) return true;
        const s = [
          c.name, c.company, c.mainEmail, c.mainPhone, c.address, c.billTo, c.shipTo
        ].map(x => (x || '').toLowerCase()).join(' ');
        return s.includes(q);
      });
      if (filterCompany === 'company') {
        arr = arr.filter(c => (c.company || '').trim().length > 0);
      } else if (filterCompany === 'individual') {
        arr = arr.filter(c => !(c.company || '').trim().length);
      }
      if (filterEmail === 'has') {
        arr = arr.filter(c => (c.mainEmail || '').trim().length > 0);
      } else if (filterEmail === 'missing') {
        arr = arr.filter(c => !(c.mainEmail || '').trim().length);
      }
      if (filterPhone === 'has') {
        arr = arr.filter(c => (c.mainPhone || '').trim().length > 0);
      } else if (filterPhone === 'missing') {
        arr = arr.filter(c => !(c.mainPhone || '').trim().length);
      }
      const compare = (a, b, key) => {
        const av = (a[key] || '').toLowerCase();
        const bv = (b[key] || '').toLowerCase();
        if (av > bv) return 1;
        if (av < bv) return -1;
        return 0;
      };
      switch (sortKey) {
        case 'name_asc': arr.sort((a,b)=>compare(a,b,'name')); break;
        case 'name_desc': arr.sort((a,b)=>-compare(a,b,'name')); break;
        case 'company_asc': arr.sort((a,b)=>compare(a,b,'company')); break;
        case 'company_desc': arr.sort((a,b)=>-compare(a,b,'company')); break;
        default: break;
      }
      return arr;
    }, [customers, customerSearch, sortKey, filterCompany, filterEmail, filterPhone]);
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <ConfirmDeleteModal
          open={deleteCustomerModal.open}
          title="Delete Customer?"
          description="This customer will be permanently deleted and cannot be recovered."
          confirmText="Delete"
          loading={deleteCustomerLoading}
          onCancel={cancelDeleteCustomer}
          onConfirm={confirmDeleteCustomer}
        />
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Customers</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>setShowAdd(true)}>Add Customer</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>navigate('/placeholder/sales-order')}>Go to Sales Order</button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <input
              className="px-3 py-2 border rounded-lg text-sm w-64"
              placeholder="Search customers"
              value={customerSearch}
              onChange={(e)=>setCustomerSearch(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700">Sort</span>
              <select className="px-2 py-2 border rounded-lg text-xs" value={sortKey} onChange={(e)=>setSortKey(e.target.value)}>
                <option value="name_asc">Name A–Z</option>
                <option value="name_desc">Name Z–A</option>
                <option value="company_asc">Company A–Z</option>
                <option value="company_desc">Company Z–A</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700">Type</span>
              <select className="px-2 py-2 border rounded-lg text-xs" value={filterCompany} onChange={(e)=>setFilterCompany(e.target.value)}>
                <option value="all">All</option>
                <option value="company">Company</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700">Email</span>
              <select className="px-2 py-2 border rounded-lg text-xs" value={filterEmail} onChange={(e)=>setFilterEmail(e.target.value)}>
                <option value="all">All</option>
                <option value="has">Has</option>
                <option value="missing">Missing</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700">Phone</span>
              <select className="px-2 py-2 border rounded-lg text-xs" value={filterPhone} onChange={(e)=>setFilterPhone(e.target.value)}>
                <option value="all">All</option>
                <option value="has">Has</option>
                <option value="missing">Missing</option>
              </select>
            </div>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>{
              setCustomerSearch('');
              setSortKey('name_asc');
              setFilterCompany('all');
              setFilterEmail('all');
              setFilterPhone('all');
            }}>Clear</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>window.print()}>Print</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>{
              const subject = encodeURIComponent('Customer List');
              const body = encodeURIComponent('Please find the customer list.');
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}>Email</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>{
              const header = ['Name','Company','Email','Phone','Bill To','Ship To'];
              const rows = filtered.map(c => [c.name || '', c.company || '', c.mainEmail || '', c.mainPhone || '', (c.billTo || c.address || '').replace(/\n/g,' '), (c.shipTo || c.address || '').replace(/\n/g,' ')]);
              const csv = [header, ...rows].map(x => x.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'customers.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}>Export</button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-[980px] w-full table-fixed border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-xs text-gray-700 text-left border border-gray-200 relative" style={{ width: custWidths[0] }}>
                    Name
                    <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onCustMouseDown(0,e)}></div>
                  </th>
                  <th className="px-3 py-2 text-xs text-gray-700 text-left border border-gray-200 relative" style={{ width: custWidths[1] }}>
                    Company
                    <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onCustMouseDown(1,e)}></div>
                  </th>
                  <th className="px-3 py-2 text-xs text-gray-700 text-left border border-gray-200 relative" style={{ width: custWidths[2] }}>
                    Email
                    <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onCustMouseDown(2,e)}></div>
                  </th>
                  <th className="px-3 py-2 text-xs text-gray-700 text-left border border-gray-200 relative" style={{ width: custWidths[3] }}>
                    Phone
                    <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onCustMouseDown(3,e)}></div>
                  </th>
                  <th className="px-3 py-2 text-xs text-gray-700 text-left border border-gray-200 relative" style={{ width: custWidths[4] }}>
                    Bill To
                    <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onCustMouseDown(4,e)}></div>
                  </th>
                  <th className="px-3 py-2 text-xs text-gray-700 text-left border border-gray-200 relative" style={{ width: custWidths[5] }}>
                    Ship To
                    <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onCustMouseDown(5,e)}></div>
                  </th>
                  <th className="px-3 py-2 text-xs text-gray-700 text-center border border-gray-200 relative" style={{ width: custWidths[6] }}>
                    Actions
                    <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onCustMouseDown(6,e)}></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c)=>(
                  <tr key={c.name + (c.mainEmail || '')} className="align-top">
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900" style={{ width: custWidths[0] }}>{c.name || '—'}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-800" style={{ width: custWidths[1] }}>{c.company || '—'}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-800" style={{ width: custWidths[2] }}>{c.mainEmail || '—'}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-800" style={{ width: custWidths[3] }}>{c.mainPhone || '—'}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-800 whitespace-pre-line" style={{ width: custWidths[4] }}>{c.billTo || c.address || ''}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-800 whitespace-pre-line" style={{ width: custWidths[5] }}>{c.shipTo || c.address || ''}</td>
                    <td className="px-3 py-2 border border-gray-200 text-center" style={{ width: custWidths[6] }}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-100 text-xs"
                          onClick={()=>{
                            try {
                              localStorage.setItem('selectedCustomerForOrder', JSON.stringify(c));
                            } catch {}
                            window.dispatchEvent(new CustomEvent('dataUpdated'));
                            navigate('/placeholder/sales-order');
                          }}
                        >Use</button>
                        {canDelete ? (
                          <button
                            data-delete-trigger="true"
                            className="px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 text-xs"
                            onClick={()=>deleteCustomer(c)}
                          >Delete</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-3 py-2 text-sm text-gray-600" colSpan={7}>No customers yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {showAdd && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
            <div className="bg-white border border-gray-200 rounded-xl w-full max-w-xl">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="text-gray-900 font-semibold">Add Customer</div>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Name</div>
                  <input className="w-full px-3 py-2 border rounded-lg text-sm" value={newCustomer.name} onChange={(e)=>setNewCustomer(prev=>({ ...prev, name: e.target.value }))} placeholder="Customer name" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Company</div>
                  <input className="w-full px-3 py-2 border rounded-lg text-sm" value={newCustomer.company} onChange={(e)=>setNewCustomer(prev=>({ ...prev, company: e.target.value }))} placeholder="Company (optional)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Email</div>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={newCustomer.mainEmail} onChange={(e)=>setNewCustomer(prev=>({ ...prev, mainEmail: e.target.value }))} placeholder="Email" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Phone</div>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={newCustomer.mainPhone} onChange={(e)=>setNewCustomer(prev=>({ ...prev, mainPhone: e.target.value }))} placeholder="Phone" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Bill To</div>
                    <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-24" value={newCustomer.billTo} onChange={(e)=>setNewCustomer(prev=>({ ...prev, billTo: e.target.value }))} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Ship To</div>
                    <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-24" value={newCustomer.shipTo} onChange={(e)=>setNewCustomer(prev=>({ ...prev, shipTo: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={addCustomer}>OK</button>
                <button className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100" onClick={()=>setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const SalesCredit = () => {
    const navigate = useNavigate();
    const [saveLoading, setSaveLoading] = useState('');
    const [creditForm, setCreditForm] = useState({
      name: '',
      phone: '',
      dueDate: new Date().toISOString().slice(0,10),
      notes: ''
    });
    const [customers, setCustomers] = useState([]);
    const [showCustomerMenu, setShowCustomerMenu] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
      name: '',
      company: '',
      mainEmail: '',
      mainPhone: '',
      billTo: '',
      shipTo: ''
    });
    const unitOptions = UNIT_OPTIONS;
    const CREDIT_PAD = 6;
    const nextCreditInit = (() => {
      try {
        const v = parseInt(localStorage.getItem('nextCreditNumber') || '5000', 10);
        return Number.isFinite(v) ? v : 5000;
      } catch { return 5000; }
    })();
    const [header, setHeader] = useState({
      creditNumber: String(nextCreditInit).padStart(CREDIT_PAD, '0'),
      creditDate: new Date().toISOString().slice(0,10),
      terms: 'Net 30'
    });
    const [vatEnabled, setVatEnabled] = useState(false);
    const VAT_RATE = 0.18;
    const [creditItems, setCreditItems] = useState([{ item: '', description: '', unit: 'kg', qty: 1, rate: 0 }]);
    const loadCustomers = useCallback(async () => {
      try {
        const list = await customersApi.list();
        setCustomers(Array.isArray(list) ? list : []);
      } catch {
        setCustomers([]);
      }
    }, []);
    const creditTotals = useMemo(() => {
      const subtotal = creditItems.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
      const tax = vatEnabled ? subtotal * VAT_RATE : 0;
      const shipping = 0;
      const total = subtotal + tax + shipping;
      return { subtotal, tax, shipping, total };
    }, [creditItems, vatEnabled]);
    React.useEffect(() => {
      void loadCustomers();
    }, [loadCustomers]);
    React.useEffect(() => {
      const handler = () => {
        void loadCustomers();
      };
      window.addEventListener('dataUpdated', handler);
      return () => window.removeEventListener('dataUpdated', handler);
    }, [loadCustomers]);
    React.useEffect(() => {
      let alive = true;
      const loadNextCreditNumber = async () => {
        const sales = await salesApi.list().catch(() => []);
        if (!alive) return;
        const maxCreditNumber = (Array.isArray(sales) ? sales : []).reduce((max, sale) => {
          if (String(sale?.paymentMethod || '').toLowerCase() !== 'credit') return max;
          const rawNumber = String(sale?.creditNumber || sale?.saleNumber || sale?.orderNumber || '').trim();
          const parsed = parseInt(rawNumber, 10);
          return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
        }, nextCreditInit - 1);
        const nextNum = Math.max(maxCreditNumber + 1, nextCreditInit);
        setHeader((prev) => ({ ...prev, creditNumber: String(nextNum).padStart(CREDIT_PAD, '0') }));
        try {
          localStorage.setItem('nextCreditNumber', String(nextNum));
        } catch {}
      };
      void loadNextCreditNumber();
      return () => {
        alive = false;
      };
    }, []);
    const addCustomer = async () => {
      const displayName = (newCustomer.name || '').trim() || (newCustomer.company || '').trim();
      if (!displayName) return;
      try {
        await customersApi.create({ ...newCustomer, name: displayName });
        await loadCustomers();
        setCreditForm(prev => ({
          ...prev,
          name: displayName,
          phone: newCustomer.mainPhone || ''
        }));
      } catch (err) {
        try { window.alert(String(err?.message || 'Unable to save customer')); } catch {}
        return;
      }
      setShowCustomerModal(false);
    };
    const saveCreditSale = async () => {
      const name = (creditForm.name || '').trim();
      const phone = (creditForm.phone || '').trim();
      const dueDate = (creditForm.dueDate || '').slice(0,10);
      if (!name || !dueDate) return false;
      const first = creditItems[0] || { qty: 0, unit: '', rate: 0 };
      const qtyNum = Number(first.qty) || 0;
      const rateNum = Number(first.rate) || 0;
      const unit = first.unit || '';
      const amountFinal = creditTotals.total;
      const entry = {
        id: Date.now(),
        creditNumber: header.creditNumber,
        creditDate: header.creditDate,
        terms: header.terms,
        name,
        phone,
        amount: amountFinal,
        qty: qtyNum,
        unit,
        rate: rateNum,
        items: creditItems.map(r => ({
          item: r.item || '',
          description: r.description || '',
          unit: r.unit || '',
          qty: Number(r.qty) || 0,
          rate: Number(r.rate) || 0,
          amount: (Number(r.qty)||0) * (Number(r.rate)||0
          )
        })),
        dueDate,
        notes: (creditForm.notes || '').trim(),
        status: 'Open',
        createdAt: new Date().toISOString()
      };
      try {
        await salesApi.create({
          saleNumber: header.creditNumber,
          date: header.creditDate,
          customerName: name,
          phone,
          paymentMethod: 'credit',
          status: 'Open',
          paymentTerms: header.terms,
          dueDate,
          amount: amountFinal,
          subtotal: creditTotals.subtotal,
          tax: creditTotals.tax,
          shipping: creditTotals.shipping,
          finalTotal: amountFinal,
          amountPaid: 0,
          balanceDue: amountFinal,
          notes: (creditForm.notes || '').trim(),
          items: creditItems.map((r) => ({
            item: r.item || '',
            description: r.description || '',
            unit: r.unit || '',
            qty: Number(r.qty) || 0,
            rate: Number(r.rate) || 0,
            total: (Number(r.qty) || 0) * (Number(r.rate) || 0)
          }))
        });
        const currentNumber = parseInt(String(header.creditNumber || ''), 10);
        const nextNum = (Number.isFinite(currentNumber) ? currentNumber : nextCreditInit) + 1;
        try {
          localStorage.setItem('nextCreditNumber', String(nextNum));
        } catch {}
        setHeader(prev => ({ ...prev, creditNumber: String(nextNum).padStart(CREDIT_PAD, '0') }));
        setCreditForm({
          name: '',
          phone: '',
          dueDate: new Date().toISOString().slice(0,10),
          notes: ''
        });
        setCreditItems([{ item: '', description: '', unit: 'kg', qty: 1, rate: 0 }]);
        return true;
      } catch (error) {
        try {
          window.alert(error?.message || 'Failed to save credit sale.');
        } catch {}
        return false;
      }
    };
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Credit Sales</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>navigate('/placeholder/credit-history')}>Show History</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm flex items-center gap-2" onClick={()=>{
              const subject = `Credit Note ${header.creditNumber}`;
              const body = `Credit Date: ${header.creditDate}\nTerms: ${header.terms}\nTotal: ${creditTotals.total.toLocaleString()}\nDue: ${creditForm.dueDate}\nCustomer: ${(creditForm.name||'')}\n\nGenerated from EggPro.`;
              const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
              window.location.href = mailto;
            }}>
              <Mail size={16} />
              <span>Email</span>
            </button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm flex items-center gap-2" onClick={()=>{
              try {
                const shareData = {
                  title: `Credit Note ${header.creditNumber}`,
                  text: `Total: ${creditTotals.total.toLocaleString()} • Due: ${creditForm.dueDate}`,
                  url: window.location.href
                };
                if (navigator.share) {
                  navigator.share(shareData);
                } else {
                  navigator.clipboard && navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
                  alert('Share data copied to clipboard');
                }
              } catch {}
            }}>
              <Share2 size={16} />
              <span>Share</span>
            </button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm flex items-center gap-2" onClick={()=>window.print()}>
              <Printer size={16} />
              <span>Print</span>
            </button>
            {canDelete ? (
              <button className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm flex items-center gap-2" onClick={()=>{
                setCreditForm({ name:'', phone:'', dueDate:new Date().toISOString().slice(0,10), notes:'' });
                setCreditItems([{ item:'', description:'', unit:'kg', qty:1, rate:0 }]);
              }}>
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div>
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="px-4 py-2 flex items-end gap-2">
              <div className="w-80 relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Customer</label>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 px-3 py-2 border rounded-lg text-base"
                    value={creditForm.name}
                    onChange={(e)=>setCreditForm(prev=>({ ...prev, name: e.target.value }))}
                    placeholder="Select or type customer"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 border rounded-lg hover:bg-gray-100"
                    onClick={() => setShowCustomerMenu(v => !v)}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showCustomerMenu && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow">
                    <div className="max-h-48 overflow-auto">
                      {customers.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No customers yet</div>
                      )}
                      {customers.map((c) => (
                        <button
                          key={c.name + (c.mainEmail || '')}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                          onClick={() => {
                            setCreditForm(prev=>({
                              ...prev,
                              name: c.name || c.company || '',
                              phone: c.mainPhone || ''
                            }));
                            setShowCustomerMenu(false);
                          }}
                        >
                          {c.name || c.company} {c.mainEmail ? `• ${c.mainEmail}` : ''}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-200">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                        onClick={() => {
                          setShowCustomerMenu(false);
                          setShowCustomerModal(true);
                        }}
                      >
                        <UserPlus size={16} />
                        Add new customer
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" value={creditForm.phone} onChange={(e)=>setCreditForm(prev=>({ ...prev, phone: e.target.value }))} placeholder="Phone" />
              </div>
              <div className="w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
                <DateInput className="w-full px-3 py-2 border rounded-lg text-sm" value={creditForm.dueDate} onChange={(e)=>setCreditForm(prev=>({ ...prev, dueDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-xs text-gray-700">Credit Number</div>
              <input className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" value={header.creditNumber} readOnly />
            </div>
            <div>
              <div className="text-xs text-gray-700">Credit Date</div>
              <DateInput className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" value={header.creditDate} onChange={(e)=>setHeader(prev=>({ ...prev, creditDate: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-700">Terms</div>
              <input className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" value={header.terms} onChange={(e)=>setHeader(prev=>({ ...prev, terms: e.target.value }))} />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold">Credit Items</div>
              <button className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2" onClick={()=>setCreditItems(prev=>[...prev, { item:'', description:'', unit:'kg', qty:1, rate:0 }])}>
                <Plus size={16} />
                <span className="text-sm">Add Line</span>
              </button>
            </div>
            <div className="p-4 overflow-auto">
              <table className="min-w-[980px] w-full table-fixed border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center w-1/12 border border-gray-200">No.</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-3/12 border border-gray-200">Item</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-2/12 border border-gray-200">Description</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-1/12 border border-gray-200">Unit</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Qty</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Rate</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-2/12 border border-gray-200">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {creditItems.map((row, i) => {
                    const amount = (Number(row.qty)||0) * (Number(row.rate)||0);
                    return (
                      <tr key={i} className="align-middle">
                        <td className="px-3 py-2 border border-gray-200 text-center select-none">{i + 1}</td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.item} onChange={(e)=>setCreditItems(prev=>prev.map((r,idx)=>idx===i?{...r,item:e.target.value}:r))} placeholder="Product or service" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.description} onChange={(e)=>setCreditItems(prev=>prev.map((r,idx)=>idx===i?{...r,description:e.target.value}:r))} placeholder="Description" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <select className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.unit} onChange={(e)=>setCreditItems(prev=>prev.map((r,idx)=>idx===i?{...r,unit:e.target.value}:r))}>
                            {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input type="number" min="0" className="w-full px-2 py-1 text-sm text-right no-spin bg-transparent focus:outline-none" inputMode="numeric" value={row.qty} onChange={(e)=>setCreditItems(prev=>prev.map((r,idx)=>idx===i?{...r,qty:e.target.value.replace(/[^0-9.]/g,'')}:r))} placeholder="0" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input type="number" min="0" className="w-full px-2 py-1 text-sm text-right no-spin bg-transparent focus:outline-none" inputMode="decimal" value={row.rate} onChange={(e)=>setCreditItems(prev=>prev.map((r,idx)=>idx===i?{...r,rate:e.target.value.replace(/[^0-9.]/g,'')}:r))} placeholder="0.00" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input className="w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none" value={amount.toLocaleString()} readOnly aria-label="Amount" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="flex">
              <div className="bg-white border border-gray-200 rounded-xl p-4 w-full md:max-w-sm">
                <div className="text-sm font-medium text-gray-700 mb-1">Customer Message</div>
                <textarea className="w-full px-3 py-2 border rounded-lg h-10 text-sm" value={creditForm.notes} onChange={(e)=>setCreditForm(prev=>({ ...prev, notes: e.target.value }))} placeholder="Short message for the customer" />
              </div>
            </div>
            <div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">VAT (18%)</span>
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={vatEnabled} onChange={(e)=>setVatEnabled(e.target.checked)} />
                      <div className="w-9 h-5 bg-gray-200 peer-checked:bg-green-500 rounded-full relative transition-colors">
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${vatEnabled ? 'translate-x-4' : ''}`}></div>
                      </div>
                    </label>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{creditTotals.tax.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">{creditTotals.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Shipping</span>
                  <span className="text-sm font-semibold text-gray-900">{creditTotals.shipping.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">{creditTotals.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              className={saveLoading ? 'px-4 py-2 rounded-lg bg-green-600/70 text-white cursor-not-allowed inline-flex items-center gap-2' : 'px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2'}
              onClick={() => {
                if (saveLoading) return;
                setSaveLoading('close');
                void withMinimumDelay(async () => {
                  const ok = await saveCreditSale();
                  if (!ok) return;
                  navigate('/placeholder/credit-history');
                }, 5000).finally(() => {
                  setSaveLoading('');
                });
              }}
              disabled={!!saveLoading}
              type="button"
            >
              {saveLoading === 'close' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{saveLoading === 'close' ? 'Saving...' : 'Save & Close'}</span>
            </button>
            <button
              className={saveLoading ? 'px-4 py-2 rounded-lg bg-blue-600/70 text-white cursor-not-allowed inline-flex items-center gap-2' : 'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2'}
              onClick={() => {
                if (saveLoading) return;
                setSaveLoading('new');
                void withMinimumDelay(async () => {
                  const ok = await saveCreditSale();
                  if (!ok) return;
                  setCreditItems([{ item:'', description:'', unit:'kg', qty:1, rate:0 }]);
                }, 5000).finally(() => {
                  setSaveLoading('');
                });
              }}
              disabled={!!saveLoading}
              type="button"
            >
              {saveLoading === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{saveLoading === 'new' ? 'Saving...' : 'Save & New'}</span>
            </button>
            <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100" onClick={()=>{ setCreditItems([{ item:'', description:'', unit:'kg', qty:1, rate:0 }]); setCreditForm({ name:'', phone:'', dueDate:new Date().toISOString().slice(0,10), notes:'' }); }}>Clear</button>
          </div>
          </div>
          <div className="border-l border-gray-200 bg-gray-50 p-5">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Summary</div>
              <div className="space-y-2 text-sm text-gray-700 italic">
                <div className="flex justify-between">
                  <span>Customer</span>
                  <span className="font-medium text-gray-900">{creditForm.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credit No</span>
                  <span className="font-medium text-gray-900">{header.creditNumber || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credit Date</span>
                  <span className="font-medium text-gray-900">{header.creditDate || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date</span>
                  <span className="font-medium text-gray-900">{creditForm.dueDate || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{creditTotals.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-medium text-gray-900">{creditTotals.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-semibold text-gray-900">{creditTotals.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Notes</div>
              <div className="text-sm text-gray-600">Use this panel to review totals before saving.</div>
            </div>
          </div>
        </div>
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
            <div className="bg-white border border-gray-200 rounded-xl w-full max-w-xl">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="text-gray-900 font-semibold">Add Customer</div>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Name</div>
                  <input className="w-full px-3 py-2 border rounded-lg text-sm" value={newCustomer.name} onChange={(e)=>setNewCustomer(prev=>({ ...prev, name: e.target.value }))} placeholder="Customer name" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Company</div>
                  <input className="w-full px-3 py-2 border rounded-lg text-sm" value={newCustomer.company} onChange={(e)=>setNewCustomer(prev=>({ ...prev, company: e.target.value }))} placeholder="Company (optional)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Email</div>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={newCustomer.mainEmail} onChange={(e)=>setNewCustomer(prev=>({ ...prev, mainEmail: e.target.value }))} placeholder="Email" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Phone</div>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={newCustomer.mainPhone} onChange={(e)=>setNewCustomer(prev=>({ ...prev, mainPhone: e.target.value }))} placeholder="Phone" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Bill To</div>
                    <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-24" value={newCustomer.billTo} onChange={(e)=>setNewCustomer(prev=>({ ...prev, billTo: e.target.value }))} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">Ship To</div>
                    <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-24" value={newCustomer.shipTo} onChange={(e)=>setNewCustomer(prev=>({ ...prev, shipTo: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={addCustomer}>OK</button>
                <button className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100" onClick={()=>setShowCustomerModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const CreditHistory = () => {
    const navigate = useNavigate();
    const [credits, setCredits] = useState([]);
    const [fromDate, setFromDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0,10));
    const [sortKey, setSortKey] = useState('date_desc');
    const [hideHeader, setHideHeader] = useState(false);
    const [periodLabel] = useState('This Month-to-date');
    React.useEffect(() => {
      let alive = true;
      const loadCredits = async () => {
        const sales = await salesApi.list().catch(() => []);
        if (!alive) return;
        const creditRows = (Array.isArray(sales) ? sales : []).filter(
          (sale) => String(sale?.paymentMethod || '').toLowerCase() === 'credit'
        );
        setCredits(creditRows);
      };
      const handler = () => {
        void loadCredits();
      };
      void loadCredits();
      window.addEventListener('dataUpdated', handler);
      return () => {
        alive = false;
        window.removeEventListener('dataUpdated', handler);
      };
    }, []);
    const filteredRows = useMemo(() => {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      const rows = (credits || []).filter(c => {
        const d = new Date(c.creditDate || c.createdAt || '');
        if (isNaN(d) || d < start || d > end) return false;
        return true;
      }).sort((a,b)=>{
        switch (sortKey) {
          case 'date_asc': return (a.creditDate || a.createdAt || '') > (b.creditDate || b.createdAt || '') ? 1 : -1;
          case 'date_desc': return (a.creditDate || a.createdAt || '') < (b.creditDate || b.createdAt || '') ? 1 : -1;
          case 'name_asc': return (a.name || '').localeCompare(b.name || '');
          case 'name_desc': return (b.name || '').localeCompare(a.name || '');
          default: return 0;
        }
      });
      return rows;
    }, [credits, fromDate, toDate, sortKey]);
    const exportExcel = () => {
      const header = ['Date', 'Credit No', 'Customer', 'Phone', 'Qty', 'Unit', 'Rate', 'Amount', 'Due', 'Status'];
      const rows = filteredRows.map((cs) => [
        String(cs.creditDate || cs.createdAt || '').slice(0, 10),
        String(cs.creditNumber || ''),
        String(cs.name || ''),
        String(cs.phone || ''),
        String(Number(cs.qty || 0)),
        String(cs.unit || ''),
        String(Number(cs.rate || 0)),
        String(Number(cs.amount || 0)),
        String(cs.dueDate || ''),
        String(cs.status || '')
      ]);
      downloadExcelFile(`credit_history_${new Date().toISOString().slice(0, 10)}.xls`, {
        title: 'Credit History',
        subtitle: `${String(fromDate || '').slice(0, 10)} - ${String(toDate || '').slice(0, 10)}`,
        rows: [header, ...rows]
      });
    };
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Credit History</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>navigate('/placeholder/sales-credit')}>New Credit</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={exportExcel}>Excel</button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 text-sm">{periodLabel}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">From</span>
              <DateInput className="px-3 py-2 border rounded-lg text-sm" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">To</span>
              <DateInput className="px-3 py-2 border rounded-lg text-sm" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Sort By</span>
              <select className="px-3 py-2 border rounded-lg text-sm" value={sortKey} onChange={(e)=>setSortKey(e.target.value)}>
                <option value="date_desc">Default</option>
                <option value="date_asc">Date Asc</option>
                <option value="name_asc">Customer A→Z</option>
                <option value="name_desc">Customer Z→A</option>
              </select>
            </div>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>setHideHeader(v=>!v)}>{hideHeader ? 'Show Header' : 'Hide Header'}</button>
          </div>
          {!hideHeader && (
            <div className="text-center mt-4">
              <div className="text-xs text-gray-600">Accrual Basis</div>
              <div className="text-lg font-semibold text-gray-900">Credit Notes Detail</div>
              <div className="text-sm text-gray-700">{formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}</div>
            </div>
          )}
          <div className="mt-4 overflow-auto">
            <table className="w-full table-fixed border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Date</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Credit No</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Customer</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-right border border-gray-200">Qty</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Unit</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-right border border-gray-200">Rate</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-right border border-gray-200">Amount</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Due</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(cs => (
                  <tr key={cs.id}>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{(cs.creditDate || '').slice(0,10)}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{cs.creditNumber || ''}</td>
                    <td className="px-3 py-2 border border-gray-200">
                      <div className="text-sm font-medium text-gray-900">{cs.name}</div>
                      <div className="text-xs text-gray-600">{cs.phone || ''}</div>
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-right text-sm text-gray-900">{Number(cs.qty || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{cs.unit}</td>
                    <td className="px-3 py-2 border border-gray-200 text-right text-sm text-gray-900">{Number(cs.rate || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 border border-gray-200 text-right text-sm font-semibold text-gray-900">{Number(cs.amount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{cs.dueDate}</td>
                    <td className="px-3 py-2 border border-gray-200">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${cs.status === 'Paid' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                        {cs.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-sm text-gray-600" colSpan={9}>No credit sales found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const SalesReturns = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [saveLoading, setSaveLoading] = useState('');
    const RMA_PAD = 6;
    const nextRmaInit = 7000;
    const viewRmaNo = useMemo(() => {
      const params = new URLSearchParams(String(location.search || ''));
      return String(params.get('rmaNo') || '').trim();
    }, [location.search]);
    const defaultReportedBy = useMemo(
      () => String(currentUser?.fullName || currentUser?.name || currentUser?.username || currentUser?.email || '').trim(),
      [currentUser?.email, currentUser?.fullName, currentUser?.name, currentUser?.username]
    );
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [deleteDamageModalOpen, setDeleteDamageModalOpen] = useState(false);
    const [deleteDamageLoading, setDeleteDamageLoading] = useState(false);
    const [header, setHeader] = useState({
      rmaNumber: String(nextRmaInit).padStart(RMA_PAD, '0'),
      rmaDate: new Date().toISOString().slice(0,10),
      windowDays: '30'
    });
    const [form, setForm] = useState(() => ({ name: defaultReportedBy, phone: '', notes: '' }));
    const defaultUnit = 'item';
    const [items, setItems] = useState([{ item: '', description: '', unit: defaultUnit, qty: 1, price: 0, reason: '', restock: true }]);
    const [availableProducts, setAvailableProducts] = useState([]);
    const [vatEnabled, setVatEnabled] = useState(false);
    const VAT_RATE = 0.18;
    const [restockPercent, setRestockPercent] = useState('0');
    const resetDamageForm = useCallback(async () => {
      const list = await damageStocksApi.list().catch(() => []);
      const nextInfo = damageStocksApi.getNextDamageNumber(list);
      setEditMode(false);
      setEditId(null);
      setHeader({
        rmaNumber: String(nextInfo?.rmaNumber || nextRmaInit).padStart(RMA_PAD, '0'),
        rmaDate: new Date().toISOString().slice(0, 10),
        windowDays: '30'
      });
      setForm({ name: defaultReportedBy, phone: '', notes: '' });
      setItems([{ item: '', description: '', unit: defaultUnit, qty: 1, price: 0, reason: '', restock: true }]);
      setVatEnabled(false);
      setRestockPercent('0');
    }, [defaultReportedBy, defaultUnit, nextRmaInit]);
    const totals = useMemo(() => {
      const subtotal = items.reduce((s, r) => s + (Number(r.qty)||0) * (Number(r.price)||0), 0);
      const tax = vatEnabled ? subtotal * VAT_RATE : 0;
      const restockFee = subtotal * (Number(restockPercent||0)/100);
      const shippingReverse = 0;
      const lossTotal = subtotal + tax - restockFee - shippingReverse;
      return { subtotal, tax, restockFee, shippingReverse, lossTotal };
    }, [items, vatEnabled, restockPercent]);
    useEffect(() => {
      if (viewRmaNo) return;
      let alive = true;
      Promise.resolve()
        .then(async () => {
          const list = await damageStocksApi.list().catch(() => []);
          const nextInfo = damageStocksApi.getNextDamageNumber(list);
          if (!alive) return;
          setHeader((prev) => ({ ...prev, rmaNumber: String(nextInfo?.rmaNumber || nextRmaInit).padStart(RMA_PAD, '0') }));
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [nextRmaInit, viewRmaNo]);

    useEffect(() => {
      if (!viewRmaNo) {
        setEditMode(false);
        setEditId(null);
        return;
      }
      let alive = true;
      Promise.resolve()
        .then(async () => {
          const list = await damageStocksApi.list().catch(() => []);
          const target = String(viewRmaNo || '').trim();
          const found = (Array.isArray(list) ? list : []).find((r) => String(r?.rmaNumber || r?.rmaNo || '').trim() === target) || null;
          if (!alive || !found) return;
          setEditMode(true);
          setEditId(found?.id ?? null);
          setHeader((prev) => ({
            ...prev,
            rmaNumber: String(found?.rmaNumber || viewRmaNo).trim(),
            rmaDate: String(found?.rmaDate || prev.rmaDate || '').slice(0, 10) || prev.rmaDate,
            windowDays: String(found?.windowDays || prev.windowDays || '30')
          }));
          setForm({ name: String(found?.reportedBy || found?.name || ''), phone: String(found?.phone || ''), notes: String(found?.notes || '') });
          setVatEnabled(Boolean(found?.vatEnabled));
          setRestockPercent(String(found?.restockPercent ?? '0'));
          const lines = Array.isArray(found?.items) ? found.items : [];
          setItems(
            lines.length
              ? lines.map((r) => ({
                  item: String(r?.item || r?.itemName || ''),
                  description: String(r?.description || ''),
                  unit: String(r?.unit || defaultUnit),
                  qty: Number(r?.qty || 0) || 0,
                  price: Number(r?.price || 0) || 0,
                  reason: String(r?.reason || ''),
                  restock: true
                }))
              : [{ item: '', description: '', unit: defaultUnit, qty: 1, price: 0, reason: '', restock: true }]
          );
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [defaultUnit, viewRmaNo]);
    useEffect(() => {
      let alive = true;
      Promise.resolve()
        .then(async () => {
          const snapshot = await productsApi.loadInventorySnapshot();
          const inventory = Array.isArray(snapshot?.items) ? snapshot.items : [];
          const moves = Array.isArray(snapshot?.movements) ? snapshot.movements : [];

          const norm = (v) => String(v || '').trim().toLowerCase();
          const qtyMap = new Map();
          const nameMap = new Map();
          const addQty = (name, delta) => {
            const display = String(name || '').trim();
            const key = norm(name);
            if (!key) return;
            if (display && !nameMap.has(key)) nameMap.set(key, display);
            const cur = qtyMap.get(key) || 0;
            qtyMap.set(key, cur + (Number(delta) || 0));
          };
          (Array.isArray(moves) ? moves : []).forEach((m) => {
            const type = String(m?.movementType || '').trim().toLowerCase();
            const qty = Number(m?.quantity || 0) || 0;
            if (!qty) return;
            if (type === 'stock_in') addQty(m?.itemName, qty);
            else if (type === 'stock_out') addQty(m?.itemName, -qty);
            else addQty(m?.itemName, qty);
          });

          const productMap = new Map();
          (Array.isArray(inventory) ? inventory : []).forEach((it) => {
            const name = String(it?.name || it?.itemName || '').trim();
            const key = norm(name);
            if (!key) return;
            const unit = String(it?.unit || defaultUnit || '').trim() || defaultUnit;
            const price = Number(it?.sellingPrice ?? it?.sellPrice ?? it?.price ?? 0) || 0;
            const category = String(it?.category || it?.itemType || 'general').trim() || 'general';
            if (!productMap.has(key)) productMap.set(key, { productId: String(it?.id || ''), name, unit, price, category });
          });

          const out = Array.from(productMap.entries())
            .map(([key, v]) => ({
              key,
              name: v.name,
              unit: v.unit,
              price: v.price,
              category: v.category,
              availableQty: Number(qtyMap.get(key) || 0)
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          if (!alive) return;
          setAvailableProducts(out);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [defaultUnit]);

    const applySelectedProduct = (index, productName) => {
      const norm = (v) => String(v || '').trim().toLowerCase();
      const key = norm(productName);
      const found = (availableProducts || []).find((p) => p.key === key);
      if (!found) return;
      setItems((prev) =>
        prev.map((r, idx) => {
          if (idx !== index) return r;
          const next = { ...r, item: found.name };
          next.productId = found.productId || '';
          next.itemType = found.category || 'general';
          next.unit = found.unit || defaultUnit;
          const priceNum = Number(r.price || 0) || 0;
          if (!priceNum && Number(found.price || 0)) next.price = Number(found.price || 0);
          return next;
        })
      );
    };
    const saveReturn = async () => {
      const name = (form.name || defaultReportedBy || '').trim();
      const phone = (form.phone||'').trim();
      if (!name) {
        try { window.alert('Reported By is required'); } catch {}
        return false;
      }
      const norm = (v) => String(v || '').trim().toLowerCase();
      const availMap = new Map((availableProducts || []).map((p) => [p.key, Number(p.availableQty || 0)]));
      let anyLine = false;
      for (const r of items) {
        const itemName = String(r?.item || '').trim();
        const qty = Number(r?.qty || 0) || 0;
        if (!(qty > 0) && !itemName) continue;
        anyLine = true;
        if (!itemName) {
          try { window.alert('Select product for damaged item'); } catch {}
          return false;
        }
        if (!(qty > 0)) {
          try { window.alert(`Enter qty for ${itemName}`); } catch {}
          return false;
        }
        const key = norm(itemName);
        const availableQty = Number(availMap.get(key) ?? 0) || 0;
        if (qty > availableQty) {
          try { window.alert(`Not enough stock for ${itemName}. Available: ${availableQty}`); } catch {}
          return false;
        }
      }
      if (!anyLine) {
        try { window.alert('Add at least one damaged item'); } catch {}
        return false;
      }
      try {
        const record = await damageStocksApi.create({
          rmaNumber: header.rmaNumber,
          rmaDate: header.rmaDate,
          windowDays: header.windowDays,
          reportedBy: name,
          phone,
          notes: form.notes,
          vatEnabled,
          restockPercent,
          lossTotal: totals.lossTotal,
          items
        });
        setEditMode(true);
        setEditId(record?.id || null);
        setHeader((prev) => ({
          ...prev,
          rmaNumber: String(record?.rmaNumber || prev.rmaNumber || ''),
          rmaDate: String(record?.rmaDate || prev.rmaDate || '').slice(0, 10) || prev.rmaDate,
          windowDays: String(record?.windowDays || prev.windowDays || '30')
        }));
        appendSystemActivity(
          'damage_stock_create',
          'Damaged stock recorded',
          `${String(record?.rmaNumber || header.rmaNumber)} • TSH ${totals.lossTotal.toLocaleString()}`,
          'Damage Stock',
          'warning',
          { entityId: record?.id || '' }
        );
      } catch (err) {
        try { window.alert(String(err?.message || 'Unable to save damaged stock')); } catch {}
        return false;
      }
      return true;
    };

    const updateReturn = async () => {
      if (!editId) return false;
      const name = (form.name || defaultReportedBy || '').trim();
      const phone = (form.phone || '').trim();
      if (!name) return false;
      try {
        const record = await damageStocksApi.update(editId, {
          rmaNumber: header.rmaNumber,
          rmaDate: header.rmaDate,
          windowDays: header.windowDays,
          reportedBy: name,
          phone,
          notes: form.notes,
          vatEnabled,
          restockPercent,
          lossTotal: totals.lossTotal,
          items
        });
        appendSystemActivity(
          'damage_stock_update',
          'Damaged stock updated',
          `${String(record?.rmaNumber || header.rmaNumber)} updated`,
          'Damage Stock',
          'warning',
          { entityId: record?.id || editId }
        );
        return true;
      } catch (err) {
        try { window.alert(String(err?.message || 'Unable to update damaged stock')); } catch {}
        return false;
      }
    };

    const deleteReturn = async () => {
      const no = String(header.rmaNumber || '').trim();
      if (!no || !editId || deleteDamageLoading) return;
      setDeleteDamageLoading(true);
      try {
        await damageStocksApi.remove(editId);
        appendSystemActivity(
          'damage_stock_delete',
          'Damaged stock deleted',
          `${no} deleted`,
          'Damage Stock',
          'warning',
          { entityId: editId }
        );
        setDeleteDamageModalOpen(false);
        navigate('/placeholder/damage-history');
      } catch (err) {
        try { window.alert(String(err?.message || 'Unable to delete damaged stock')); } catch {}
      } finally {
        setDeleteDamageLoading(false);
      }
    };
    const cancelDeleteReturn = () => {
      if (deleteDamageLoading) return;
      setDeleteDamageModalOpen(false);
    };
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <ConfirmDeleteModal
          open={deleteDamageModalOpen}
          title="Delete Damage Record?"
          description={`This will permanently delete damage record ${header.rmaNumber || ''}.`}
          confirmText="Delete"
          loading={deleteDamageLoading}
          onCancel={cancelDeleteReturn}
          onConfirm={deleteReturn}
        />
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Damaged Stocks</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>navigate('/placeholder/damage-history')}>Show History</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm flex items-center gap-2" onClick={()=>window.print()}>
              <Printer size={16} />
              <span>Print</span>
            </button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm flex items-center gap-2" onClick={()=>{
              const subject = `Damaged Stock ${header.rmaNumber}`;
              const body = `Date: ${header.rmaDate}\nReported by: ${(form.name||'')}\nLoss: ${totals.lossTotal.toLocaleString()}`;
              window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }}>
              <Mail size={16} />
              <span>Email</span>
            </button>
            {canDelete ? (
              <button className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm flex items-center gap-2" onClick={()=>{
                if (editMode) setDeleteDamageModalOpen(true);
                else {
                  setForm({ name:'', phone:'', notes:'' });
                  setItems([{ item: '', description: '', unit: defaultUnit, qty: 1, price: 0, reason: '', restock: true }]);
                }
              }}>
                <Trash2 size={16} />
                <span>{editMode ? 'Delete Record' : 'Delete'}</span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-xs text-gray-700">Damage No</div>
              <input className="mt-1 w-full px-3 py-1.5 border rounded-lg text-sm" value={header.rmaNumber} readOnly />
            </div>
            <div>
              <div className="text-xs text-gray-700">Date</div>
              <DateInput className="mt-1 w-full px-3 py-1.5 border rounded-lg text-sm" value={header.rmaDate} onChange={(e)=>setHeader(prev=>({ ...prev, rmaDate: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-700">Window (days)</div>
              <input className="mt-1 w-full px-3 py-1.5 border rounded-lg text-sm" value={header.windowDays} onChange={(e)=>setHeader(prev=>({ ...prev, windowDays: e.target.value.replace(/[^0-9]/g,'') }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-xs text-gray-700">Reported By</div>
              <input className="mt-1 w-full px-3 py-1.5 border rounded-lg text-sm" value={form.name} onChange={(e)=>setForm(prev=>({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-700">Contact</div>
              <input className="mt-1 w-full px-3 py-1.5 border rounded-lg text-sm" value={form.phone} onChange={(e)=>setForm(prev=>({ ...prev, phone: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-700">Method</div>
              <select className="mt-1 w-full px-3 py-1.5 border rounded-lg text-sm">
                <option>Original</option>
                <option>Cash</option>
                <option>Bank</option>
                <option>Mobile Money</option>
                <option>Store Credit</option>
              </select>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold">Damaged Items</div>
              <button className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2" onClick={()=>setItems(prev=>[...prev,{ item: '', description: '', unit: defaultUnit, qty: 1, price: 0, reason: '', restock: true }])}>
                <Plus size={16} />
                <span className="text-sm">Add Line</span>
              </button>
            </div>
            <div className="p-4 overflow-auto">
              <table className="min-w-[1100px] w-full table-fixed border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center w-1/12 border border-gray-200">No.</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-3/12 border border-gray-200">Item</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-3/12 border border-gray-200">Description</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-1/12 border border-gray-200">Unit</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Qty Damaged</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Price</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Amount</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-2/12 border border-gray-200">Reason</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center w-1/12 border border-gray-200">Deduct Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => {
                    const amount = (Number(row.qty)||0) * (Number(row.price)||0);
                    return (
                      <tr key={i} className="align-middle">
                        <td className="px-3 py-2 border border-gray-200 text-center select-none">{i + 1}</td>
                        <td className="px-3 py-2 border border-gray-200">
                          <select
                            className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none"
                            value={row.item}
                            onChange={(e) => {
                              const v = e.target.value;
                              setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, item: v } : r)));
                              applySelectedProduct(i, v);
                            }}
                          >
                            <option value="">Select product</option>
                            {(availableProducts || []).map((p) => (
                              <option key={p.key} value={p.name}>
                                {p.name} ({Number(p.availableQty || 0).toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.description} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,description:e.target.value}:r))} placeholder="Description" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <select className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.unit} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,unit:e.target.value}:r))}>
                            {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input type="number" min="0" className="w-full px-2 py-1 text-sm text-right no-spin bg-transparent focus:outline-none" inputMode="numeric" value={row.qty} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,qty:e.target.value.replace(/[^0-9.]/g,'')}:r))} placeholder="0" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input type="number" min="0" className="w-full px-2 py-1 text-sm text-right no-spin bg-transparent focus:outline-none" inputMode="decimal" value={row.price} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,price:e.target.value.replace(/[^0-9.]/g,'')}:r))} placeholder="0.00" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input className="w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none" value={amount.toLocaleString()} readOnly aria-label="Amount" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.reason} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,reason:e.target.value}:r))} placeholder="Reason" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200 text-center">
                          <input type="checkbox" checked disabled />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="flex">
              <div className="bg-white border border-gray-200 rounded-xl p-4 w-full md:max-w-sm">
                <div className="text-sm font-medium text-gray-700 mb-1">Staff Notes</div>
                <textarea className="w-full px-3 py-2 border rounded-lg h-12 text-sm" value={form.notes} onChange={(e)=>setForm(prev=>({ ...prev, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
            </div>
            <div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">VAT (18%)</span>
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={vatEnabled} onChange={(e)=>setVatEnabled(e.target.checked)} />
                      <div className="w-9 h-5 bg-gray-200 peer-checked:bg-green-500 rounded-full relative transition-colors">
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${vatEnabled ? 'translate-x-4' : ''}`}></div>
                      </div>
                    </label>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{totals.tax.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">{totals.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Restocking Fee (%)</span>
                  <input className="w-24 px-2 py-1 border rounded-lg text-sm text-right" value={restockPercent} onChange={(e)=>setRestockPercent(e.target.value.replace(/[^0-9.]/g,''))} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Restocking Fee</span>
                  <span className="text-sm font-semibold text-gray-900">{totals.restockFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Loss Total</span>
                  <span className="text-lg font-bold text-gray-900">{totals.lossTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={!!saveLoading}
              className={saveLoading ? 'px-4 py-2 rounded-lg bg-green-600/70 text-white cursor-not-allowed inline-flex items-center gap-2' : 'px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2'}
              onClick={() => {
                if (saveLoading) return;
                let goTo = '';
                setSaveLoading('close');
                void withMinimumDelay(async () => {
                  const ok = editMode ? await updateReturn() : await saveReturn();
                  if (!ok) return;
                  goTo = editMode ? '/placeholder/damage-history' : '/placeholder/damage-stocks';
                }, 5000)
                  .finally(() => {
                    setSaveLoading('');
                    if (goTo) navigate(goTo);
                  });
              }}
            >
              {saveLoading === 'close' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{saveLoading === 'close' ? 'Saving...' : editMode ? 'Save Changes' : 'Save & Close'}</span>
            </button>
            <button
              type="button"
              disabled={!!saveLoading}
              className={saveLoading ? 'px-4 py-2 rounded-lg bg-blue-600/70 text-white cursor-not-allowed inline-flex items-center gap-2' : 'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2'}
              onClick={() => {
                if (saveLoading) return;
                let shouldReset = false;
                setSaveLoading('new');
                void withMinimumDelay(async () => {
                  const ok = editMode ? await updateReturn() : await saveReturn();
                  if (!ok) return;
                  shouldReset = !editMode;
                }, 5000)
                  .finally(() => {
                    setSaveLoading('');
                    if (shouldReset) void resetDamageForm();
                  });
              }}
            >
              {saveLoading === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{saveLoading === 'new' ? 'Saving...' : editMode ? 'Save Changes' : 'Save & New'}</span>
            </button>
            <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100" onClick={()=>{ setItems([{ item: '', description: '', unit: defaultUnit, qty: 1, price: 0, reason: '', restock: true }]); setForm({ name:'', phone:'', notes:'' }); }}>Clear</button>
          </div>
        </div>
      </div>
    );
  };

  const ReturnsHistory = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [fromDate, setFromDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0,10));
    const [sortKey, setSortKey] = useState('date_desc');
    const [hideHeader, setHideHeader] = useState(false);
    const [periodLabel] = useState('This Month-to-date');
    const loadRows = React.useCallback(async () => {
      const list = await damageStocksApi.list().catch(() => []);
      const lines = [];
      (Array.isArray(list) ? list : []).forEach((ret) => {
        (ret.items || []).forEach((it, idx) => {
          lines.push({
            id: `${ret.id}-${idx}`,
            date: String(ret.rmaDate || '').slice(0, 10),
            rmaNo: ret.rmaNumber || '',
            name: ret.reportedBy || ret.name || '',
            item: it.item || '',
            qty: Number(it.qty) || 0,
            unit: it.unit || '',
            price: Number(it.price) || 0,
            amount: (Number(it.qty) || 0) * (Number(it.price) || 0),
            restock: true
          });
        });
      });
      setRows(lines);
    }, []);
    React.useEffect(() => {
      let alive = true;
      Promise.resolve()
        .then(async () => {
          await loadRows();
        })
        .catch(() => {});
      const onEvent = () => {
        if (!alive) return;
        void loadRows();
      };
      window.addEventListener('dataUpdated', onEvent);
      return () => {
        alive = false;
        window.removeEventListener('dataUpdated', onEvent);
        void alive;
      };
    }, [loadRows]);
    const filtered = useMemo(() => {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const f = (rows || []).filter(r => {
        const d = new Date(r.date || '');
        if (isNaN(d) || d < start || d > end) return false;
        return true;
      }).sort((a,b)=>{
        switch (sortKey) {
          case 'date_asc': return a.date > b.date ? 1 : (a.date < b.date ? -1 : 0);
          case 'date_desc': return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
          case 'name_asc': return (a.name || '').localeCompare(b.name || '');
          case 'name_desc': return (b.name || '').localeCompare(a.name || '');
          default: return 0;
        }
      });
      return f;
    }, [rows, fromDate, toDate, sortKey]);
    const exportExcel = () => {
      const header = ['Date', 'Damage No', 'Reported By', 'Item', 'Qty', 'Unit', 'Price', 'Amount', 'Deducted'];
      const excelRows = filtered.map((r) => [
        String(r.date || ''),
        String(r.rmaNo || ''),
        String(r.name || ''),
        String(r.item || ''),
        String(Number(r.qty || 0)),
        String(r.unit || ''),
        String(Number(r.price || 0)),
        String(Number(r.amount || 0)),
        r.restock ? 'Yes' : 'No'
      ]);
      downloadExcelFile(`damaged_stock_history_${new Date().toISOString().slice(0, 10)}.xls`, {
        title: 'Damaged Stock History',
        subtitle: `${String(fromDate || '').slice(0, 10)} - ${String(toDate || '').slice(0, 10)}`,
        rows: [header, ...excelRows]
      });
    };
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Damaged Stock History</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>navigate('/placeholder/damage-stocks')}>New Record</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={exportExcel}>Excel</button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 text-sm">{periodLabel}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">From</span>
              <DateInput className="px-3 py-2 border rounded-lg text-sm" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">To</span>
              <DateInput className="px-3 py-2 border rounded-lg text-sm" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Sort By</span>
              <select className="px-3 py-2 border rounded-lg text-sm" value={sortKey} onChange={(e)=>setSortKey(e.target.value)}>
                <option value="date_desc">Default</option>
                <option value="date_asc">Date Asc</option>
                <option value="name_asc">Name A→Z</option>
                <option value="name_desc">Name Z→A</option>
              </select>
            </div>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>setHideHeader(v=>!v)}>{hideHeader ? 'Show Header' : 'Hide Header'}</button>
          </div>
          {!hideHeader && (
            <div className="text-center mt-4">
              <div className="text-xs text-gray-600">Accrual Basis</div>
              <div className="text-lg font-semibold text-gray-900">Damaged Stock Detail</div>
              <div className="text-sm text-gray-700">{formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}</div>
            </div>
          )}
          <div className="mt-4 overflow-auto">
            <table className="min-w-[1100px] w-full table-fixed border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Date</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Damage No</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Reported By</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Item</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-right border border-gray-200">Qty</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Unit</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-right border border-gray-200">Price</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-right border border-gray-200">Amount</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center border border-gray-200">Deducted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{r.date}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm">
                      <button type="button" className="text-gray-900 hover:underline" onClick={() => navigate(`/placeholder/damage-stocks?rmaNo=${encodeURIComponent(String(r.rmaNo || '').trim())}`)}>
                        {r.rmaNo}
                      </button>
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{r.name}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{r.item}</td>
                    <td className="px-3 py-2 border border-gray-200 text-right text-sm text-gray-900">{Number(r.qty || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{r.unit}</td>
                    <td className="px-3 py-2 border border-gray-200 text-right text-sm text-gray-900">{Number(r.price || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 border border-gray-200 text-right text-sm font-semibold text-gray-900">{Number(r.amount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${r.restock ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                        {r.restock ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-sm text-gray-600" colSpan={9}>No records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const PurchasePlanningGuide = () => {
    const [activeFlow, setActiveFlow] = useState('Start');
    const [selectedBar, setSelectedBar] = useState(null);
    const [hoverBar, setHoverBar] = useState(null);

    // eslint-disable-next-line no-unused-vars
    const steps = [
      {
        step: 'STEP ONE',
        title: 'Identify Your Needs',
        icon: ClipboardList,
        desc: 'Clearly define what you need to purchase and why. Distinguish between immediate needs and future requirements.',
        bullets: ['What product/service do you need?', 'How much quantity is required?', 'What is the required delivery date?', 'Is this recurring or one-time need?']
      },
      {
        step: 'STEP TWO',
        title: 'Set a Budget',
        icon: HandCoins,
        desc: 'Determine the maximum amount you are willing and able to spend. Align with your overall financial plan.',
        bullets: ['Check available cash flow first', 'Include hidden costs (shipping, tax)', 'Set a contingency buffer (5–10%)', 'Get finance approval if required']
      },
      {
        step: 'STEP THREE',
        title: 'Research Suppliers',
        icon: Building2,
        desc: "Identify and evaluate potential suppliers. Don't rely on one source — always compare options.",
        bullets: ['Collect at least 3 supplier quotes', 'Verify supplier reliability & reviews', 'Check delivery timelines', 'Evaluate quality vs price trade-off']
      },
      {
        step: 'STEP FOUR',
        title: 'Evaluate & Compare',
        icon: Scale,
        desc: 'Analyze each supplier using a scoring system. Consider price, quality, delivery, and payment terms together.',
        bullets: ['Use a weighted scoring matrix', 'Negotiate payment terms', 'Review past performance data', 'Consider total cost of ownership']
      },
      {
        step: 'STEP FIVE',
        title: 'Approve & Order',
        icon: BadgeCheck,
        desc: 'Get approvals and issue a formal Purchase Order (PO) to your chosen supplier.',
        bullets: ['Create a formal Purchase Order', 'Include all terms and conditions', 'Get management sign-off', 'Confirm supplier acknowledgement']
      },
      {
        step: 'STEP SIX',
        title: 'Track & Review',
        icon: BadgeCheck,
        desc: 'Monitor delivery, inspect received goods, and review the purchase outcome against your original plan.',
        bullets: ['Track delivery status in real-time', 'Inspect goods on arrival', 'Compare actual vs budgeted cost', 'Log supplier performance rating']
      }
    ];
    void steps;

    const barData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      budget: [50000, 54000, 48000, 60000, 52000, 56000, 64000, 68000],
      actual: [42000, 56000, 41000, 62000, 50000, 60000, 59000, 65000]
    };

    const donutData = [
      { label: 'Raw Materials', value: 38, color: '#16a34a' },
      { label: 'Equipment', value: 22, color: '#22c55e' },
      { label: 'Office Supplies', value: 10, color: '#10b981' },
      { label: 'Packaging', value: 14, color: '#34d399' },
      { label: 'Services', value: 11, color: '#0ea5e9' },
      { label: 'Other', value: 5, color: '#64748b' }
    ];

    const supplierRows = [
      { supplier: 'Supplier A', price: '$45.00', delivery: '3–5 days', quality: 9.0, terms: 'Net 30', reliability: { label: 'Excellent', tone: 'good' }, rec: { label: 'Best Choice', tone: 'good' } },
      { supplier: 'Supplier B', price: '$38.00', delivery: '7–10 days', quality: 7.0, terms: 'Upfront', reliability: { label: 'Average', tone: 'mid' }, rec: { label: 'Consider', tone: 'mid' } },
      { supplier: 'Supplier C', price: '$52.00', delivery: '1–2 days', quality: 9.5, terms: 'Net 15', reliability: { label: 'Excellent', tone: 'good' }, rec: { label: 'Urgent Only', tone: 'warn' } },
      { supplier: 'Supplier D', price: '$29.00', delivery: '14–21 days', quality: 4.5, terms: '50% upfront', reliability: { label: 'Poor', tone: 'bad' }, rec: { label: 'Avoid', tone: 'bad' } }
    ];

    const formulas = [
      { title: 'ECONOMIC ORDER QUANTITY (EOQ)', body: 'EOQ = √(2DS / H)', note: "D = annual demand, S = ordering cost per order, H = holding cost per unit" },
      { title: 'REORDER POINT (ROP)', body: 'ROP = (D × LT) + Safety Stock', note: 'D = daily demand, LT = lead time in days' },
      { title: 'PURCHASE BUDGET VARIANCE', body: 'Variance = Budget − Actual Spend', note: 'Positive = underspent, Negative = overspent' },
      { title: 'TOTAL COST OF OWNERSHIP', body: 'TCO = Price + Delivery + Holding + Risk', note: "Cheaper isn't always better if risk and delays are high" },
      { title: 'SAFETY STOCK', body: 'SS = Z × σ(LT) × √LT', note: 'Z = service factor, σ = demand deviation, LT = lead time' },
      { title: 'SPEND UTILIZATION RATE', body: 'SUR = (Actual / Budget) × 100%', note: 'Target: 85–100% utilization' }
    ];

    const checklist = [
      {
        title: 'Needs & Justification',
        icon: ClipboardList,
        items: [
          'Need is clearly documented with quantity and specs',
          'Purchase is aligned with business objectives',
          'Current stock levels have been verified',
          'Urgency and delivery timeline confirmed'
        ]
      },
      {
        title: 'Budget & Finance',
        icon: HandCoins,
        items: [
          'Budget is available and approved',
          'Total cost including delivery and taxes calculated',
          'Finance or management sign-off obtained',
          'Payment method and terms confirmed'
        ]
      },
      {
        title: 'Supplier Due Diligence',
        icon: Building2,
        items: [
          'At least 3 supplier quotes collected',
          'Supplier reliability and reviews verified',
          'Supplier comparison matrix completed',
          'Selected supplier notified and confirmed'
        ]
      },
      {
        title: 'Order & Documentation',
        icon: BadgeCheck,
        items: ['Purchase Order (PO) created and sent', 'Delivery date and address confirmed', 'Return/refund policy understood', 'All documents filed in the system']
      }
    ];

    const Shell = ({ children }) => <div className="space-y-6">{children}</div>;

    const SectionTitle = ({ title }) => (
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
        <div className="text-xl font-extrabold tracking-tight text-gray-900">{title}</div>
      </div>
    );

    const Card = ({ children, className }) => (
      <div className={`rounded-3xl border border-gray-200 bg-white ${className || ''}`}>{children}</div>
    );

    const Pill = ({ tone, children }) => {
      const styles =
        tone === 'good'
          ? 'bg-green-50 text-green-700 border-green-200'
          : tone === 'mid'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : tone === 'warn'
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : 'bg-red-50 text-red-700 border-red-200';
      return <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${styles}`}>{children}</span>;
    };

    const QualityBar = ({ score }) => {
      const pct = Math.max(0, Math.min(100, (Number(score || 0) / 10) * 100));
      const color = pct >= 80 ? 'bg-green-600' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
      return (
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 rounded-full bg-gray-200 overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs font-semibold text-gray-700">{score}/10</div>
        </div>
      );
    };

    const BarChart = ({ selected, hover, onHover, onSelect }) => {
      const w = 720;
      const h = 360;
      const padL = 46;
      const padR = 14;
      const padT = 14;
      const padB = 54;
      const max = Math.max(...barData.budget, ...barData.actual, 1);
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;
      const groupW = plotW / barData.labels.length;
      const barW = Math.max(10, groupW * 0.28);
      const gap = Math.max(6, groupW * 0.08);

      const yTicks = [0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t / 1000) * 1000);
      const yTo = (v) => padT + (1 - v / max) * plotH;
      const tip = hover || selected;
      const fmt = (v) => `$${Math.round(Number(v || 0) / 1000)}k`;

      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[320px]">
          <defs>
            <linearGradient id="budgetStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="actualStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {yTicks.map((t) => {
            const y = yTo(t);
            return <line key={t} x1={padL} y1={y} x2={w - padR} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
          })}

          {yTicks.map((t) => (
            <text key={`t-${t}`} x={padL - 10} y={yTo(t) + 4} textAnchor="end" fontSize="11" fill="#6b7280">
              ${Math.round(t / 1000)}k
            </text>
          ))}

          {barData.labels.map((label, i) => {
            const gx = padL + i * groupW + groupW / 2;
            const budget = barData.budget[i];
            const actual = barData.actual[i];

            const bH = (budget / max) * plotH;
            const aH = (actual / max) * plotH;

            const bX = gx - barW - gap / 2;
            const aX = gx + gap / 2;
            const baseY = padT + plotH;
            const isBudgetActive = tip && tip.i === i && tip.series === 'budget';
            const isActualActive = tip && tip.i === i && tip.series === 'actual';
            const isGroupActive = tip && tip.i === i;

            return (
              <g key={label}>
                <rect
                  x={bX}
                  y={baseY - bH}
                  width={barW}
                  height={bH}
                  rx="6"
                  fill="url(#budgetStroke)"
                  opacity={isGroupActive ? (isBudgetActive ? 1 : 0.6) : 0.9}
                  style={{ transition: 'opacity 150ms ease' }}
                  onMouseEnter={() => onHover({ i, series: 'budget' })}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect({ i, series: 'budget' })}
                />
                <rect
                  x={aX}
                  y={baseY - aH}
                  width={barW}
                  height={aH}
                  rx="6"
                  fill="url(#actualStroke)"
                  opacity={isGroupActive ? (isActualActive ? 1 : 0.6) : 0.9}
                  style={{ transition: 'opacity 150ms ease' }}
                  onMouseEnter={() => onHover({ i, series: 'actual' })}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect({ i, series: 'actual' })}
                />
                {tip && tip.i === i ? (
                  <>
                    <rect
                      x={gx - 50}
                      y={padT + 6}
                      width={100}
                      height={34}
                      rx="10"
                      fill="#ffffff"
                      stroke="#d1d5db"
                      strokeWidth="1"
                      opacity="0.98"
                    />
                    <text x={gx} y={padT + 20} textAnchor="middle" fontSize="11" fill="#6b7280">
                      {label} • {tip.series === 'budget' ? 'Budget' : 'Actual'}
                    </text>
                    <text x={gx} y={padT + 33} textAnchor="middle" fontSize="12" fill="#111827" fontWeight="700">
                      {fmt(tip.series === 'budget' ? budget : actual)}
                    </text>
                  </>
                ) : null}
                <text x={gx} y={h - 22} textAnchor="middle" fontSize="12" fill="#6b7280">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      );
    };

    const Donut = () => {
      const size = 300;
      const stroke = 28;
      const r = (size - stroke) / 2;
      const c = 2 * Math.PI * r;
      const total = donutData.reduce((s, d) => s + d.value, 0) || 1;
      let offset = 0;
      return (
        <div className="flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
            {donutData.map((d) => {
              const pct = d.value / total;
              const dash = pct * c;
              const gap = 2.5;
              const seg = Math.max(0, dash - gap);
              const el = (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${seg} ${c - seg}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              offset += dash;
              return el;
            })}
            <circle cx={size / 2} cy={size / 2} r={r - stroke / 2} fill="#ffffff" />
            <text x="50%" y="48%" textAnchor="middle" fontSize="20" fill="#111827" fontWeight="700">
              100%
            </text>
            <text x="50%" y="58%" textAnchor="middle" fontSize="12" fill="#6b7280">
              Spend
            </text>
          </svg>
        </div>
      );
    };

    const ProcessNode = ({ title, subtitle, icon: Icon, tone }) => {
      const base = 'w-[220px] rounded-2xl border px-5 py-4 bg-white border-gray-200';
      const styles =
        tone === 'start'
          ? 'ring-2 ring-green-200'
          : tone === 'end'
            ? 'border-green-300 bg-green-50'
            : tone === 'info'
              ? 'border-sky-200 bg-sky-50'
              : tone === 'warn'
                ? 'border-amber-200 bg-amber-50'
                : 'ring-0';
      const selected = String(activeFlow || '') === String(title || '');
      return (
        <button
          type="button"
          className={`${base} ${styles} text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-100 focus:outline-none ${selected ? 'ring-2 ring-green-300 shadow-lg shadow-green-100' : ''}`}
          onClick={() => setActiveFlow(title)}
        >
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${selected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-700'} transition-colors duration-200`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">{title}</div>
              <div className="text-xs text-gray-600 mt-1">{subtitle}</div>
            </div>
          </div>
        </button>
      );
    };

    const DecisionNode = ({ text }) => (
      <button
        type="button"
        className={`relative w-[210px] h-[104px] flex items-center justify-center transition-transform duration-200 hover:scale-[1.02] focus:outline-none ${String(activeFlow || '') === String(text || '') ? 'scale-[1.02]' : ''}`}
        onClick={() => setActiveFlow(text)}
      >
        <div
          className={`absolute inset-0 rotate-45 rounded-2xl border bg-green-50 transition-all duration-200 ${String(activeFlow || '') === String(text || '') ? 'border-green-400 shadow-lg shadow-green-100' : 'border-green-300'}`}
        />
        <div className="relative flex items-center gap-2 text-sm font-semibold text-green-700">
          <HelpCircle className="w-5 h-5" />
          {text}
        </div>
      </button>
    );

    return (
      <Shell>
        <Card className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-white" />
          <div className="absolute -top-24 -right-28 w-[420px] h-[420px] rounded-full bg-green-200/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-28 w-[420px] h-[420px] rounded-full bg-emerald-200/30 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div />
            </div>

            <div className="mt-2" />
          </div>
        </Card>

        <div className="space-y-5">
          <div />
          <Card className="p-6">
            <div className="hidden xl:block space-y-5">
              <div className="flex items-center gap-3">
                <ProcessNode title="Start" subtitle="Need identified" icon={Rocket} tone="start" />
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <ProcessNode title="Define Need" subtitle="Qty & specs" icon={ClipboardList} />
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <ProcessNode title="Budget Check" subtitle="Available funds" icon={HandCoins} tone="warn" />
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <DecisionNode text="Budget OK?" />
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <ProcessNode title="Supplier Search" subtitle="Min. 3 quotes" icon={Building2} tone="info" />
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <ProcessNode title="Evaluate" subtitle="Score & rank" icon={Scale} />
              </div>
              <div className="flex items-center justify-center">
                <ArrowDown className="w-7 h-7 text-gray-400" />
              </div>
              <div className="flex items-center gap-3">
                <ProcessNode title="Select Supplier" subtitle="Best value" icon={BadgeCheck} />
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <DecisionNode text="Approved?" />
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <ProcessNode title="Issue PO" subtitle="Formal order" icon={FileText} />
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <ProcessNode title="Track Delivery" subtitle="ETA monitoring" icon={Truck} />
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <ProcessNode title="Receive & Inspect" subtitle="Quality check" icon={PackageCheck} />
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <ProcessNode title="Closed" subtitle="Purchase done" icon={CheckCircle2} tone="end" />
              </div>
            </div>

            <div className="xl:hidden space-y-3">
              <ProcessNode title="Start" subtitle="Need identified" icon={Rocket} tone="start" />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <ProcessNode title="Define Need" subtitle="Qty & specs" icon={ClipboardList} />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <ProcessNode title="Budget Check" subtitle="Available funds" icon={HandCoins} tone="warn" />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <DecisionNode text="Budget OK?" />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <ProcessNode title="Supplier Search" subtitle="Min. 3 quotes" icon={Building2} tone="info" />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <ProcessNode title="Evaluate" subtitle="Score & rank" icon={Scale} />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <ProcessNode title="Select Supplier" subtitle="Best value" icon={BadgeCheck} />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <DecisionNode text="Approved?" />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <ProcessNode title="Issue PO" subtitle="Formal order" icon={FileText} />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <ProcessNode title="Track Delivery" subtitle="ETA monitoring" icon={Truck} />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <ProcessNode title="Receive & Inspect" subtitle="Quality check" icon={PackageCheck} />
              <div className="flex items-center justify-center"><ArrowDown className="w-7 h-7 text-gray-400" /></div>
              <ProcessNode title="Closed" subtitle="Purchase done" icon={CheckCircle2} tone="end" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="text-lg font-extrabold text-gray-900">Budget vs Actual Spend</div>
            <div className="mt-1 text-sm text-gray-600">Monthly comparison — planned vs real expenditure</div>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <span className="w-10 h-2 rounded bg-green-500/70 border border-green-500/40" />
                Budget
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="w-10 h-2 rounded bg-green-700/70 border border-green-700/40" />
                Actual Spend
              </div>
            </div>
            <div className="mt-3">
              <BarChart selected={selectedBar} hover={hoverBar} onHover={setHoverBar} onSelect={setSelectedBar} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-lg font-extrabold text-gray-900">Purchase Category Breakdown</div>
            <div className="mt-1 text-sm text-gray-600">Distribution of spend across categories</div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-6 items-center">
              <Donut />
              <div className="space-y-2">
                {donutData.map((d) => (
                  <div key={d.label} className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
                      <span className="text-gray-700 truncate">{d.label}</span>
                    </div>
                    <span className="text-gray-600">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <SectionTitle title="Supplier Comparison Matrix" />
          <Card className="overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-gray-900">Evaluate Suppliers Before Ordering</div>
                <div className="mt-1 text-sm text-gray-600">Use score + delivery + terms to reduce purchasing risk</div>
              </div>
              <button type="button" className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700">
                Comparison Tool
              </button>
            </div>
            <div className="overflow-auto">
              <table className="min-w-[980px] w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-500 tracking-widest">
                    <th className="px-6 py-4">SUPPLIER</th>
                    <th className="px-6 py-4">PRICE/UNIT</th>
                    <th className="px-6 py-4">DELIVERY (DAYS)</th>
                    <th className="px-6 py-4">QUALITY SCORE</th>
                    <th className="px-6 py-4">PAYMENT TERMS</th>
                    <th className="px-6 py-4">RELIABILITY</th>
                    <th className="px-6 py-4">RECOMMENDATION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {supplierRows.map((r) => (
                    <tr key={r.supplier} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{r.supplier}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{r.price}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{r.delivery}</td>
                      <td className="px-6 py-4">
                        <QualityBar score={r.quality} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{r.terms}</td>
                      <td className="px-6 py-4">
                        <Pill tone={r.reliability.tone}>★ {r.reliability.label}</Pill>
                      </td>
                      <td className="px-6 py-4">
                        <Pill tone={r.rec.tone}>{r.rec.tone === 'good' ? '✓' : r.rec.tone === 'bad' ? '✕' : '–'} {r.rec.label}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <SectionTitle title="Key Planning Formulas" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {formulas.map((f) => (
              <Card key={f.title} className="p-5 overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-500 tracking-widest">{f.title}</div>
                    <div className="mt-2 text-sm text-gray-600">{f.note}</div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-green-700">
                    <BadgeCheck className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-5 rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5">
                  <div className="font-mono text-base md:text-lg text-green-700 font-semibold">{f.body}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <SectionTitle title="Pre-Purchase Checklist" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {checklist.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.title} className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                      <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                    <div className="text-lg font-extrabold text-gray-900">{c.title}</div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {c.items.map((it) => (
                      <label key={it} className="flex items-start gap-3 text-sm text-gray-700">
                        <input type="checkbox" className="mt-1 accent-green-600" />
                        <span className="min-w-0">{it}</span>
                      </label>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </Shell>
    );
  };
  void PurchasePlanningGuide;

  const ExpensesAnalytics = () => {
    const [fromDate, setFromDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [nonce, setNonce] = useState(0);
    const [hideHeader, setHideHeader] = useState(false);
    const [sortKey, setSortKey] = useState('date_desc');
    const [refreshKey, setRefreshKey] = useState(0);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [colWidths, setColWidths] = useState([120, 110, 140, 180, 220, 90, 90, 90, 110, 110, 160, 110]);
    const [deleteExpenseModal, setDeleteExpenseModal] = useState({ open: false, expenseId: '' });
    const [deleteExpenseLoading, setDeleteExpenseLoading] = useState(false);
    const onMouseDown = (i, e) => {
      const startX = e.clientX;
      const startW = colWidths[i];
      const move = (ev) => {
        const dx = ev.clientX - startX;
        setColWidths((prev) => prev.map((w, idx) => (idx === i ? Math.max(80, startW + dx) : w)));
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    };

    React.useEffect(() => {
      const bump = () => setNonce((v) => v + 1);
      window.addEventListener('dataUpdated', bump);
      window.addEventListener('storage', bump);
      return () => {
        window.removeEventListener('dataUpdated', bump);
        window.removeEventListener('storage', bump);
      };
    }, []);

    const expenses = useMemo(() => {
      void nonce;
      void refreshKey;
      const list = localStore.get('expenses', []);
      return Array.isArray(list) ? list : [];
    }, [nonce, refreshKey]);

    const income = useMemo(() => {
      void nonce;
      void refreshKey;
      const readArray = (key) => {
        const list = localStore.get(key, []);
        return Array.isArray(list) ? list : [];
      };
      const toNum = (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 0;
      };
      const salesAll = readArray('sales');
      const ordersAll = readArray('salesOrders');
      return { salesAll, ordersAll, toNum };
    }, [nonce, refreshKey]);

    const normalizeExpenseCategory = useCallback((value) => {
      const raw = String(value || '').trim();
      const key = raw.toLowerCase();
      if (!key) return 'Uncategorized';
      if (key === 'staff') return 'Staff';
      if (key === 'construction' || key === 'constructions') return 'Construction';
      if (key === 'chicken feeds' || key === 'feeds') return 'Chicken Feeds';
      if (key === 'equipment' || key === 'equipments') return 'Equipment';
      if (key === 'utilities') return 'Utilities';
      if (key === 'vehicle' || key === 'vehicles' || key === 'transport') return 'Transport';
      if (key === 'maintainance' || key === 'maintenance') return 'Maintenance';
      if (key === 'vacines and medicines' || key === 'vaccines and medicines') return 'Vaccines and Medicines';
      if (key === 'other') return 'Other';
      return raw;
    }, []);

    const toMoneyNumber = useCallback((v) => {
      const n = Number(String(v ?? '').replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    }, []);

    const getExpenseAmount = useCallback((e) => {
      const direct = toMoneyNumber(e?.amount);
      if (direct) return direct;
      const items = Array.isArray(e?.items) ? e.items : [];
      return items.reduce((s, it) => {
        const amt = toMoneyNumber(it?.amount);
        if (amt) return s + amt;
        return s + (toMoneyNumber(it?.qty) * toMoneyNumber(it?.rate));
      }, 0);
    }, [toMoneyNumber]);

    const getExpenseDate = useCallback((e) => {
      const raw = e?.date || e?.createdAt || e?.created_at || e?.timestamp || '';
      const d1 = new Date(raw);
      if (!Number.isNaN(d1.getTime())) return d1;
      const idNum = Number(e?.id);
      if (Number.isFinite(idNum) && idNum > 0) {
        const d2 = new Date(idNum);
        if (!Number.isNaN(d2.getTime())) return d2;
      }
      return null;
    }, []);

    const categoryOptions = useMemo(() => {
      const set = new Set();
      expenses.forEach((e) => set.add(normalizeExpenseCategory(e?.category || e?.type)));
      return ['All', ...Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b))];
    }, [expenses, normalizeExpenseCategory]);

    const filtered = useMemo(() => {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return expenses;
      const endDay = new Date(end);
      endDay.setHours(23, 59, 59, 999);
      return expenses.filter((e) => {
        const d = getExpenseDate(e);
        if (!d) return true;
        return d >= start && d <= endDay;
      });
    }, [expenses, fromDate, getExpenseDate, toDate]);

    const filteredByCategory = useMemo(() => {
      const key = String(categoryFilter || 'All');
      if (key === 'All') return filtered;
      return filtered.filter((e) => normalizeExpenseCategory(e?.category || e?.type) === key);
    }, [categoryFilter, filtered, normalizeExpenseCategory]);

    const totals = useMemo(() => {
      const total = filteredByCategory.reduce((s, e) => s + getExpenseAmount(e), 0);
      const count = filteredByCategory.length;
      const byCategory = new Map();
      filteredByCategory.forEach((e) => {
        const k = normalizeExpenseCategory(e?.category || e?.type);
        byCategory.set(k, (byCategory.get(k) || 0) + getExpenseAmount(e));
      });
      const categories = Array.from(byCategory.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
      return { total, count, categories };
    }, [filteredByCategory, getExpenseAmount, normalizeExpenseCategory]);

    const kpis = useMemo(() => {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return { incomeTzs: 0, expenseTzs: totals.total, balance: 0 - totals.total, transactions: totals.count };
      }
      const endDay = new Date(end);
      endDay.setHours(23, 59, 59, 999);

      const salesInRange = income.salesAll.filter((s) => {
        const d = new Date(s?.date || '');
        if (Number.isNaN(d.getTime())) return false;
        return d >= start && d <= endDay;
      });
      const ordersInRange = income.ordersAll.filter((o) => {
        const d = new Date(o?.orderDate || o?.date || '');
        if (Number.isNaN(d.getTime())) return false;
        return d >= start && d <= endDay;
      });

      const salesIncomeTzs = salesInRange.reduce((sum, s) => {
        const isUsd = String(s?.currency || '').toUpperCase() === 'USD';
        const usdRate = income.toNum(s?.usdRate);
        const usdTotal = income.toNum(s?.usdTotal);
        const base = income.toNum(s?.finalTotal ?? s?.amount);
        const tzs = isUsd ? (usdTotal && usdRate ? usdTotal * usdRate : income.toNum(s?.totalTzs) || 0) : base;
        return sum + tzs;
      }, 0);

      const ordersIncomeTzs = ordersInRange.reduce((sum, o) => {
        const isUsd = String(o?.currency || '').toUpperCase() === 'USD' || Boolean(o?.usdEnabled);
        const usdRate = income.toNum(o?.usdRate);
        const total = income.toNum(o?.total);
        const tzs = isUsd
          ? (Number.isFinite(Number(o?.totalTzs)) ? Number(o?.totalTzs) : (usdRate > 0 ? total * usdRate : 0))
          : total;
        return sum + tzs;
      }, 0);

      const incomeTzs = salesIncomeTzs + ordersIncomeTzs;
      const expenseTzs = totals.total;
      const balance = incomeTzs - expenseTzs;
      const transactions = totals.count;
      return { incomeTzs, expenseTzs, balance, transactions };
    }, [fromDate, income, toDate, totals.count, totals.total]);

    const formatMoney = (value) => {
      const n = Number(value) || 0;
      try {
        return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
      } catch {
        return n.toLocaleString();
      }
    };

    const donut = useMemo(() => {
      const palette = ['#34d399', '#a3e635', '#f59e0b', '#fb7185', '#60a5fa', '#a78bfa', '#22c55e', '#f97316', '#06b6d4', '#94a3b8'];
      const total = totals.total > 0 ? totals.total : 0;
      const r = 34;
      const c = 2 * Math.PI * r;
      let offset = 0;
      const MAX_SLICES = 12;
      const sorted = Array.isArray(totals.categories) ? totals.categories : [];
      const head = sorted.slice(0, Math.max(1, MAX_SLICES - 1));
      const tail = sorted.slice(Math.max(1, MAX_SLICES - 1));
      const tailTotal = tail.reduce((s, x) => s + (Number(x?.amount) || 0), 0);
      const merged = tailTotal > 0 ? [...head, { category: 'Others', amount: tailTotal }] : head;

      const slices = merged.map((x, idx) => {
        const pct = total ? (x.amount / total) : 0;
        const len = pct * c;
        const slice = {
          ...x,
          pct,
          color: palette[idx % palette.length],
          dasharray: `${len} ${c - len}`,
          dashoffset: -offset
        };
        offset += len;
        return slice;
      });
      return { r, c, slices, total };
    }, [totals.categories, totals.total]);

    const categoryTrend = useMemo(() => {
      const rows = (donut.slices || []).map((s) => ({
        category: s.category,
        amount: Number(s.amount) || 0,
        color: s.color
      }));
      const max = rows.reduce((m, r) => Math.max(m, r.amount), 0);
      return { rows, max: Math.max(1, max) };
    }, [donut.slices]);

    const expenseLines = useMemo(() => {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const endDay = new Date(end);
      endDay.setHours(23, 59, 59, 999);
      const inRange = expenses.filter((e) => {
        const d = getExpenseDate(e);
        if (!d) return true;
        return d >= start && d <= endDay;
      });
      const rows = [];
      inRange.forEach((e) => {
        const category = normalizeExpenseCategory(e?.category || e?.type);
        if (categoryFilter !== 'All' && category !== categoryFilter) return;
        const items = Array.isArray(e?.items) && e.items.length ? e.items : [e];
        items.forEach((it, idx) => {
          const qty = toMoneyNumber(it?.qty);
          const rate = toMoneyNumber(it?.rate);
          const amount = toMoneyNumber(it?.amount);
          rows.push({
            id: `${e.id}-${idx}`,
            date: (() => {
              const d = getExpenseDate(e);
              return d ? d.toISOString().slice(0, 10) : '';
            })(),
            expenseNo: e?.expenseNumber || String(e?.id || ''),
            category,
            subcategory: it?.subcategory || it?.subcategoryName || it?.subcategory || it?.subcategory,
            description: it?.description || e?.description || '',
            qty,
            unit: it?.unit || e?.unit || '',
            rate,
            amount: amount || (qty * rate) || getExpenseAmount(e),
            paymentMethod: e?.paymentMethod || '',
            status: e?.status || '',
            location: e?.location || '',
            raw: e
          });
        });
      });
      const sorted = [...rows].sort((a, b) => {
        switch (sortKey) {
          case 'date_asc': return a.date > b.date ? 1 : (a.date < b.date ? -1 : 0);
          case 'date_desc': return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
          case 'amount_desc': return (b.amount || 0) - (a.amount || 0);
          case 'amount_asc': return (a.amount || 0) - (b.amount || 0);
          case 'category_asc': return String(a.category || '').localeCompare(String(b.category || ''));
          case 'category_desc': return String(b.category || '').localeCompare(String(a.category || ''));
          default: return 0;
        }
      });
      return sorted;
    }, [categoryFilter, expenses, fromDate, getExpenseAmount, getExpenseDate, normalizeExpenseCategory, sortKey, toDate, toMoneyNumber]);

    const exportCSV = () => {
      const headerRow = ['Date','Expense No.','Category','Subcategory','Description','Qty','Unit','Rate','Amount','Payment Method','Status','Location'];
      const rows = expenseLines.map((r) => [
        r.date,
        String(r.expenseNo || ''),
        String(r.category || ''),
        String(r.subcategory || ''),
        String(r.description || '').replace(/\n/g, ' '),
        String(r.qty || 0),
        String(r.unit || ''),
        String(r.rate || 0),
        String(r.amount || 0),
        String(r.paymentMethod || ''),
        String(r.status || ''),
        String(r.location || '')
      ]);
      const csv = [headerRow, ...rows].map((x) => x.map((v) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'expenses_history.csv';
      a.click();
      URL.revokeObjectURL(url);
    };

    const requestDeleteExpense = (expenseId) => {
      if (!canDelete) return;
      setDeleteExpenseModal({ open: true, expenseId: String(expenseId || '') });
    };

    const confirmDeleteExpense = () => {
      if (!canDelete) {
        setDeleteExpenseModal({ open: false, expenseId: '' });
        return;
      }
      if (deleteExpenseLoading) return;
      const expenseId = String(deleteExpenseModal.expenseId || '');
      if (!expenseId) return;
      const startedAt = Date.now();
      setDeleteExpenseLoading(true);
      (async () => {
        try {
          await expensesApi.remove(expenseId);
          try {
            appendSystemActivity('expense_delete', 'Expense deleted', `Expense #${expenseId}`, 'Expenses', 'warning', { expenseId });
          } catch {}
          window.dispatchEvent(new CustomEvent('dataUpdated'));
        } catch (error) {
          alert(String(error?.message || 'Unable to delete expense.'));
        } finally {
          const elapsed = Date.now() - startedAt;
          const remaining = 5000 - elapsed;
          if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
          setDeleteExpenseLoading(false);
          setDeleteExpenseModal({ open: false, expenseId: '' });
          setRefreshKey((k) => k + 1);
        }
      })();
    };

    return (
      <div className="space-y-6">
        <ConfirmDeleteModal
          open={deleteExpenseModal.open}
          title="Delete Expense?"
          description="This expense record will be permanently deleted and cannot be recovered."
          confirmText="Delete"
          loading={deleteExpenseLoading}
          onCancel={() => (deleteExpenseLoading ? null : setDeleteExpenseModal({ open: false, expenseId: '' }))}
          onConfirm={confirmDeleteExpense}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500">Income</div>
            <div className="mt-2 text-xl font-extrabold text-blue-700">TZS {formatMoney(kpis.incomeTzs)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500">Expenses</div>
            <div className="mt-2 text-xl font-extrabold text-rose-600">TZS {formatMoney(kpis.expenseTzs)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500">Balance</div>
            <div className="mt-2 text-xl font-extrabold text-green-700">TZS {formatMoney(kpis.balance)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500">Transactions</div>
            <div className="mt-2 text-xl font-extrabold text-sky-700">{kpis.transactions.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-gray-900">Total Expenses</div>
              <div className="text-xs text-gray-600">{formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}</div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Category</span>
                <select className="px-3 py-2 border rounded-lg text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">From</span>
                <DateInput className="px-3 py-2 border rounded-lg text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">To</span>
                <DateInput className="px-3 py-2 border rounded-lg text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
            <div className="flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-96 h-96">
                <g transform="rotate(-90 60 60)">
                  <circle cx="60" cy="60" r={donut.r} fill="transparent" stroke="#e5e7eb" strokeWidth="16" />
                  {donut.slices.map((s) => (
                    <circle
                      key={s.category}
                      cx="60"
                      cy="60"
                      r={donut.r}
                      fill="transparent"
                      stroke={s.color}
                      strokeWidth="16"
                      strokeDasharray={s.dasharray}
                      strokeDashoffset={s.dashoffset}
                      strokeLinecap="butt"
                    />
                  ))}
                </g>
                <circle cx="60" cy="60" r="24" fill="#ffffff" />
              </svg>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 text-center">Trend by Category</div>
                <div className="mt-3">
                  <svg viewBox="0 0 640 420" className="w-full h-[26rem]">
                    <rect x="0" y="0" width="640" height="420" fill="#ffffff" />
                    {(() => {
                      const padL = 200;
                      const padR = 18;
                      const padT = 14;
                      const padB = 44;
                      const w = 640 - padL - padR;
                      const h = 420 - padT - padB;
                      const rows = categoryTrend.rows;
                      const n = rows.length;
                      const maxX = categoryTrend.max;
                      const xAt = (v) => padL + (Math.max(0, v) / maxX) * w;
                      const yStep = n ? (h / n) : h;
                      const yAt = (i) => padT + (i + 0.5) * yStep;
                      const ticks = 4;
                      return (
                        <>
                          {Array.from({ length: ticks + 1 }).map((_, i) => {
                            const x = padL + (i * w) / ticks;
                            const val = (i * maxX) / ticks;
                            return (
                              <g key={i}>
                                <line x1={x} y1={padT} x2={x} y2={padT + h} stroke="#f3f4f6" strokeWidth="1" />
                                <text x={x} y={padT + h + 28} textAnchor="middle" fontSize="12" fill="#6b7280">{formatMoney(val)}</text>
                              </g>
                            );
                          })}

                          <line x1={padL} y1={padT} x2={padL} y2={padT + h} stroke="#d1d5db" strokeWidth="1" />
                          <line x1={padL} y1={padT + h} x2={padL + w} y2={padT + h} stroke="#d1d5db" strokeWidth="1" />

                          {rows.map((r, i) => {
                            const y = yAt(i);
                            const x = xAt(r.amount);
                            return (
                              <g key={r.category}>
                                <text x={padL - 10} y={y + 5} textAnchor="end" fontSize="13" fill="#374151">{r.category}</text>
                                <line x1={padL} y1={y} x2={x} y2={y} stroke={r.color} strokeWidth="5" />
                                <circle cx={x} cy={y} r="7" fill={r.color} />
                              </g>
                            );
                          })}

                          {n ? null : (
                            <>
                              <text x="320" y="210" textAnchor="middle" fontSize="14" fill="#6b7280">No trend data</text>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              <div className="overflow-auto">
                <div className="grid grid-cols-[14px_minmax(0,1fr)_120px_80px] gap-x-3 gap-y-2 text-sm">
                  {donut.slices.map((s) => (
                    <React.Fragment key={s.category}>
                      <div className="w-3.5 h-3.5 rounded-full mt-1" style={{ backgroundColor: s.color }} />
                      <div className="text-gray-800 truncate">{s.category}</div>
                      <div className="text-gray-900 font-semibold text-right">TZS {formatMoney(s.amount)}</div>
                      <div className="text-gray-600 text-right">{(s.pct * 100).toFixed(2)}%</div>
                    </React.Fragment>
                  ))}
                  {!donut.slices.length ? (
                    <div className="col-span-4 text-sm text-gray-600 py-6">No expenses in selected range.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={() => window.print()}>Print</button>
              <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={() => {
                const subject = encodeURIComponent('Expenses History');
                const body = encodeURIComponent('Please find the Expenses History report.');
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}>E-mail</button>
              <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={exportCSV}>Excel</button>
              <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={() => setHideHeader((v) => !v)}>{hideHeader ? 'Show Header' : 'Hide Header'}</button>
              <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={() => setRefreshKey((k) => k + 1)}>Refresh</button>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">From</span>
                <DateInput className="px-3 py-2 border rounded-lg text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">To</span>
                <DateInput className="px-3 py-2 border rounded-lg text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Category</span>
                <select className="px-3 py-2 border rounded-lg text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Sort By</span>
                <select className="px-3 py-2 border rounded-lg text-sm" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                  <option value="date_desc">Default</option>
                  <option value="date_asc">Date Asc</option>
                  <option value="amount_desc">Amount Desc</option>
                  <option value="amount_asc">Amount Asc</option>
                  <option value="category_asc">Category A→Z</option>
                  <option value="category_desc">Category Z→A</option>
                </select>
              </div>
            </div>

            {!hideHeader ? (
              <div className="text-center mt-4">
                <div className="text-xs text-gray-600">Accrual Basis</div>
                <div className="text-lg font-semibold text-gray-900">Expenses History</div>
                <div className="text-sm text-gray-700">{formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}</div>
              </div>
            ) : null}

            <div className="mt-4 border rounded-lg">
              <div className="overflow-auto">
                <table className="min-w-[1400px] w-full table-fixed border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: colWidths[0] }}>
                        Date
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(0, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: colWidths[1] }}>
                        Expense No.
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(1, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: colWidths[2] }}>
                        Category
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(2, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: colWidths[3] }}>
                        Subcategory
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(3, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: colWidths[4] }}>
                        Description
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(4, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: colWidths[5] }}>
                        Qty
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(5, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: colWidths[6] }}>
                        Unit
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(6, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: colWidths[7] }}>
                        Rate
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(7, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: colWidths[8] }}>
                        Amount
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(8, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-center border-b relative" style={{ width: colWidths[9] }}>
                        Status
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(9, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: colWidths[10] }}>
                        Location
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(10, e)} />
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-center border-b relative" style={{ width: colWidths[11] }}>
                        Actions
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(11, e)} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseLines.length ? expenseLines.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="px-3 py-2 text-sm text-gray-800" style={{ width: colWidths[0] }}>{r.date}</td>
                        <td className="px-3 py-2 text-sm text-gray-800" style={{ width: colWidths[1] }}>{r.expenseNo}</td>
                        <td className="px-3 py-2 text-sm text-gray-800" style={{ width: colWidths[2] }}>{r.category}</td>
                        <td className="px-3 py-2 text-sm text-gray-800" style={{ width: colWidths[3] }}>{r.subcategory || ''}</td>
                        <td className="px-3 py-2 text-sm text-gray-800" style={{ width: colWidths[4] }}>{r.description || ''}</td>
                        <td className="px-3 py-2 text-sm text-gray-800 text-right" style={{ width: colWidths[5] }}>{r.qty ? r.qty.toLocaleString() : ''}</td>
                        <td className="px-3 py-2 text-sm text-gray-800" style={{ width: colWidths[6] }}>{r.unit || ''}</td>
                        <td className="px-3 py-2 text-sm text-gray-800 text-right" style={{ width: colWidths[7] }}>{r.rate ? r.rate.toLocaleString() : ''}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 font-semibold text-right" style={{ width: colWidths[8] }}>TZS {formatMoney(r.amount)}</td>
                        <td className="px-3 py-2 text-sm text-gray-800 text-center" style={{ width: colWidths[9] }}>{r.status || ''}</td>
                        <td className="px-3 py-2 text-sm text-gray-800" style={{ width: colWidths[10] }}>{r.location || ''}</td>
                        <td className="px-3 py-2 text-sm text-gray-800 text-center" style={{ width: colWidths[11] }}>
                          {canDelete ? (
                            <button
                              type="button"
                              className="px-2 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => requestDeleteExpense(r?.raw?.id)}
                            >
                              <Trash2 size={16} className="inline" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-3 py-8 text-sm text-gray-600" colSpan={12}>No expenses found for selected period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Products = () => {
    const [refreshKey, setRefreshKey] = useState(0);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [lowOnly, setLowOnly] = useState(false);
    const [sortKey] = useState('name_asc');
    const [products, setProducts] = useState([]);
    const [stockMovements, setStockMovements] = useState([]);
    const [locationFilter, setLocationFilter] = useState('all');
    const [modal, setModal] = useState({ open: false, mode: 'create', id: '' });
    const [deleteModal, setDeleteModal] = useState({ open: false, id: '', name: '' });
    const [stockInModal, setStockInModal] = useState({ open: false, id: '', name: '', category: 'general', unit: 'kg', buying: 0, selling: 0 });
    const [stockInQty, setStockInQty] = useState('');
    const [stockInLoading, setStockInLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [draft, setDraft] = useState({
      name: '',
      sku: '',
      barcode: '',
      category: 'general',
      unit: 'kg',
      qty: '',
      buyingPrice: '',
      sellingPrice: '',
      description: '',
      imageDataUrl: '',
      status: 'active'
    });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [importing, setImporting] = useState(false);

    React.useEffect(() => {
      const handler = () => setRefreshKey((v) => v + 1);
      window.addEventListener('dataUpdated', handler);
      return () => {
        window.removeEventListener('dataUpdated', handler);
      };
    }, []);

    React.useEffect(() => {
      let alive = true;
      Promise.resolve()
        .then(async () => {
          const snapshot = await productsApi.loadInventorySnapshot();
          const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
          const seenNames = new Set();
          const sanitizedItems = (Array.isArray(items) ? items : []).filter((item) => {
            const name = String(item?.name || item?.itemName || '').trim();
            const key = name.toLowerCase();
            if (!name) return false;
            if (seenNames.has(key)) return false;
            seenNames.add(key);
            return true;
          });
          const itemsChanged = sanitizedItems.length !== (Array.isArray(items) ? items.length : 0);
          if (itemsChanged) {
            await setStoredJson('inventoryItems', sanitizedItems);
          }
          const validNames = new Set(sanitizedItems.map((item) => String(item?.name || item?.itemName || '').trim().toLowerCase()).filter(Boolean));
          const movements = (Array.isArray(snapshot?.movements) ? snapshot.movements : []).filter((m) => {
            const name = String(m?.itemName || m?.name || '').trim().toLowerCase();
            if (!name) return false;
            return validNames.has(name);
          }).map((m) => ({
            id: m?.id ?? `${String(m?.productId || '')}:${String(m?.itemName || m?.name || '')}:${String(m?.date || m?.createdAt || '')}:${Math.random().toString(16).slice(2)}`,
            movementType: m?.movementType,
            itemType: m?.itemType,
            itemName: m?.itemName || m?.name,
            quantity: m?.quantity,
            unit: m?.unit,
            pricePerItem: m?.pricePerItem,
            supplierName: m?.supplierName || m?.supplier,
            reason: m?.reason,
            note: m?.note,
            date: m?.date,
            createdAt: m?.createdAt
          }));
          if (!alive) return;
          setProducts(sanitizedItems);
          setStockMovements(isAdmin ? movements : []);
        })
        .catch(() => {
          if (!alive) return;
          setProducts([]);
          setStockMovements([]);
        });
      return () => {
        alive = false;
      };
    }, [refreshKey]);

    const toMoney = (v) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v || '').replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const money = (n) => (Number(n || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const stockState = useMemo(() => {
      void refreshKey;
      const norm = (v) => String(v || '').trim().toLowerCase();
      const qtyByName = new Map();
      const seenByName = new Set();
      const add = (name, delta) => {
        const key = norm(name);
        if (!key) return;
        qtyByName.set(key, (qtyByName.get(key) || 0) + delta);
        seenByName.add(key);
      };
      (Array.isArray(stockMovements) ? stockMovements : []).forEach((m) => {
        const name = String(m?.itemName || '').trim();
        const qty = parseFloat(String(m?.quantity || 0)) || 0;
        if (!name || !qty) return;
        if (isInventoryMovementIn(m)) add(name, qty);
        else if (isInventoryMovementOut(m)) add(name, -qty);
        else add(name, qty);
      });
      return { qtyByName, seenByName };
    }, [refreshKey, stockMovements]);

    const categories = useMemo(() => {
      const set = new Set();
      (products || []).forEach((p) => {
        const c = String(p?.category || p?.itemType || 'general').trim() || 'general';
        set.add(c);
      });
      return ['all', ...Array.from(set.values()).sort((a, b) => a.localeCompare(b))];
    }, [products]);

    const categoryOptionLabels = useMemo(() => {
      const byCat = new Map();
      (products || []).forEach((p) => {
        const c = String(p?.category || p?.itemType || 'general').trim() || 'general';
        const name = String(p?.name || '').trim();
        const cur = byCat.get(c) || { count: 0, names: [] };
        cur.count += 1;
        if (name && cur.names.length < 2 && !cur.names.includes(name)) cur.names.push(name);
        byCat.set(c, cur);
      });
      const labelOf = (c) => {
        if (c === 'all') return 'Category';
        const meta = byCat.get(c);
        if (!meta) return c;
        const suffix = meta.names.length ? ` - ${meta.names.join(', ')}` : '';
        return `${c} (${meta.count})${suffix}`;
      };
      const map = new Map();
      categories.forEach((c) => map.set(c, labelOf(c)));
      return map;
    }, [categories, products]);

    const rows = useMemo(() => {
      const q = (search || '').trim().toLowerCase();
      const cat = String(categoryFilter || 'all');
      const list = (products || []).map((p) => {
        const name = String(p?.name || '').trim();
        const nameKey = String(name || '').trim().toLowerCase();
        const baseQty = (() => {
          const n = parseFloat(String(p?.stockQuantity ?? p?.qty ?? p?.quantity ?? 0).replace(/,/g, ''));
          return Number.isFinite(n) ? n : 0;
        })();
        const movementQty = stockState.qtyByName.get(nameKey) || 0;
        const qty = stockState.seenByName.has(nameKey) ? movementQty : baseQty;
        const buying = toMoney(p?.buyingPrice ?? p?.buyPrice ?? p?.costPrice ?? 0);
        const selling = toMoney(p?.sellingPrice ?? p?.sellPrice ?? p?.price ?? 0);
        const value = qty > 0 ? qty * (selling || 0) : 0;
        return {
          ...p,
          _name: name,
          _qty: qty,
          _buying: buying,
          _selling: selling,
          _value: value,
          _category: String(p?.category || p?.itemType || 'general').trim() || 'general',
          _updatedAt: String(p?.updatedAt || p?.createdAt || '')
        };
      }).filter((p) => {
        if (q) {
          const hay = [p._name, p.sku, p.barcode, p._category].map((x) => String(x || '').toLowerCase()).join(' ');
          if (!hay.includes(q)) return false;
        }
        if (cat !== 'all' && String(p._category) !== cat) return false;
        return true;
      });
      const sorted = list.slice().sort((a, b) => {
        switch (sortKey) {
          case 'name_desc': return String(b._name || '').localeCompare(String(a._name || ''));
          case 'stock_desc': return (b._qty || 0) - (a._qty || 0);
          case 'stock_asc': return (a._qty || 0) - (b._qty || 0);
          case 'sell_desc': return (b._selling || 0) - (a._selling || 0);
          case 'sell_asc': return (a._selling || 0) - (b._selling || 0);
          default: return String(a._name || '').localeCompare(String(b._name || ''));
        }
      });
      return sorted;
    }, [categoryFilter, products, search, sortKey, stockState.qtyByName, stockState.seenByName]);

    const reorderLevel = useMemo(() => {
      void refreshKey;
      const getUser = () => {
        try {
          const local = JSON.parse(localStorage.getItem('currentUser') || 'null');
          if (local) return local;
        } catch {}
        return null;
      };
      const user = getUser();
      const role = String(user?.role || '').toLowerCase();
      const businessId = role && role !== 'admin' ? String(user?.businessId || '') : String(user?.id || '');
      const key = `systemPreferences:${businessId || 'default'}`;
      try {
        const prefs = localStore.get(key, null);
        const n = parseFloat(String(prefs?.inventory?.defaultReorderLevel ?? '0').replace(/,/g, ''));
        return Number.isFinite(n) && n > 0 ? n : 10;
      } catch {
        return 10;
      }
    }, [refreshKey]);

    // eslint-disable-next-line no-unused-vars
    const displayRows = useMemo(() => {
      if (!lowOnly) return rows;
      return rows.filter((r) => Number(r?._qty || 0) <= Number(reorderLevel || 0));
    }, [lowOnly, reorderLevel, rows]);

    const kpis = useMemo(() => {
      void refreshKey;
      const total = rows.length;
      const inStock = rows.filter((r) => r._qty > 0).length;
      const outStock = rows.filter((r) => Number(r._qty || 0) <= Number(reorderLevel || 0)).length;
      const stockValue = rows.reduce((s, r) => s + (r._value || 0), 0);
      let soldQty = 0;
      try {
        const norm = (v) => String(v || '').trim().toLowerCase();
        const known = new Set(rows.map((r) => norm(r?._name || r?.name || '')));
        let salesOnly = 0;
        let allOut = 0;
        (Array.isArray(stockMovements) ? stockMovements : []).forEach((r) => {
          if (!isInventoryMovementOut(r)) return;
          const nameKey = norm(r?.itemName || r?.name || '');
          if (!nameKey || !known.has(nameKey)) return;
          const qty = parseFloat(String(r?.quantity || 0)) || 0;
          if (!(qty > 0)) return;
          allOut += qty;
          const hay = `${r?.reason || ''} ${r?.description || ''} ${r?.note || ''}`.toLowerCase();
          if (r?.saleOrderId != null || /sales/.test(hay) || /invoice/.test(hay) || String(r?.rawMovementType || '').includes('SALE_OUT')) salesOnly += qty;
        });
        soldQty = salesOnly > 0 ? salesOnly : allOut;
      } catch {
        soldQty = 0;
      }
      return { total, inStock, outStock, stockValue, soldQty };
    }, [refreshKey, reorderLevel, rows]);

    const exportProductsCsv = () => {
      const header = ['Name', 'Category', 'Unit', 'Buying Price', 'Selling Price', 'Qty Remain', 'Value', 'SKU', 'Barcode', 'Status', 'Updated', 'Created', 'Description'];
      const dataRows = rows.map((p) => [
        String(p?._name || ''),
        String(p?._category || ''),
        String(p?.unit || ''),
        String(p?._buying ?? ''),
        String(p?._selling ?? ''),
        String(p?._qty ?? ''),
        String(p?._value ?? ''),
        String(p?.sku || ''),
        String(p?.barcode || ''),
        String(p?.status || ''),
        String(p?._updatedAt || ''),
        String(p?.createdAt || ''),
        String(p?.description || '')
      ]);
      downloadExcelFile(`products_${new Date().toISOString().slice(0, 10)}.xls`, {
        title: 'Products Report',
        subtitle: 'All products',
        rows: [header, ...dataRows]
      });
    };

    const importProductsFile = async (file) => {
      if (!file) return;
      if (importing) return;
      setImporting(true);
      try {
        const text = await file.text();
        let incoming = [];
        if (String(file.name || '').toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(text);
          incoming = Array.isArray(parsed) ? parsed : [];
        } else {
          const lines = String(text || '')
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          if (lines.length < 2) {
            setToast('Import file is empty');
            setImporting(false);
            return;
          }
          const parseLine = (line) => {
            const out = [];
            let cur = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i += 1) {
              const ch = line[i];
              if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  cur += '"';
                  i += 1;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (ch === ',' && !inQuotes) {
                out.push(cur);
                cur = '';
              } else {
                cur += ch;
              }
            }
            out.push(cur);
            return out.map((x) => String(x || '').trim());
          };
          const header = parseLine(lines[0]).map((h) => h.toLowerCase());
          const idx = (key) => header.findIndex((h) => h === key);
          const nameIdx = idx('name');
          const categoryIdx = idx('category');
          const unitIdx = idx('unit');
          const buyIdx = idx('buyingprice');
          const sellIdx = idx('sellingprice');
          const skuIdx = idx('sku');
          const barcodeIdx = idx('barcode');
          incoming = lines.slice(1).map((l) => {
            const cols = parseLine(l);
            return {
              name: nameIdx >= 0 ? cols[nameIdx] : '',
              category: categoryIdx >= 0 ? cols[categoryIdx] : '',
              unit: unitIdx >= 0 ? cols[unitIdx] : '',
              buyingPrice: buyIdx >= 0 ? cols[buyIdx] : '',
              sellingPrice: sellIdx >= 0 ? cols[sellIdx] : '',
              sku: skuIdx >= 0 ? cols[skuIdx] : '',
              barcode: barcodeIdx >= 0 ? cols[barcodeIdx] : ''
            };
          });
        }
        const normalized = (incoming || [])
          .map((p) => ({
            name: String(p?.name || '').trim(),
            category: String(p?.category || p?.itemType || 'general').trim() || 'general',
            unit: String(p?.unit || 'kg').trim() || 'kg',
            buyingPrice: toMoney(p?.buyingPrice ?? p?.buyPrice ?? p?.costPrice ?? 0),
            sellingPrice: toMoney(p?.sellingPrice ?? p?.sellPrice ?? p?.price ?? 0),
            sku: String(p?.sku || '').trim(),
            barcode: String(p?.barcode || '').trim(),
            imageDataUrl: String(p?.imageDataUrl || p?.image || '').trim()
          }))
          .filter((p) => Boolean(p.name));
        if (normalized.length === 0) {
          setToast('No valid products found to import');
          setImporting(false);
          return;
        }
        const existingList = await productsApi.list().catch(() => []);
        const byName = new Map(
          (Array.isArray(existingList) ? existingList : [])
            .map((p) => [String(p?.name || p?.itemName || '').trim().toLowerCase(), p])
            .filter(([key]) => Boolean(key))
        );
        let createdCount = 0;
        let updatedCount = 0;
        for (const p of normalized) {
          const key = String(p.name || '').trim().toLowerCase();
          if (!key) continue;
          const prev = byName.get(key);
          const payload = {
            name: p.name,
            category: p.category,
            productType: p.category,
            unit: p.unit,
            buyingPrice: p.buyingPrice,
            costPrice: p.buyingPrice,
            sellingPrice: p.sellingPrice,
            sku: p.sku || String(prev?.sku || '').trim(),
            barcode: p.barcode || String(prev?.barcode || '').trim(),
            imageDataUrl: p.imageDataUrl || String(prev?.imageDataUrl || '').trim(),
            status: String(prev?.status || 'active')
          };
          if (prev?.id) {
            const next = await productsApi.patch(String(prev.id), payload);
            byName.set(key, next || prev);
            updatedCount += 1;
            continue;
          }
          const created = await productsApi.create({
            ...payload,
            stockQuantity: 0
          });
          byName.set(key, created);
          createdCount += 1;
        }
        const latestList = await productsApi.list().catch(() => []);
        setProducts(Array.isArray(latestList) ? latestList : []);
        setToast(`Imported ${createdCount.toLocaleString()} new • Updated ${updatedCount.toLocaleString()}`);
        window.setTimeout(() => setToast(''), 1800);
      } catch {
        setToast('Import failed');
      }
      setImporting(false);
    };

    const openCreate = () => {
      setToast('');
      setModal({ open: true, mode: 'create', id: '' });
      setDraft({
        name: '',
        sku: '',
        barcode: '',
        category: 'general',
        unit: 'kg',
        qty: '',
        buyingPrice: '',
        sellingPrice: '',
        description: '',
        imageDataUrl: '',
        status: 'active'
      });
    };

    const openEdit = (p) => {
      setToast('');
      setModal({ open: true, mode: 'edit', id: String(p?.id || '') });
      setDraft({
        name: String(p?._name || p?.name || ''),
        sku: String(p?.sku || ''),
        barcode: String(p?.barcode || ''),
        category: String(p?._category || p?.category || 'general') || 'general',
        unit: String(p?.unit || 'kg') || 'kg',
        qty: String(p?._qty ?? ''),
        buyingPrice: String(p?.buyingPrice ?? p?.buyPrice ?? p?.costPrice ?? ''),
        sellingPrice: String(p?.sellingPrice ?? p?.sellPrice ?? p?.price ?? ''),
        description: String(p?.description || ''),
        imageDataUrl: String(p?.imageDataUrl || p?.image || ''),
        status: String(p?.status || 'active')
      });
    };

    const closeModal = () => {
      if (saving) return;
      setModal({ open: false, mode: 'create', id: '' });
      setDraft({
        name: '',
        sku: '',
        barcode: '',
        category: 'general',
        unit: 'kg',
        qty: '',
        buyingPrice: '',
        sellingPrice: '',
        description: '',
        imageDataUrl: '',
        status: 'active'
      });
    };

    const saveProduct = async () => {
      if (saving) return;
      const nameFromDraft = String(draft.name || '').trim();
      if (!nameFromDraft) {
        setToast('Product name is required');
        return;
      }
      const unitFromDraft = String(draft.unit || '').trim() || 'kg';
      const qty =
        modal.mode === 'edit'
          ? null
          : (() => {
              const raw = String(draft.qty || '').trim();
              if (!raw) return null;
              const n = parseFloat(raw);
              return Number.isFinite(n) ? Math.max(0, n) : null;
            })();
      const buying = toMoney(draft.buyingPrice);
      const selling = toMoney(draft.sellingPrice);
      setSaving(true);
      try {
        const payload = {
          name: nameFromDraft,
          sku: String(draft.sku || '').trim(),
          barcode: String(draft.barcode || '').trim(),
          category: String(draft.category || 'general').trim() || 'general',
          productType: String(draft.category || 'general').trim() || 'general',
          unit: unitFromDraft,
          buyingPrice: buying,
          costPrice: buying,
          sellingPrice: selling,
          description: String(draft.description || '').trim(),
          imageDataUrl: String(draft.imageDataUrl || '').trim(),
          status: String(draft.status || 'active').trim() || 'active'
        };
        if (modal.mode === 'edit') {
          const id = String(modal.id || '').trim();
          if (!id) throw new Error('Invalid product id');
          await productsApi.patch(id, payload);
        } else {
          await productsApi.create({
            ...payload,
            stockQuantity: qty != null && qty > 0 ? qty : 0
          });
        }
        setModal({ open: false, mode: 'create', id: '' });
        setToast('Saved');
        window.setTimeout(() => setToast(''), 1500);
      } catch (err) {
        const msg = String(err?.message || '').trim();
        setToast(msg ? `Failed to save: ${msg}` : 'Failed to save');
      } finally {
        setSaving(false);
      }
    };

    const requestDelete = (p) => {
      if (!canDelete) return;
      setDeleteModal({ open: true, id: String(p?.id || ''), name: String(p?._name || p?.name || '') });
    };

    const openStockIn = (p) => {
      if (!isAdmin) return;
      setToast('');
      setStockInQty('');
      setStockInModal({
        open: true,
        id: String(p?.id || ''),
        name: String(p?._name || p?.name || ''),
        category: String(p?._category || p?.category || p?.itemType || 'general') || 'general',
        unit: String(p?.unit || 'kg') || 'kg',
        buying: toMoney(p?.buyingPrice ?? p?.buyPrice ?? p?.costPrice ?? 0),
        selling: toMoney(p?.sellingPrice ?? p?.sellPrice ?? p?.price ?? 0)
      });
    };

    const openStockInPicker = () => {
      if (!isAdmin) return;
      setToast('');
      setStockInQty('');
      setStockInModal({ open: true, id: '', name: '', category: 'general', unit: 'kg', buying: 0, selling: 0 });
    };

    const confirmStockIn = async () => {
      if (!isAdmin) return;
      if (stockInLoading) return;
      if (!String(stockInModal.id || '').trim() || !String(stockInModal.name || '').trim()) {
        setToast('Select a product');
        return;
      }
      const qty = (() => {
        const n = parseFloat(String(stockInQty || '').trim());
        return Number.isFinite(n) ? Math.max(0, n) : 0;
      })();
      if (!qty) {
        setToast('Enter stock quantity');
        return;
      }
      setStockInLoading(true);
      try {
        const invId = String(stockInModal.id || '').trim();
        if (!invId) throw new Error('Invalid product');
        await productsApi.stockIn(invId, {
          quantity: qty,
          unitCost: Number(stockInModal.buying || 0),
          notes: 'Stock in'
        });
        setStockInModal({ open: false, id: '', name: '', category: 'general', unit: 'kg', buying: 0, selling: 0 });
        setStockInQty('');
        setToast('Stock added');
        window.setTimeout(() => setToast(''), 1400);
      } catch (err) {
        const msg = String(err?.message || '').trim();
        setToast(msg || 'Failed to add stock');
      } finally {
        setStockInLoading(false);
      }
    };

    const confirmDelete = async () => {
      if (deleteLoading) return;
      const startedAt = Date.now();
      setDeleteLoading(true);
      try {
        const id = String(deleteModal.id || '').trim();
        const targetName = String(deleteModal.name || '').trim().toLowerCase();
        if (!id && !targetName) throw new Error('Invalid product');
        const existing = await getStoredJson('inventoryItems', []);
        const list = Array.isArray(existing) ? existing.slice() : [];
        const idx = list.findIndex((p) => {
          const rowId = String(p?.id || '').trim();
          const rowName = String(p?.name || p?.itemName || '').trim().toLowerCase();
          if (id && rowId === id) return true;
          if (targetName && rowName === targetName) return true;
          return false;
        });
        if (idx < 0) throw new Error('Invalid product');
        const removed = list[idx];
        const removedId = String(removed?.id || '').trim();
        const removedName = String(removed?.name || removed?.itemName || '').trim().toLowerCase();
        await productsApi.remove(removedId || id);
        setToast('Deleted');
        window.setTimeout(() => setToast(''), 1200);
      } catch (err) {
        const msg = String(err?.message || '').trim();
        setToast(msg || 'Failed to delete');
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = 5000 - elapsed;
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
        setDeleteLoading(false);
        setDeleteModal({ open: false, id: '', name: '' });
      }
    };

    return (
      <div className="space-y-6">
        <ConfirmDeleteModal
          open={deleteModal.open}
          title="Delete Product?"
          description="This product will be removed from your catalog."
          confirmText="Delete"
          loading={deleteLoading}
          onCancel={() => (deleteLoading ? null : setDeleteModal({ open: false, id: '', name: '' }))}
          onConfirm={confirmDelete}
        />
        {stockInModal.open ? (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div className="text-base font-semibold text-gray-900">Stock In</div>
                <button
                  type="button"
                  className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50"
                  onClick={() => (stockInLoading ? null : setStockInModal({ open: false, id: '', name: '', category: 'general', unit: 'kg', buying: 0, selling: 0 }))}
                >
                  ✕
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">{stockInModal.name || 'Product'}</span>
                  <span className="text-gray-500"> • {stockInModal.category || 'general'}</span>
                </div>
                {!String(stockInModal.id || '').trim() ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Select product</div>
                    <select
                      value={stockInModal.id}
                      onChange={(e) => {
                        const id = String(e.target.value || '').trim();
                        if (!id) {
                          setStockInModal((p) => ({ ...p, id: '', name: '', category: 'general', unit: 'kg', buying: 0 }));
                          return;
                        }
                        const found = (rows || []).find((x) => String(x?.id || '') === id) || null;
                        if (!found) return;
                        setStockInModal({
                          open: true,
                          id: String(found?.id || ''),
                          name: String(found?._name || found?.name || ''),
                          category: String(found?._category || found?.category || found?.itemType || 'general') || 'general',
                          unit: String(found?.unit || 'kg') || 'kg',
                          buying: toMoney(found?.buyingPrice ?? found?.buyPrice ?? found?.costPrice ?? 0),
                          selling: toMoney(found?.sellingPrice ?? found?.sellPrice ?? found?.price ?? 0)
                        });
                      }}
                      className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Choose product…</option>
                      {(rows || []).map((p) => (
                        <option key={String(p?.id || '')} value={String(p?.id || '')}>
                          {String(p?._name || p?.name || '')}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div>
                  <div className="text-xs font-semibold text-gray-700">Quantity to add</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={stockInQty}
                      onChange={(e) => setStockInQty(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g. 10"
                      inputMode="decimal"
                    />
                    <div className="px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700">{stockInModal.unit || 'kg'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-[11px] font-semibold text-gray-600">SELLING PRICE</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{Number(stockInModal.selling || 0) ? `TSH ${money(stockInModal.selling)}` : '—'}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-[11px] font-semibold text-gray-600">STOCK IN VALUE</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {(() => {
                        const q = parseFloat(String(stockInQty || '').trim()) || 0;
                        const sp = Number(stockInModal.selling || 0) || 0;
                        const total = q > 0 && sp > 0 ? q * sp : 0;
                        return total ? `TSH ${money(total)}` : '—';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 font-semibold"
                  onClick={() => (stockInLoading ? null : setStockInModal({ open: false, id: '', name: '', category: 'general', unit: 'kg', buying: 0, selling: 0 }))}
                  disabled={stockInLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={stockInLoading ? 'px-5 py-2.5 rounded-2xl bg-green-600/70 text-white font-semibold cursor-not-allowed' : 'px-5 py-2.5 rounded-2xl bg-green-600 text-white hover:bg-green-700 font-semibold'}
                  onClick={confirmStockIn}
                  disabled={stockInLoading}
                >
                  {stockInLoading ? 'Adding...' : 'Add Stock'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Products library</div>
            </div>
            <div>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              >
                <option value="all">All locations</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-sm">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="w-56 bg-transparent outline-none"
                />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-sm">
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent outline-none">
                  {categories.map((c) => (
                    <option key={c} value={c}>{categoryOptionLabels.get(c) || (c === 'all' ? 'Category' : c)}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className={lowOnly ? 'inline-flex items-center gap-2 px-3 py-2 rounded-full border border-green-200 bg-green-50 text-sm font-semibold text-green-800' : 'inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-sm hover:bg-gray-50'}
                onClick={() => setLowOnly((v) => !v)}
                title="Toggle low stock filter"
              >
                Low stock <span className={lowOnly ? 'text-green-800' : 'text-gray-600'}>({kpis.outStock.toLocaleString()})</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm hover:bg-gray-50 inline-flex items-center gap-2"
                onClick={exportProductsCsv}
              >
                <Download className="w-4 h-4 text-gray-700" />
                Export
              </button>
              {isAdmin ? (
                <label className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm hover:bg-gray-50 inline-flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4 text-gray-700" />
                  {importing ? 'Importing...' : 'Bulk import'}
                  <input
                    type="file"
                    accept=".csv,.json"
                    className="hidden"
                    disabled={importing}
                    onChange={(e) => {
                      const file = e.target.files && e.target.files[0];
                      e.target.value = '';
                      void importProductsFile(file);
                    }}
                  />
                </label>
              ) : null}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={openStockInPicker}
                  className="px-4 py-2 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm font-semibold hover:bg-green-100 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Stock In
                </button>
              ) : null}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New product
                </button>
              ) : null}
            </div>
          </div>

          {toast ? <div className="mt-4 text-sm text-gray-700">{toast}</div> : null}

          <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Total goods</div>
                <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <PackageCheck className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{kpis.total.toLocaleString()}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Goods sold</div>
                <div className="w-9 h-9 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{Number(kpis.soldQty || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Out of stock</div>
                <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{kpis.outStock.toLocaleString()}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Stock value</div>
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <HandCoins className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">TZS {money(kpis.stockValue)}</div>
            </div>
          </div>

          <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3 text-right">Buying</th>
                    <th className="px-5 py-3 text-right">Selling</th>
                    <th className="px-5 py-3 text-right">Qty remain</th>
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3 text-right">Value</th>
                    <th className="px-5 py-3">Updated</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((p) => (
                    <tr key={String(p.id)} className="border-b border-gray-100">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {p.imageDataUrl ? (
                            <img alt="" src={p.imageDataUrl} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
                              {(p._name || 'P').slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{p._name || 'Product'}</div>
                            <div className="text-xs text-gray-600 truncate">{p._category}{p.sku ? ` • SKU ${p.sku}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-900 text-right">{p._buying ? money(p._buying) : '—'}</td>
                      <td className="px-5 py-4 text-sm text-gray-900 text-right">{p._selling ? money(p._selling) : '—'}</td>
                      <td className="px-5 py-4 text-sm text-gray-900 text-right">{Number(p._qty || 0).toLocaleString()}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{p.unit || '—'}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900 text-right">{p._value ? money(p._value) : '—'}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{p._updatedAt ? formatDisplayDate(p._updatedAt) : '—'}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isAdmin && Number(p._qty || 0) <= Number(reorderLevel || 0) ? (
                            <button
                              type="button"
                              className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-green-200 bg-green-50 hover:bg-green-100"
                              onClick={() => openStockIn(p)}
                              title="Stock In"
                            >
                              <Plus className="w-4 h-4 text-green-700" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={p?.isStoreOnly ? 'w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 cursor-not-allowed' : 'w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50'}
                            onClick={() => {
                              if (p?.isStoreOnly) return;
                              try {
                                localStorage.setItem(
                                  'selectedProductForSale',
                                  JSON.stringify({
                                    productType: String(p?._category || 'general'),
                                    productName: String(p?._name || ''),
                                    unit: String(p?.unit || ''),
                                    price: p?._selling ?? ''
                                  })
                                );
                              } catch {}
                              navigate('/placeholder/sales-order');
                            }}
                            title={p?.isStoreOnly ? 'Not for sale' : 'Sell'}
                            disabled={Boolean(p?.isStoreOnly)}
                          >
                            <ArrowRight className={p?.isStoreOnly ? 'w-4 h-4 text-gray-400' : 'w-4 h-4 text-gray-700'} />
                          </button>
                          <button
                            type="button"
                            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                            onClick={() => openEdit(p)}
                            disabled={!isAdmin}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-gray-700" />
                          </button>
                          {isAdmin && canDelete ? (
                            <button
                              type="button"
                              data-delete-trigger="true"
                              className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 hover:bg-red-50"
                              onClick={() => requestDelete(p)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-700" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayRows.length === 0 ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-sm text-gray-600" colSpan={8}>
                        No products found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {modal.open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-transparent" onClick={closeModal} />
            <div className="relative w-[94vw] max-w-[980px] rounded-2xl border border-gray-200 overflow-hidden max-h-[92vh] overflow-y-auto bg-white">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500" />
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div className="text-sm text-gray-900">{modal.mode === 'edit' ? 'Edit Product' : 'New Product'}</div>
                <button type="button" className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50" onClick={closeModal}>Close</button>
              </div>
                <div className="p-6 bg-gray-50 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4 bg-white border border-gray-200 rounded-2xl p-5">
                  <div>
                    <div className="text-xs text-gray-600">Product name *</div>
                    <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="Product name" disabled={modal.mode === 'edit'} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600">Category</div>
                      <select
                        value={draft.category}
                        onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
                        className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {(() => {
                          const opts = (categories || []).filter((c) => c !== 'all');
                          const list = opts.length ? opts : ['general'];
                          return list.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Unit</div>
                      <select value={draft.unit} onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500">
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600">Buying price</div>
                      <input type="number" inputMode="decimal" value={draft.buyingPrice} onChange={(e) => setDraft((p) => ({ ...p, buyingPrice: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm text-right outline-none focus:ring-2 focus:ring-green-500" placeholder="0" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Selling price</div>
                      <input type="number" inputMode="decimal" value={draft.sellingPrice} onChange={(e) => setDraft((p) => ({ ...p, sellingPrice: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm text-right outline-none focus:ring-2 focus:ring-green-500" placeholder="0" />
                      <div className="mt-1 text-xs text-gray-500">
                        Profit/unit: TZS {money(toMoney(draft.sellingPrice) - toMoney(draft.buyingPrice))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Qty</div>
                    <input type="number" inputMode="decimal" value={draft.qty} onChange={(e) => setDraft((p) => ({ ...p, qty: e.target.value.replace(/[^0-9.]/g, '') }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm text-right outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="0" disabled={modal.mode === 'edit'} />
                    <div className="mt-1 text-xs text-gray-500">{modal.mode === 'edit' ? 'Use Stock In to change quantity' : 'Sets opening stock'}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600">SKU</div>
                      <input value={draft.sku} onChange={(e) => setDraft((p) => ({ ...p, sku: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="SKU" disabled={modal.mode === 'edit'} />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Barcode</div>
                      <input value={draft.barcode} onChange={(e) => setDraft((p) => ({ ...p, barcode: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" placeholder="Barcode" disabled={modal.mode === 'edit'} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Description</div>
                    <textarea value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500 h-28" placeholder="Description" />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50" onClick={closeModal} disabled={saving}>Cancel</button>
                    <button type="button" className={saving ? 'px-4 py-2 rounded-xl bg-green-600/70 text-white text-sm cursor-not-allowed' : 'px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm'} onClick={saveProduct} disabled={saving}>
                      {saving ? (
                        <span className="inline-flex items-center gap-2">
                          <span>Saving...</span>
                        </span>
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-4 bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="text-xs text-gray-600">Product image</div>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="w-24 h-24 rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                        {draft.imageDataUrl ? (
                          <img alt="" src={draft.imageDataUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-sm text-gray-500">No image</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-sm text-gray-700"
                          disabled={modal.mode === 'edit'}
                          onChange={(e) => {
                            const file = e.target.files && e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = String(reader.result || '');
                              setDraft((p) => ({ ...p, imageDataUrl: result }));
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        {draft.imageDataUrl ? (
                          <button type="button" className="mt-2 px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" onClick={() => setDraft((p) => ({ ...p, imageDataUrl: '' }))} disabled={modal.mode === 'edit'}>
                            Remove image
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="text-xs text-gray-600">Status</div>
                    <select value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))} className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={modal.mode === 'edit'}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const Store = () => {
    const [refreshKey, setRefreshKey] = useState(0);
    const [storeTab, setStoreTab] = useState('movement');
    const [fromDate, setFromDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [moveType] = useState('all');
    const [movementProductKey, setMovementProductKey] = useState('all');
    const [q, setQ] = useState('');
    const [valueQ, setValueQ] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [assetDraft, setAssetDraft] = useState({ name: '', value: '', years: '' });
    const [assets, setAssets] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [stockMovements, setStockMovements] = useState([]);

    React.useEffect(() => {
      const handler = () => setRefreshKey((v) => v + 1);
      window.addEventListener('dataUpdated', handler);
      return () => {
        window.removeEventListener('dataUpdated', handler);
      };
    }, []);

    React.useEffect(() => {
      let alive = true;
      Promise.resolve()
        .then(async () => {
          const [fixedAssets, snapshot] = await Promise.all([getStoredJson('fixedAssets', []), productsApi.loadInventorySnapshot()]);
          const items = snapshot?.items;
          const seenNames = new Set();
          const sanitizedItems = (Array.isArray(items) ? items : []).filter((item) => {
            const name = String(item?.name || item?.itemName || '').trim();
            const key = name.toLowerCase();
            if (!name) return false;
            if (seenNames.has(key)) return false;
            seenNames.add(key);
            return true;
          });
          if (sanitizedItems.length !== (Array.isArray(items) ? items.length : 0)) {
            await setStoredJson('inventoryItems', sanitizedItems);
          }
          const validNames = new Set(sanitizedItems.map((item) => String(item?.name || item?.itemName || '').trim().toLowerCase()).filter(Boolean));
          const movements = (Array.isArray(snapshot?.movements) ? snapshot.movements : []).filter((m) => {
            const name = String(m?.itemName || m?.name || '').trim().toLowerCase();
            if (!name) return false;
            return validNames.has(name);
          }).map((m) => ({
            id: m?.id ?? `${String(m?.productId || '')}:${String(m?.itemName || m?.name || '')}:${String(m?.date || m?.createdAt || '')}:${Math.random().toString(16).slice(2)}`,
            movementType: m?.movementType,
            itemType: m?.itemType,
            itemName: m?.itemName || m?.name,
            quantity: m?.quantity,
            unit: m?.unit,
            pricePerItem: m?.pricePerItem,
            supplierName: m?.supplierName || m?.supplier,
            reason: m?.reason,
            note: m?.note,
            date: m?.date,
            createdAt: m?.createdAt,
            referenceId: m?.referenceId,
            sourceKey: String(m?.referenceType || ''),
            sourceIndex: -1
          }));
          if (!alive) return;
          setAssets(Array.isArray(fixedAssets) ? fixedAssets : []);
          setInventoryItems(sanitizedItems);
          setStockMovements(movements);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [refreshKey]);

    const toMoney = (v) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v || '').replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const money = (n) => (Number(n || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const saveAssets = (next) => {
      const list = Array.isArray(next) ? next : [];
      setAssets(list);
      void setStoredJson('fixedAssets', list).catch(() => {});
    };

    const addAsset = () => {
      const name = String(assetDraft.name || '').trim();
      const value = toMoney(assetDraft.value);
      const years = parseFloat(String(assetDraft.years || '').replace(/,/g, ''));
      if (!name || !(value > 0) || !(Number.isFinite(years) && years > 0)) return;
      const next = [
        {
          id: `AST-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name,
          value,
          years,
          createdAt: new Date().toISOString()
        },
        ...(Array.isArray(assets) ? assets : [])
      ].slice(0, 200);
      saveAssets(next);
      setAssetDraft({ name: '', value: '', years: '' });
    };

    const removeAsset = (id) => {
      saveAssets((Array.isArray(assets) ? assets : []).filter((a) => String(a?.id || '') !== String(id || '')));
    };

    const calcAssetDep = React.useCallback((a) => {
      const toMoneyLocal = (v) => {
        const n = typeof v === 'number' ? v : parseFloat(String(v || '').replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
      };
      const value = toMoneyLocal(a?.value);
      const years = parseFloat(String(a?.years || '').replace(/,/g, ''));
      const createdAtTs = Date.parse(String(a?.createdAt || ''));
      const ageYears = Number.isFinite(createdAtTs) ? Math.max(0, (Date.now() - createdAtTs) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
      const annual = value > 0 && Number.isFinite(years) && years > 0 ? value / years : 0;
      const depToDate = annual > 0 ? Math.min(value, annual * ageYears) : 0;
      const current = Math.max(0, value - depToDate);
      const remainingYears = Number.isFinite(years) && years > 0 ? Math.max(0, years - ageYears) : 0;
      return { value, years, ageYears, annual, depToDate, current, remainingYears };
    }, []);

    const assetsSummary = useMemo(() => {
      const list = Array.isArray(assets) ? assets : [];
      const totals = list.reduce(
        (acc, a) => {
          const d = calcAssetDep(a);
          acc.totalOriginal += d.value;
          acc.totalCurrent += d.current;
          acc.totalDepToDate += d.depToDate;
          acc.totalAnnualDep += d.annual;
          return acc;
        },
        { totalOriginal: 0, totalCurrent: 0, totalDepToDate: 0, totalAnnualDep: 0 }
      );
      return { ...totals, count: list.length };
    }, [assets, calcAssetDep]);

    const moveRows = useMemo(() => {
      void refreshKey;
      const out = [];
      const norm = (v) => String(v || '').trim().toLowerCase();
      const displayNameByKey = new Map();
      const unitByKey = new Map();
      (Array.isArray(inventoryItems) ? inventoryItems : []).forEach((it) => {
        const displayName = String(it?.name || it?.itemName || '').trim();
        const key = norm(displayName);
        if (!key) return;
        if (!displayNameByKey.has(key)) displayNameByKey.set(key, displayName);
        if (!unitByKey.has(key)) unitByKey.set(key, String(it?.unit || '').trim());
      });

      (Array.isArray(stockMovements) ? stockMovements : []).forEach((m) => {
        const rawName = String(m?.itemName || '').trim();
        const nameKey = norm(rawName);
        if (!nameKey) return;
        const name = displayNameByKey.get(nameKey) || rawName;
        const qty = parseFloat(String(m?.quantity || 0)) || 0;
        const isIn = isInventoryMovementIn(m);
        const isOut = isInventoryMovementOut(m);
        const type = isIn ? 'IN' : isOut ? 'OUT' : 'ADJ';
        const rawDateTime = String(m?.date || m?.createdAt || '').trim();
        const rawDateOnly = rawDateTime ? rawDateTime.slice(0, 10) : '';
        out.push({
          id: String(m?.id || `local_${Math.random()}`),
          date: rawDateOnly,
          dateTime: rawDateTime,
          type,
          itemType: String(m?.itemType || ''),
          name,
          nameKey,
          quantity: qty,
          unit: String(m?.unit || unitByKey.get(nameKey) || ''),
          unitCost: toMoney(isIn ? (m?.pricePerItem ?? 0) : 0),
          sellingPrice: toMoney(isOut ? (m?.pricePerItem ?? 0) : 0),
          reference: String(m?.referenceId || ''),
          note: String(m?.note || m?.reason || ''),
          sourceKey: String(m?.sourceKey || ''),
          sourceIndex: Number.isInteger(m?.sourceIndex) ? m.sourceIndex : -1,
          raw: m
        });
      });
      return out;
    }, [refreshKey, inventoryItems, stockMovements]);

    const movementProducts = useMemo(() => {
      const norm = (v) => String(v || '').trim().toLowerCase();
      const map = new Map();
      inventoryItems.forEach((it) => {
        const name = String(it?.name || it?.itemName || '').trim();
        if (!name) return;
        const key = norm(name);
        if (!key) return;
        if (!map.has(key)) map.set(key, name);
      });
      const list = Array.from(map.entries())
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
      return [{ key: 'all', label: 'All Products' }, ...list];
    }, [inventoryItems]);

    const priceByName = useMemo(() => {
      const map = new Map();
      inventoryItems.forEach((it) => {
        const name = String(it?.name || it?.itemName || '').trim();
        if (!name) return;
        const p = toMoney(it?.sellingPrice ?? it?.sellPrice ?? it?.price ?? it?.unitPrice ?? 0);
        if (p > 0) map.set(name.toLowerCase(), p);
      });
      return map;
    }, [inventoryItems]);

    const movementRows = useMemo(() => {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const type = String(moveType || 'all');
      const productKeyFilter = String(movementProductKey || 'all');
      const term = (q || '').trim().toLowerCase();
      const base = (moveRows || []).filter((r) => {
        const s = String(r?.dateTime || r?.date || '');
        const t = Date.parse(s);
        if (!Number.isFinite(t)) return false;
        const day = new Date(String(r?.date || ''));
        if (isNaN(day)) return false;
        if (day < start || day > end) return false;
        if (type !== 'all' && String(r.type || '').toUpperCase() !== type.toUpperCase()) return false;
        if (productKeyFilter !== 'all' && String(r.nameKey || '').trim().toLowerCase() !== productKeyFilter) return false;
        return true;
      });
      return term
        ? base.filter((r) => {
            const hay = `${r.name || ''} ${r.itemType || ''} ${r.note || ''} ${r.reference || ''}`.toLowerCase();
            return hay.includes(term);
          })
        : base;
    }, [fromDate, moveRows, moveType, movementProductKey, q, toDate]);

    const stockValueRows = useMemo(() => {
      const byKey = new Map();
      const meta = new Map();
      const categoryByNameKey = new Map();
      const norm = (v) => String(v || '').trim().toLowerCase();
      const movementKnownKeys = new Set(
        (Array.isArray(moveRows) ? moveRows : [])
          .map((row) => String(row?.nameKey || row?.name || '').trim().toLowerCase())
          .filter(Boolean)
      );
      (Array.isArray(inventoryItems) ? inventoryItems : []).forEach((it) => {
        const name = String(it?.name || it?.itemName || '').trim();
        const key = norm(name);
        if (!key) return;
        const category = String(it?.category || it?.itemType || 'general').trim() || 'general';
        if (!categoryByNameKey.has(key)) categoryByNameKey.set(key, category);
      });
      (Array.isArray(inventoryItems) ? inventoryItems : []).forEach((it) => {
        const name = String(it?.name || it?.itemName || '').trim();
        const key = norm(name);
        if (!key) return;
        const qtyRaw = String(it?.stockQuantity ?? it?.qty ?? it?.quantity ?? 0).replace(/,/g, '');
        const qty = parseFloat(qtyRaw);
        if (!Number.isFinite(qty)) return;
        if (!byKey.has(key)) byKey.set(key, movementKnownKeys.has(key) ? 0 : qty);
        const unit = String(it?.unit || '').trim();
        const buying = Number(it?.buyingPrice ?? it?.buyPrice ?? it?.costPrice ?? 0) || 0;
        const t = Date.parse(String(it?.updatedAt || it?.createdAt || ''));
        meta.set(key, {
          name: name || '—',
          nameKey: key,
          itemType: categoryByNameKey.get(key) || String(it?.category || it?.itemType || '—'),
          unit: unit || '—',
          lastCost: buying > 0 ? buying : 0,
          lastCostTs: Number.isFinite(t) ? t : 0,
          lastSeenTs: Number.isFinite(t) ? t : 0
        });
      });
      const tsOf = (r) => {
        const s = String(r?.dateTime || r?.raw?.createdAt || r?.raw?.timestamp || r?.date || '');
        const t = Date.parse(s);
        return Number.isFinite(t) ? t : Date.parse(`${String(r?.date || '')}T00:00:00`);
      };
      const asc = [...(moveRows || [])].sort((a, b) => tsOf(a) - tsOf(b));
      asc.forEach((r) => {
        const nameKey = String(r.nameKey || String(r.name || '').toLowerCase()).trim();
        const key = nameKey;
        const cur = byKey.get(key) || 0;
        const next = cur + (String(r.type || '').toUpperCase() === 'IN' ? Number(r.quantity || 0) : -Number(r.quantity || 0));
        byKey.set(key, next);
        const m = meta.get(key) || {
          name: r.name,
          nameKey,
          itemType: categoryByNameKey.get(nameKey) || r.itemType,
          unit: r.unit,
          lastCost: 0,
          lastCostTs: 0,
          lastSeenTs: 0
        };
        const t = tsOf(r);
        m.name = r.name || m.name;
        m.nameKey = String(r.nameKey || m.nameKey || String(r.name || '').toLowerCase()).trim();
        m.itemType = categoryByNameKey.get(m.nameKey) || r.itemType || m.itemType;
        m.unit = r.unit || m.unit;
        m.lastSeenTs = Math.max(m.lastSeenTs || 0, t || 0);
        if (String(r.type || '').toUpperCase() === 'IN' && Number(r.unitCost || 0) > 0 && t >= (m.lastCostTs || 0)) {
          m.lastCost = Number(r.unitCost || 0);
          m.lastCostTs = t;
        }
        meta.set(key, m);
      });
      const rows = [];
      byKey.forEach((qty, key) => {
        const m = meta.get(key);
        const qn = Number(qty || 0);
        if (!m) return;
        const fallback = priceByName.get(String(m.nameKey || '').trim()) || priceByName.get(String(m.name || '').toLowerCase()) || 0;
        const unitCost = Number(m.lastCost || 0) || fallback;
        rows.push({
          key,
          name: m.name || '—',
          itemType: categoryByNameKey.get(String(m.nameKey || '').trim()) || m.itemType || '—',
          unit: m.unit || '—',
          qty: qn,
          unitCost,
          totalValue: qn * unitCost,
          updatedAt: m.lastSeenTs ? new Date(m.lastSeenTs).toISOString() : ''
        });
      });
      rows.sort((a, b) => b.totalValue - a.totalValue);
      return rows;
    }, [inventoryItems, moveRows, priceByName]);

    const stockValueFiltered = useMemo(() => {
      const term = (valueQ || '').trim().toLowerCase();
      if (!term) return stockValueRows;
      return stockValueRows.filter((r) => `${r.name} ${r.itemType}`.toLowerCase().includes(term));
    }, [stockValueRows, valueQ]);

    const stockValueTotals = useMemo(() => {
      const inStock = stockValueRows.filter((r) => Number(r.qty || 0) > 0);
      const totalValue = inStock.reduce((s, r) => s + Number(r.totalValue || 0), 0);
      const totalUnits = inStock.reduce((s, r) => s + Number(r.qty || 0), 0);
      const unique = inStock.length;
      return { totalValue, totalUnits, unique };
    }, [stockValueRows]);

    const rowsWithBalance = useMemo(() => {
      const tsOf = (r) => {
        const s = String(r?.dateTime || r?.raw?.createdAt || r?.raw?.timestamp || r?.date || '');
        const t = Date.parse(s);
        return Number.isFinite(t) ? t : Date.parse(`${String(r?.date || '')}T00:00:00`);
      };
      const startTs = Date.parse(`${String(fromDate || '').slice(0, 10)}T00:00:00`);
      const norm = (v) => String(v || '').trim().toLowerCase();
      const openingByKey = new Map();
      const metaByKey = new Map();
      const movementKnownKeys = new Set(
        (Array.isArray(moveRows) ? moveRows : [])
          .map((row) => String(row?.nameKey || row?.name || '').trim().toLowerCase())
          .filter(Boolean)
      );
      inventoryItems.forEach((it) => {
        const name = String(it?.name || it?.itemName || '').trim();
        if (!name) return;
        const nameKeyOnly = norm(name);
        if (String(movementProductKey || 'all') !== 'all' && nameKeyOnly !== String(movementProductKey || '').trim().toLowerCase()) return;
        const baseQtyRaw = String(it?.stockQuantity ?? it?.qty ?? it?.quantity ?? 0).replace(/,/g, '');
        const baseQty = parseFloat(baseQtyRaw);
        if (!Number.isFinite(baseQty)) return;
        const key = nameKeyOnly;
        if (!openingByKey.has(key)) openingByKey.set(key, movementKnownKeys.has(key) ? 0 : baseQty);
        if (!metaByKey.has(key)) {
          metaByKey.set(key, {
            name,
            nameKey: nameKeyOnly,
            itemType: String(it?.category || it?.itemType || '').trim(),
            unit: String(it?.unit || '').trim()
          });
        }
      });
      (moveRows || []).forEach((r) => {
        const t = tsOf(r);
        if (!Number.isFinite(t) || !Number.isFinite(startTs) || !(t < startTs)) return;
        if (String(movementProductKey || 'all') !== 'all' && String(r.nameKey || '').trim().toLowerCase() !== String(movementProductKey || '').trim().toLowerCase()) return;
        const key = String(r.nameKey || String(r.name || '')).trim().toLowerCase();
        const cur = openingByKey.get(key) || 0;
        const next = cur + (String(r.type || '').toUpperCase() === 'IN' ? Number(r.quantity || 0) : -Number(r.quantity || 0));
        openingByKey.set(key, next);
        if (!metaByKey.has(key)) {
          metaByKey.set(key, {
            name: r.name,
            nameKey: String(r.nameKey || '').trim(),
            itemType: String(r.itemType || '').trim(),
            unit: String(r.unit || '').trim()
          });
        }
      });

      const asc = [...movementRows].sort((a, b) => tsOf(a) - tsOf(b));
      const seen = new Set();
      const balanceByKey = new Map();
      const out = [];
      asc.forEach((r) => {
        const key = String(r.nameKey || String(r.name || '')).trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          const opening = openingByKey.get(key) || 0;
          balanceByKey.set(key, opening);
        }
        const cur = balanceByKey.get(key) || 0;
        const next = cur + (String(r.type || '').toUpperCase() === 'IN' ? Number(r.quantity || 0) : -Number(r.quantity || 0));
        balanceByKey.set(key, next);
        const resolvedSellingPrice = Number(r.sellingPrice || 0) > 0
          ? Number(r.sellingPrice || 0)
          : Number(priceByName.get(String(r.nameKey || '').trim()) || priceByName.get(String(r.name || '').toLowerCase()) || 0);
        out.push({ ...r, sellingPrice: resolvedSellingPrice, balanceQty: next });
      });
      return out;
    }, [fromDate, inventoryItems, movementProductKey, movementRows, moveRows, priceByName]);

    const kpis = useMemo(() => {
      const totalIn = rowsWithBalance.filter((r) => String(r.type || '').toUpperCase() === 'IN').reduce((s, r) => s + Number(r.quantity || 0), 0);
      const totalOut = rowsWithBalance.filter((r) => String(r.type || '').toUpperCase() === 'OUT').reduce((s, r) => s + Number(r.quantity || 0), 0);
      const balance = (() => {
        const lastByKey = new Map();
        rowsWithBalance.forEach((r) => {
          const key = String(r?.nameKey || r?.name || '').trim().toLowerCase();
          if (!key) return;
          lastByKey.set(key, Number(r.balanceQty || 0));
        });
        return Array.from(lastByKey.values()).reduce((s, n) => s + Number(n || 0), 0);
      })();
      const revenue = rowsWithBalance
        .filter((r) => String(r.type || '').toUpperCase() === 'OUT')
        .reduce((s, r) => s + Number(r.quantity || 0) * Number(r.sellingPrice || 0), 0);
      const outCount = rowsWithBalance.filter((r) => String(r.type || '').toUpperCase() === 'OUT').length;
      const inValue = rowsWithBalance
        .filter((r) => String(r.type || '').toUpperCase() === 'IN')
        .reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unitCost || 0), 0);
      return { totalIn, totalOut, balance, revenue, outCount, inValue };
    }, [rowsWithBalance]);

    const exportCSV = () => {
      const rows = [['No', 'Product', 'Movement', 'Qty In', 'Qty Out', 'Unit Cost (TSH)', 'Selling Price (TSH)', 'Total Amount (TSH)', 'Balance Qty', 'Reference', 'Date & Time', 'Note', 'Category']];
      rowsWithBalance.forEach((r, idx) => {
        const qtyIn = r.type === 'IN' ? String(Number(r.quantity || 0)) : '';
        const qtyOut = r.type === 'OUT' ? String(Number(r.quantity || 0)) : '';
        const unitCost = r.unitCost ? String(r.unitCost) : '';
        const selling = r.sellingPrice ? String(r.sellingPrice) : '';
        const total = (r.type === 'IN' || r.type === 'OUT') ? Number(r.quantity || 0) * Number(r.sellingPrice || 0) : 0;
        rows.push([
          String(idx + 1),
          String(r.name || ''),
          String(r.type || ''),
          qtyIn,
          qtyOut,
          unitCost,
          selling,
          String(total || 0),
          String(r.balanceQty ?? ''),
          String(r.reference || ''),
          String(r.dateTime || r.date || ''),
          String(r.note || ''),
          String(r.itemType || '')
        ]);
      });
      downloadExcelFile(`Stock_Movement_${fromDate}_to_${toDate}.xls`, {
        title: 'Stock Movement Report',
        subtitle: `${fromDate} to ${toDate}`,
        rows
      });
    };

    const exportStockValueCSV = () => {
      const rows = [['#', 'Product', 'Category', 'Qty', 'Unit', 'Unit Cost', 'Total Value', 'Updated']];
      const list = stockValueFiltered.filter((r) => Number(r.qty || 0) > 0);
      list.forEach((r, i) => {
        rows.push([
          String(i + 1),
          String(r.name || ''),
          String(r.itemType || ''),
          String(r.qty || 0),
          String(r.unit || ''),
          String(r.unitCost || 0),
          String(r.totalValue || 0),
          String(r.updatedAt || '')
        ]);
      });
      downloadExcelFile(`stock_value_${new Date().toISOString().slice(0, 10)}.xls`, {
        title: 'Stock Value Report',
        subtitle: `As of ${new Date().toISOString().slice(0, 10)}`,
        rows
      });
    };

    const printReport = () => {
      printWithTitle(`Stock Movement - ${fromDate} to ${toDate}`);
    };

    const printStockValue = () => {
      printWithTitle('Stock Value');
    };

    const openDeleteOne = (row) => {
      setDeleteTarget(row || null);
      setDeleteOpen(true);
    };

    const doDelete = () => {
      if (deleteLoading) return;
      const startedAt = Date.now();
      setDeleteLoading(true);
      (async () => {
        try {
          if (deleteTarget) {
            const key = String(deleteTarget.sourceKey || '');
            const idx = Number(deleteTarget.sourceIndex);
            const rawId = deleteTarget?.raw?.id;
            if (key) {
              const raw = localStorage.getItem(key);
              const list = (() => {
                try {
                  const v = JSON.parse(raw || '[]');
                  return Array.isArray(v) ? v : [];
                } catch {
                  return [];
                }
              })();
              let next = list;
              if (Number.isInteger(idx) && idx >= 0 && idx < list.length) {
                const at = list[idx];
                const matchById = rawId != null && String(at?.id) === String(rawId);
                if (rawId == null || matchById) {
                  next = list.slice();
                  next.splice(idx, 1);
                }
              }
              if (next === list && rawId != null) {
                next = list.filter((r) => String(r?.id) !== String(rawId));
              }
              if (next === list) {
                next = list.filter((r) => {
                  const a = String(r?.itemName || r?.name || '').trim();
                  const b = String(deleteTarget?.raw?.itemName || deleteTarget?.raw?.name || '').trim();
                  const qa = parseFloat(String(r?.quantity || 0)) || 0;
                  const qb = parseFloat(String(deleteTarget?.raw?.quantity || 0)) || 0;
                  const da = String(r?.date || r?.createdAt || '').slice(0, 10);
                  const db = String(deleteTarget?.raw?.date || deleteTarget?.raw?.createdAt || '').slice(0, 10);
                  return !(a === b && qa === qb && da === db);
                });
              }
              localStorage.setItem(key, JSON.stringify(next));
            }
          }
          window.dispatchEvent(new CustomEvent('dataUpdated'));
          setRefreshKey((v) => v + 1);
          setDeleteOpen(false);
          setDeleteTarget(null);
        } finally {
          const elapsed = Date.now() - startedAt;
          const remaining = 5000 - elapsed;
          if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
          setDeleteLoading(false);
        }
      })();
    };

    return (
      <div className="space-y-5">
        <style>{`
          .movement-report-print-screen { position: absolute; left: -10000px; top: 0; opacity: 0; pointer-events: none; }
          @media print {
            @page { size: A4 landscape; margin: 10mm; }
            .movement-report-print-screen { left: 0 !important; opacity: 1 !important; pointer-events: auto !important; }
            .movement-report-print { font-size: 12px !important; }
            .movement-report-print .text-right { text-align: right !important; }
          }
        `}</style>

        <div className="flex items-center justify-between gap-3 flex-wrap report-no-print">
          <div className="text-sm text-gray-600">
            Stocks <span className="mx-1">›</span>{' '}
            <span className="text-gray-900 font-medium">{storeTab === 'movement' ? 'Store & Stock Movement' : 'Store & Stock Value'}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-2xl bg-green-50 border border-green-200 p-1">
              <button
                type="button"
                data-no-loading="true"
                className={
                  storeTab === 'movement'
                    ? 'px-4 py-2 rounded-2xl bg-green-600 text-white text-sm font-semibold shadow-sm'
                    : 'px-4 py-2 rounded-2xl text-green-800 text-sm font-semibold hover:bg-green-100'
                }
                onClick={() => setStoreTab('movement')}
              >
                <span className="inline-flex items-center gap-2">
                  Stock Movement
                  <span className={storeTab === 'movement' ? 'px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold' : 'px-2 py-0.5 rounded-full bg-white text-green-800 text-xs font-semibold border border-green-200'}>
                    {rowsWithBalance.length}
                  </span>
                </span>
              </button>
              <button
                type="button"
                data-no-loading="true"
                className={
                  storeTab === 'value'
                    ? 'px-4 py-2 rounded-2xl bg-green-600 text-white text-sm font-semibold shadow-sm'
                    : 'px-4 py-2 rounded-2xl text-green-800 text-sm font-semibold hover:bg-green-100'
                }
                onClick={() => setStoreTab('value')}
              >
                <span className="inline-flex items-center gap-2">
                  Stock Value
                  <span className={storeTab === 'value' ? 'px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold' : 'px-2 py-0.5 rounded-full bg-white text-green-800 text-xs font-semibold border border-green-200'}>
                    {stockValueTotals.unique}
                  </span>
                </span>
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={storeTab === 'movement' ? q : valueQ}
                onChange={(e) => (storeTab === 'movement' ? setQ(e.target.value) : setValueQ(e.target.value))}
                placeholder={storeTab === 'movement' ? 'Search products or SKU...' : 'Search products...'}
                className="w-[340px] max-w-[80vw] pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              type="button"
              data-no-loading="true"
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2"
              onClick={storeTab === 'movement' ? exportCSV : exportStockValueCSV}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          {storeTab === 'movement' ? (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[12px] text-green-700 font-medium tracking-wide">Inventory tracking</div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">Stock Movement</div>
                  <div className="mt-2 text-sm text-gray-600">All stock in &amp; stock out events — {fromDate} to {toDate}</div>
                </div>
                <div className="flex items-center gap-2 report-no-print">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-700">Product</div>
                    <select className="px-3 py-2 border rounded-xl text-sm" value={movementProductKey} onChange={(e) => setMovementProductKey(e.target.value)}>
                      {movementProducts.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-700">From</div>
                    <DateInput className="px-3 py-2 border rounded-xl text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-700">To</div>
                    <DateInput className="px-3 py-2 border rounded-xl text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="p-5">
                    <div className="text-[11px] font-medium text-gray-500 tracking-wide">TOTAL STOCK IN</div>
                    <div className="mt-2 text-3xl font-semibold text-green-700">{Number(kpis.totalIn || 0).toLocaleString()} units</div>
                    <div className="mt-2 text-sm text-gray-600">TSH {money(kpis.inValue)} received value</div>
                  </div>
                  <div className="h-1 bg-green-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="p-5">
                    <div className="text-[11px] font-medium text-gray-500 tracking-wide">TOTAL STOCK OUT (SOLD)</div>
                    <div className="mt-2 text-3xl font-semibold text-rose-700">{Number(kpis.totalOut || 0).toLocaleString()} units</div>
                    <div className="mt-2 text-sm text-gray-600">TSH {money(kpis.revenue)} selling value</div>
                  </div>
                  <div className="h-1 bg-rose-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="p-5">
                    <div className="text-[11px] font-medium text-gray-500 tracking-wide">NET STOCK BALANCE</div>
                    <div className="mt-2 text-3xl font-semibold text-blue-700">{Number(kpis.balance || 0).toLocaleString()} units</div>
                    <div className="mt-2 text-sm text-gray-600">Current balance</div>
                  </div>
                  <div className="h-1 bg-blue-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="p-5">
                    <div className="text-[11px] font-medium text-gray-500 tracking-wide">TOTAL SELLING REVENUE</div>
                    <div className="mt-2 text-3xl font-semibold text-amber-700">TSH {money(kpis.revenue)}</div>
                    <div className="mt-2 text-sm text-gray-600">{kpis.outCount} transactions recorded</div>
                  </div>
                  <div className="h-1 bg-amber-600" />
                </div>
              </div>

              <div className="mt-6 bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Stock Movement Log</div>
                    <div className="text-xs text-gray-600">All stock in &amp; stock out events — tracked automatically</div>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-[1200px] w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-600">
                      <tr className="grid grid-cols-[60px_220px_110px_100px_110px_120px_140px_120px_140px_170px_110px] px-5 py-3">
                        <th className="text-left tracking-wide">#</th>
                        <th className="text-left tracking-wide">PRODUCT</th>
                        <th className="text-left tracking-wide">TYPE</th>
                        <th className="text-right tracking-wide">QTY IN</th>
                        <th className="text-right tracking-wide">QTY OUT</th>
                        <th className="text-right tracking-wide">SELL PRICE</th>
                        <th className="text-right tracking-wide">TOTAL AMOUNT</th>
                        <th className="text-right tracking-wide">BALANCE QTY</th>
                        <th className="text-left tracking-wide">REFERENCE</th>
                        <th className="text-left tracking-wide">DATE &amp; TIME</th>
                        <th className="text-left tracking-wide">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rowsWithBalance.map((r, idx) => {
                        const qtyIn = r.type === 'IN' ? Number(r.quantity || 0) : 0;
                        const qtyOut = r.type === 'OUT' ? Number(r.quantity || 0) : 0;
                        const total = (qtyIn || qtyOut) ? (qtyIn || qtyOut) * Number(r.sellingPrice || 0) : 0;
                        const dt = r.dateTime || r.date || '';
                        const canDeleteRow = canDelete;
                        return (
                          <tr key={r.id} className="grid grid-cols-[60px_220px_110px_100px_110px_120px_140px_120px_140px_170px_110px] px-5 py-3 items-center">
                            <td className="text-sm text-gray-700">{idx + 1}</td>
                            <td className="text-sm font-medium text-gray-900 truncate">{r.name || '—'}</td>
                            <td className="text-sm">
                              <span
                                className={
                                  r.type === 'IN'
                                    ? 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium'
                                    : 'px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-medium'
                                }
                              >
                                {r.type === 'IN' ? 'Stock In' : 'Stock Out'}
                              </span>
                            </td>
                            <td className="text-sm text-gray-800 text-right">{qtyIn ? `+${qtyIn.toLocaleString()}` : '—'}</td>
                            <td className="text-sm text-gray-800 text-right">{qtyOut ? `-${qtyOut.toLocaleString()}` : '—'}</td>
                            <td className="text-sm text-gray-800 text-right">{r.sellingPrice ? `TSH ${money(r.sellingPrice)}` : '—'}</td>
                            <td className="text-sm text-gray-900 text-right">{total ? `TSH ${money(total)}` : '—'}</td>
                            <td className="text-sm text-gray-900 text-right">{Number(r.balanceQty || 0).toLocaleString()}</td>
                            <td className="text-sm text-gray-700 truncate">{r.reference ? String(r.reference) : '—'}</td>
                            <td className="text-sm text-gray-700">{dt ? String(dt).slice(0, 19).replace('T', ' ') : '—'}</td>
                            <td className="text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  data-delete-trigger="true"
                                  className={canDeleteRow ? 'px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 inline-flex items-center gap-2' : 'px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed inline-flex items-center gap-2'}
                                  onClick={() => (canDeleteRow ? openDeleteOne(r) : null)}
                                  disabled={!canDeleteRow}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {rowsWithBalance.length === 0 ? (
                        <tr>
                          <td className="px-5 py-10 text-sm text-gray-600 text-center" colSpan={12}>
                            No records found
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 flex items-center justify-between gap-3 flex-wrap border-t border-gray-200 report-no-print">
                  <div className="text-sm text-gray-600">{rowsWithBalance.length} records</div>
                  <div className="flex items-center gap-2">
                    <button type="button" data-no-loading="true" className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2" onClick={exportCSV}>
                      <Download className="w-4 h-4" />
                      Excel
                    </button>
                    <button type="button" data-no-loading="true" className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2" onClick={printReport}>
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[12px] text-blue-700 font-medium tracking-wide">Valuation</div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">Stock Value</div>
                  <div className="mt-2 text-sm text-gray-600">Estimated inventory value based on current balances</div>
                </div>
                <div className="flex items-center gap-2 report-no-print">
                  <button type="button" data-no-loading="true" className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2" onClick={exportStockValueCSV}>
                    <Download className="w-4 h-4" />
                    Excel
                  </button>
                  <button type="button" data-no-loading="true" className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2" onClick={printStockValue}>
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="p-5">
                        <div className="text-[11px] font-medium text-gray-500 tracking-wide">TOTAL STOCK VALUE</div>
                        <div className="mt-2 text-3xl font-semibold text-blue-700">TSH {money(stockValueTotals.totalValue)}</div>
                        <div className="mt-2 text-sm text-gray-600">Estimated value in store</div>
                      </div>
                      <div className="h-1 bg-blue-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="p-5">
                        <div className="text-[11px] font-medium text-gray-500 tracking-wide">ITEMS IN STOCK</div>
                        <div className="mt-2 text-3xl font-semibold text-emerald-700">{Number(stockValueTotals.unique || 0).toLocaleString()}</div>
                        <div className="mt-2 text-sm text-gray-600">Unique products with balance</div>
                      </div>
                      <div className="h-1 bg-emerald-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="p-5">
                        <div className="text-[11px] font-medium text-gray-500 tracking-wide">TOTAL UNITS</div>
                        <div className="mt-2 text-3xl font-semibold text-gray-900">{Number(stockValueTotals.totalUnits || 0).toLocaleString()}</div>
                        <div className="mt-2 text-sm text-gray-600">Combined quantity balance</div>
                      </div>
                      <div className="h-1 bg-gray-900" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="p-5">
                        <div className="text-[11px] font-medium text-gray-500 tracking-wide">AVG VALUE / ITEM</div>
                        <div className="mt-2 text-3xl font-semibold text-amber-700">
                          TSH {money(stockValueTotals.unique ? stockValueTotals.totalValue / stockValueTotals.unique : 0)}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">Average per product</div>
                      </div>
                      <div className="h-1 bg-amber-600" />
                    </div>
                  </div>

                  <div className="mt-6 bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Stock Value Breakdown</div>
                        <div className="text-xs text-gray-600">Per-product balance × unit cost estimate</div>
                      </div>
                      <div className="text-sm text-gray-600 report-no-print">{stockValueFiltered.filter((r) => Number(r.qty || 0) > 0).length} rows</div>
                    </div>
                    <div className="overflow-auto">
                      <table className="min-w-[980px] w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-600">
                          <tr className="grid grid-cols-[70px_minmax(0,1fr)_180px_120px_100px_160px_180px_200px] px-5 py-3">
                            <th className="text-left tracking-wide">#</th>
                            <th className="text-left tracking-wide">PRODUCT</th>
                            <th className="text-left tracking-wide">CATEGORY</th>
                            <th className="text-right tracking-wide">QTY</th>
                            <th className="text-left tracking-wide">UNIT</th>
                            <th className="text-right tracking-wide">UNIT COST</th>
                            <th className="text-right tracking-wide">TOTAL VALUE</th>
                            <th className="text-left tracking-wide">UPDATED</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {stockValueFiltered
                            .filter((r) => Number(r.qty || 0) > 0)
                            .map((r, i) => (
                              <tr key={r.key} className="grid grid-cols-[70px_minmax(0,1fr)_180px_120px_100px_160px_180px_200px] px-5 py-3 items-center">
                                <td className="text-sm text-gray-700">{i + 1}</td>
                                <td className="text-sm font-medium text-gray-900 truncate">{r.name}</td>
                                <td className="text-sm text-gray-700 truncate">{r.itemType}</td>
                                <td className="text-sm text-gray-900 text-right">{Number(r.qty || 0).toLocaleString()}</td>
                                <td className="text-sm text-gray-700">{r.unit}</td>
                                <td className="text-sm text-gray-900 text-right">{r.unitCost ? `TSH ${money(r.unitCost)}` : '—'}</td>
                                <td className="text-sm font-medium text-blue-700 text-right">TSH {money(r.totalValue || 0)}</td>
                                <td className="text-sm text-gray-700">{r.updatedAt ? String(r.updatedAt).slice(0, 19).replace('T', ' ') : '—'}</td>
                              </tr>
                            ))}
                          {stockValueFiltered.filter((r) => Number(r.qty || 0) > 0).length === 0 ? (
                            <tr>
                              <td className="px-5 py-10 text-sm text-gray-600 text-center" colSpan={8}>
                                No stock value data found
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="text-sm font-semibold text-gray-900">Assets Depreciation</div>
                  <div className="mt-1 text-xs italic text-gray-600">
                    Total assets: {assetsSummary.count} • Total value: TSH {money(assetsSummary.totalOriginal)} • Current value: TSH {money(assetsSummary.totalCurrent)} • Depreciated: TSH {money(assetsSummary.totalDepToDate)} • Dep/yr: TSH {money(assetsSummary.totalAnnualDep)}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <input
                      value={assetDraft.name}
                      onChange={(e) => setAssetDraft((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Asset name"
                      className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={assetDraft.value}
                        onChange={(e) => setAssetDraft((p) => ({ ...p, value: e.target.value.replace(/[^0-9.,]/g, '') }))}
                        placeholder="Value (TSH)"
                        className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500"
                        inputMode="decimal"
                      />
                      <input
                        value={assetDraft.years}
                        onChange={(e) => setAssetDraft((p) => ({ ...p, years: e.target.value.replace(/[^0-9.,]/g, '') }))}
                        placeholder="Useful life (years)"
                        className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500"
                        inputMode="decimal"
                      />
                    </div>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                      onClick={addAsset}
                    >
                      Add Asset
                    </button>
                  </div>

                  <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="max-h-56 overflow-auto">
                      {(Array.isArray(assets) ? assets : []).length ? (
                        <div className="divide-y divide-gray-100">
                          {(Array.isArray(assets) ? assets : []).map((a) => {
                            const d = calcAssetDep(a);
                            return (
                              <div key={a.id} className="px-3 py-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{String(a?.name || '').trim() || '—'}</div>
                                  <div className="text-xs italic text-gray-600">
                                    Value: TSH {money(d.value)} • Life: {Number.isFinite(d.years) ? d.years : '—'}y • Age: {Number(d.ageYears || 0).toFixed(1)}y • Current: TSH {money(d.current)} • Dep/yr: TSH {money(d.annual)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="px-2 py-1 rounded-lg border border-gray-200 text-xs hover:bg-gray-50"
                                  onClick={() => removeAsset(a.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-3 py-6 text-sm text-gray-600 text-center">No assets added yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="movement-report-print movement-report-print-screen">
          <div className="text-lg font-semibold text-gray-900">Stock Movement Log</div>
          <div className="text-sm text-gray-600 mt-1">{fromDate} to {toDate}</div>
          <div className="mt-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left">No</th>
                  <th className="text-left">Product</th>
                  <th className="text-left">Movement</th>
                  <th className="text-right">Qty In</th>
                  <th className="text-right">Qty Out</th>
                  <th className="text-right">Sell Price (TSH)</th>
                  <th className="text-right">Total Amount (TSH)</th>
                  <th className="text-right">Balance Qty</th>
                  <th className="text-left">Reference</th>
                  <th className="text-left">Date & Time</th>
                  <th className="text-left">Note</th>
                  <th className="text-left">Category</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithBalance.map((r, idx) => {
                  const qtyIn = r.type === 'IN' ? Number(r.quantity || 0) : 0;
                  const qtyOut = r.type === 'OUT' ? Number(r.quantity || 0) : 0;
                  const total = (qtyIn || qtyOut) ? (qtyIn || qtyOut) * Number(r.sellingPrice || 0) : 0;
                  const dt = r.dateTime || r.date || '';
                  return (
                    <tr key={`print_${String(r.id || idx)}`}>
                      <td className="text-left">{idx + 1}</td>
                      <td className="text-left">{r.name || '—'}</td>
                      <td className="text-left">{r.type === 'IN' ? 'Stock In' : 'Stock Out'}</td>
                      <td className="text-right">{qtyIn ? `+${qtyIn.toLocaleString()}` : '—'}</td>
                      <td className="text-right">{qtyOut ? `-${qtyOut.toLocaleString()}` : '—'}</td>
                      <td className="text-right">{r.sellingPrice ? money(r.sellingPrice) : '—'}</td>
                      <td className="text-right">{total ? money(total) : '—'}</td>
                      <td className="text-right">{Number(r.balanceQty || 0).toLocaleString()}</td>
                      <td className="text-left">{r.reference ? String(r.reference) : '—'}</td>
                      <td className="text-left">{dt ? String(dt).slice(0, 19).replace('T', ' ') : '—'}</td>
                      <td className="text-left">{r.note ? String(r.note) : '—'}</td>
                      <td className="text-left">{r.itemType ? String(r.itemType) : '—'}</td>
                    </tr>
                  );
                })}
                {rowsWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-left">No records found</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <ConfirmDeleteModal
          open={deleteOpen}
          title="Delete this stock record?"
          description="This will remove the selected stock movement record and cannot be undone."
          confirmText="Delete"
          loading={deleteLoading}
          noBackdrop
          onCancel={() => {
            if (deleteLoading) return;
            setDeleteOpen(false);
            setDeleteTarget(null);
          }}
          onConfirm={doDelete}
        />
      </div>
    );
  };

  const SystemLogs = () => {
    const [nonce, setNonce] = useState(0);
    const [levelFilter, setLevelFilter] = useState('all');
    const [range, setRange] = useState('today');
    const [q, setQ] = useState('');
    const [marking, setMarking] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const readArray = (key) => {
      try {
        const v = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    };
    const parseTime = (s) => {
      const t = Date.parse(String(s || ''));
      if (Number.isFinite(t)) return new Date(t);
      const n = Number(s);
      if (Number.isFinite(n) && n > 0) return new Date(n);
      return new Date();
    };

    useEffect(() => {
      const bump = () => setNonce((n) => n + 1);
      window.addEventListener('dataUpdated', bump);
      window.addEventListener('storage', bump);
      return () => {
        window.removeEventListener('dataUpdated', bump);
        window.removeEventListener('storage', bump);
      };
    }, []);
    const cutoff = useMemo(() => {
      void nonce;
      try {
        const raw = localStorage.getItem('systemLogsCutoff') || '';
        const t = Date.parse(raw);
        return Number.isFinite(t) ? new Date(t) : new Date(0);
      } catch {
        return new Date(0);
      }
    }, [nonce]);
    const logs = useMemo(() => {
      void nonce;
      const out = [];
      // Success-like events
      readArray('salesOrders').forEach((o) => {
        out.push({
          id: `so_${o?.id || Math.random()}`,
          level: 'success',
          title: 'New sale order created',
          details: String(o?.customerName || '').trim() ? `Customer: ${o.customerName}` : 'Sales Order',
          user: String(o?.staffName || o?.user || 'System'),
          module: 'POS Sales',
          ts: parseTime(o?.createdAt || o?.date || o?.timestamp || Date.now())
        });
      });
      readArray('sales').forEach((s) => {
        out.push({
          id: `sale_${s?.id || Math.random()}`,
          level: 'success',
          title: 'New sale order created',
          details: String(s?.customer || '').trim() ? `Customer: ${s.customer}` : 'Point of Sale',
          user: String(s?.staffName || s?.user || 'System'),
          module: 'POS Sales',
          ts: parseTime(s?.createdAt || s?.date || s?.timestamp || Date.now())
        });
      });
      readArray('purchases').forEach((p) => {
        out.push({
          id: `po_${p?.id || Math.random()}`,
          level: 'success',
          title: 'Purchase order created',
          details: String(p?.lpoNumber || '').trim() ? `PO #${p.lpoNumber}` : 'New PO',
          user: String(p?.staffName || p?.user || 'System'),
          module: 'Purchases',
          ts: parseTime(p?.date || p?.createdAt || Date.now())
        });
      });
      readArray('expenses').forEach((e) => {
        out.push({
          id: `exp_${e?.id || Math.random()}`,
          level: 'success',
          title: 'Expense recorded',
          details: String(e?.category || 'Expense'),
          user: String(e?.staffName || e?.user || 'System'),
          module: 'Expenses',
          ts: parseTime(e?.date || e?.createdAt || Date.now())
        });
      });
      // User events
      (readArray('users').concat(readArray('staff'))).forEach((u) => {
        out.push({
          id: `usr_${u?.id || Math.random()}`,
          level: 'success',
          title: 'New user account created',
          details: String(u?.name || u?.fullName || u?.email || ''),
          user: 'Admin',
          module: 'Users',
          ts: parseTime(u?.createdAt || Date.now())
        });
      });
      // Login/Logout from systemActivity
      readArray('systemActivity').forEach((a) => {
        const actorName = (() => {
          const fullName = String(a?.actor?.fullName || '').trim();
          const emp = String(a?.actor?.employeeId || '').trim();
          if (fullName && emp) return `${fullName} (${emp})`;
          if (fullName) return fullName;
          if (emp) return emp;
          return 'System';
        })();
        out.push({
          id: String(a?.id || `act_${Math.random()}`),
          level: String(a?.level || 'success'),
          title: String(a?.title || ''),
          details: String(a?.details || ''),
          user: actorName,
          module: String(a?.module || ''),
          ts: parseTime(a?.ts || Date.now())
        });
      });
      // Filter out old if cutoff set
      return out.filter((e) => e.ts >= cutoff).sort((a, b) => b.ts - a.ts);
    }, [cutoff, nonce]);
    const filtered = useMemo(() => {
      const byLevel = levelFilter === 'all' ? logs : logs.filter((l) => l.level === levelFilter);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const start = (() => {
        if (range === 'today') return new Date(startOfToday);
        if (range === '7d') return new Date(now.getTime() - 7 * 86400000);
        if (range === '30d') return new Date(now.getTime() - 30 * 86400000);
        return new Date(0);
      })();
      const ql = (q || '').trim().toLowerCase();
      return byLevel.filter((l) => l.ts >= start && (!ql || (l.title + ' ' + l.details + ' ' + l.user + ' ' + l.module).toLowerCase().includes(ql)));
    }, [logs, levelFilter, range, q]);
    const counts = useMemo(() => {
      return {
        errors: filtered.filter((l) => l.level === 'error').length,
        warnings: filtered.filter((l) => l.level === 'warning').length,
        success: filtered.filter((l) => l.level === 'success').length,
        total: filtered.length
      };
    }, [filtered]);
    const exportCSV = () => {
      const rows = [['Level', 'Event', 'User', 'Module', 'Timestamp', 'Details']];
      filtered.forEach((l) => rows.push([l.level, l.title, l.user, l.module, l.ts.toISOString(), l.details]));
      const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'system_logs.csv';
      a.click();
      URL.revokeObjectURL(url);
    };
    const markAllRead = () => {
      setMarking(true);
      setTimeout(() => {
        try {
          localStorage.setItem('systemLogsReadAt', new Date().toISOString());
        } catch {}
        setMarking(false);
      }, 600);
    };
    const refresh = () => {
      setRefreshing(true);
      setNonce((n) => n + 1);
      setTimeout(() => setRefreshing(false), 700);
    };
    
    const fmt = (d) => {
      try {
        return formatDisplayDate(d.toISOString().slice(0,10));
      } catch {
        return d.toLocaleString();
      }
    };
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div />
          <div className="flex items-center gap-2">
            <button type="button" className={marking ? 'px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold cursor-not-allowed' : 'px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50'} onClick={markAllRead} disabled={marking}>
              {marking ? 'Marking…' : '✓ Mark All Read'}
            </button>
            <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50" onClick={exportCSV}>Export</button>
            <button type="button" className={refreshing ? 'px-4 py-2 rounded-xl bg-green-600/80 text-white text-sm font-semibold flex items-center gap-2 cursor-not-allowed' : 'px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 flex items-center gap-2'} onClick={refresh} disabled={refreshing}>
              Refresh
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm">
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="success">Success</option>
          </select>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm">
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <button type="button" className="ml-auto px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm hover:bg-gray-50" onClick={exportCSV}>Export Logs</button>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs font-semibold text-red-700">ERRORS</div>
              <div className="mt-1 text-3xl font-extrabold text-red-700">{counts.errors}</div>
              <div className="text-xs text-red-700 mt-1">Require attention</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-700">WARNINGS</div>
              <div className="mt-1 text-3xl font-extrabold text-amber-700">{counts.warnings}</div>
              <div className="text-xs text-amber-700 mt-1">Monitor closely</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-700">SUCCESS EVENTS</div>
              <div className="mt-1 text-3xl font-extrabold text-emerald-700">{counts.success}</div>
              <div className="text-xs text-emerald-700 mt-1">Running normally</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-blue-700">TOTAL LOGS</div>
              <div className="mt-1 text-3xl font-extrabold text-blue-700">{counts.total}</div>
              <div className="text-xs text-blue-700 mt-1">Across modules</div>
            </div>
          </div>
          
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-gray-900">Activity Log</div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search logs..." className="w-64 pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
          </div>
          <div className="mt-3 overflow-auto">
            <table className="min-w-[980px] w-full">
              <thead className="text-[12px] text-gray-600">
                <tr className="grid grid-cols-[140px_minmax(0,1fr)_160px_140px_160px] px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <th className="text-left">Level</th>
                  <th className="text-left">Event</th>
                  <th className="text-left">User</th>
                  <th className="text-left">Module</th>
                  <th className="text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="grid grid-cols-[140px_minmax(0,1fr)_160px_140px_160px] px-3 py-3 items-center">
                    <td>
                      <span className={l.level === 'error' ? 'px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold' : l.level === 'warning' ? 'px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold' : 'px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold'}>
                        {l.level === 'error' ? 'Error' : l.level === 'warning' ? 'Warning' : 'Success'}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm font-semibold text-gray-900">{l.title}</div>
                      <div className="text-xs text-gray-600">{l.details}</div>
                    </td>
                    <td className="text-sm text-gray-800">{l.user || '—'}</td>
                    <td className="text-sm text-blue-700 font-semibold">{l.module || '—'}</td>
                    <td className="text-sm text-gray-700">{fmt(l.ts)}</td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-sm text-gray-600" colSpan={5}>No logs for selected filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  void SystemLogs;

  if (page === 'sales-order') {
    return <SalesOrder />;
  }
  if (page === 'notifications') {
    return <SystemLogsPage />;
  }
  if (page === 'products') {
    return <Products />;
  }
  if (page === 'store') {
    return <Store />;
  }
  if (page === 'stocks-valuation') {
    return <Store />;
  }
  if (page === 'sales-history') {
    return <SalesHistory />;
  }
  if (page === 'sales-customers') {
    return <SalesCustomers />;
  }
  if (page === 'sales-credit') {
    return <SalesCredit />;
  }
  if (page === 'sales-returns') {
    return <SalesReturns />;
  }
  if (page === 'returns-history') {
    return <ReturnsHistory />;
  }
  if (page === 'damage-stocks') {
    return <SalesReturns />;
  }
  if (page === 'damage-history') {
    return <ReturnsHistory />;
  }
  if (page === 'credit-history') {
    return <CreditHistory />;
  }
  if (page === 'chicken-processing') {
    return <ChickenProcessing />;
  }
  if (page === 'egg-production') {
    return <EggProduction />;
  }
  if (page === 'feed-consumption') {
    return <FeedConsumption />;
  }
  if (page === 'mortality') {
    return <Mortality />;
  }
  if (page === 'health-treatment') {
    return <HealthTreatment />;
  }
  if (page === 'vaccination-schedule') {
    return <VaccinationSchedule />;
  }
  if (page === 'production-performance') {
    return <ProductionPerformance />;
  }
  if (page === 'expenses-analytics') {
    return <ExpensesAnalytics />;
  }
  if (page === 'settings-preferences') {
    return <SystemPreferences />;
  }
  if (page === 'alerts-low-stock') {
    return <PaymentDueAlerts />;
  }
  if (page === 'alerts-payment-due') {
    return <PaymentDueAlerts />;
  }
  if (page === 'subscription') {
    return <PaymentDueAlerts />;
  }
  if (page === 'reports-kpis') {
    return <Navigate to="/placeholder/reports-sales" replace />;
  }
  if (page === 'reports-sales') {
    return <SalesReport />;
  }
  if (page === 'reports-expenses') {
    return <ExpensesReport />;
  }
  if (page === 'reports-inventory') {
    return <InventoryReport />;
  }
  if (page === 'reports-production') {
    return <PurchaseReport />;
  }
  if (page === 'system-logs') {
    return <Navigate to="/placeholder/notifications" replace />;
  }
  if (page === 'accounting') {
    return <AccountingHome />;
  }
  if (page === 'income-overview') {
    return <IncomeOverview />;
  }
  if (page === 'expense-overview') {
    return <ExpenseOverview />;
  }
  if (page === 'stock-value') {
    return <StockValueAccounting />;
  }
  if (page === 'period-closing') {
    return <PeriodClosing />;
  }
  if (page === 'audit-trail') {
    return <AuditTrail />;
  }
  if (page === 'support') {
    return <SupportPage />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-700">
        <div className="text-lg text-gray-900">Page not found</div>
        <div className="text-sm text-gray-600 mt-1">{String(page || '') ? `/${String(page || '')}` : 'Unknown page'}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
          <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50" onClick={() => navigate('/placeholder/products')}>
            Products
          </button>
          <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50" onClick={() => navigate('/placeholder/sales-order')}>
            Sales
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Placeholder() {
  const currentUser = (() => {
    try {
      return safeJsonParse(window.localStorage.getItem('currentUser'), null);
    } catch {
      return null;
    }
  })();
  if (!currentUser) return <Navigate to="/login" replace />;
  const storageProxy = {
    getItem(k) {
      const key = String(k || '');
      if (!key) return null;
      const v = localStore.get(key, null);
      if (v === null || v === undefined) return null;
      if (typeof v === 'string') return v;
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    },
    setItem(k, value) {
      const key = String(k || '');
      if (!key) return;
      const raw = value == null ? '' : String(value);
      try {
        localStore.set(key, JSON.parse(raw));
      } catch {
        localStore.set(key, raw);
      }
    },
    removeItem(k) {
      const key = String(k || '');
      if (!key) return;
      localStore.del(key);
    }
  };
  return <PlaceholderInner __localStore={storageProxy} />;
}
