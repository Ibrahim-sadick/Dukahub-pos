import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { formatDisplayDate } from '../../utils/date';
import { downloadCsvFile, printWithTitle } from '../../utils/reportActions';

const toNum = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const money = (n) => {
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n || 0));
  } catch {
    return String(n || 0);
  }
};

const normalizePayment = (m) => {
  const s = String(m || '').toLowerCase();
  if (!s) return 'Other';
  if (s === 'cash') return 'Cash';
  if (s === 'mobile_money' || s === 'mobile' || s === 'mpesa' || s === 'm-pesa') return 'M-Pesa';
  if (s === 'bank_transfer' || s === 'bank') return 'Bank Transfer';
  if (s === 'credit_card' || s === 'card') return 'Card';
  if (s === 'cheque') return 'Cheque';
  if (s === 'credit') return 'Credit';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const normalizeCategory = (s) => {
  const v = String(s || '').trim();
  if (!v) return 'General';
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const parseIsoDate = (d) => {
  const t = Date.parse(String(d || ''));
  return Number.isFinite(t) ? new Date(t) : null;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const pct = (cur, prev) => {
  const p = Number(prev || 0);
  const c = Number(cur || 0);
  if (!p) return c ? 100 : 0;
  return ((c - p) * 100) / p;
};

const Donut = ({ data, total }) => {
  const size = 180;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      {data.map((d) => {
        const val = Number(d.value || 0);
        const frac = total ? val / total : 0;
        const dash = frac * c;
        const seg = (
          <circle
            key={d.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += dash;
        return seg;
      })}
      <circle cx={size / 2} cy={size / 2} r={r - stroke / 2} fill="white" />
    </svg>
  );
};

const LineChart = ({ points }) => {
  const w = 640;
  const h = 220;
  const pad = 24;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = 0;
  const maxY = Math.max(...ys, 1);
  const sx = (x) => pad + ((x - minX) * (w - pad * 2)) / (maxX - minX || 1);
  const sy = (y) => h - pad - ((y - minY) * (h - pad * 2)) / (maxY - minY || 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x)} ${sy(p.y)}`).join(' ');
  const area = `${d} L ${sx(points[points.length - 1]?.x ?? 0)} ${sy(0)} L ${sx(points[0]?.x ?? 0)} ${sy(0)} Z`;
  return (
    <svg className="w-full h-[220px]" viewBox={`0 0 ${w} ${h}`}>
      <path d={area} fill="rgba(34,197,94,0.08)" />
      <path d={d} fill="none" stroke="#16a34a" strokeWidth="3" />
      {points.map((p) => (
        <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r="4" fill="#16a34a" />
      ))}
    </svg>
  );
};

export default function SalesReport() {
  const [period, setPeriod] = useState('thisMonth');
  const [category, setCategory] = useState('all');
  const [staff, setStaff] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onEvent = () => setRefreshKey((v) => v + 1);
    window.addEventListener('dataUpdated', onEvent);
    window.addEventListener('storage', onEvent);
    return () => {
      window.removeEventListener('dataUpdated', onEvent);
      window.removeEventListener('storage', onEvent);
    };
  }, []);

  const allSales = useMemo(() => {
    void refreshKey;
    try {
      const raw = JSON.parse(localStorage.getItem('sales') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }, [refreshKey]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    allSales.forEach((s) => set.add(normalizeCategory(s.category || s.productType || s.productName)));
    return ['all', ...Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b))];
  }, [allSales]);

  const staffOptions = useMemo(() => {
    const set = new Set();
    allSales.forEach((s) => {
      const v = String(s.cashier || s.staffName || s.user || s.createdBy || '').trim();
      if (v) set.add(v);
    });
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [allSales]);

  const range = useMemo(() => {
    const now = new Date();
    if (period === 'thisMonth') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return { label: 'This Month', start, end };
    }
    if (period === 'lastMonth') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start = startOfMonth(prev);
      const end = endOfMonth(prev);
      return { label: 'Last Month', start, end };
    }
    if (period === 'thisYear') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { label: 'This Year', start, end };
    }
    return { label: 'All Time', start: null, end: null };
  }, [period]);

  const filtered = useMemo(() => {
    const cat = String(category || 'all').toLowerCase();
    const st = String(staff || 'all').toLowerCase();
    const inRange = (s) => {
      const d = parseIsoDate(s.date);
      if (!d) return false;
      if (range.start && d < range.start) return false;
      if (range.end && d > range.end) return false;
      return true;
    };
    return allSales
      .filter((s) => inRange(s))
      .filter((s) => {
        if (cat === 'all') return true;
        return normalizeCategory(s.category || s.productType || s.productName).toLowerCase() === cat;
      })
      .filter((s) => {
        if (st === 'all') return true;
        const v = String(s.cashier || s.staffName || s.user || s.createdBy || '').trim().toLowerCase();
        return v === st;
      });
  }, [allSales, category, range.end, range.start, staff]);

  const prevRange = useMemo(() => {
    const now = new Date();
    if (period === 'thisMonth') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    if (period === 'lastMonth') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    return { start: null, end: null };
  }, [period]);

  const filteredPrev = useMemo(() => {
    if (!prevRange.start || !prevRange.end) return [];
    return allSales.filter((s) => {
      const d = parseIsoDate(s.date);
      if (!d) return false;
      return d >= prevRange.start && d <= prevRange.end;
    });
  }, [allSales, prevRange.end, prevRange.start]);

  const totals = useMemo(() => {
    const sum = filtered.reduce((a, s) => a + toNum(s.amount ?? s.finalTotal), 0);
    const tx = filtered.length;
    const items = filtered.reduce((a, s) => a + toNum(s.quantity || s.quantitySold || 1), 0);
    const returns = 0;
    return { sum, tx, items, returns, avg: tx ? sum / tx : 0 };
  }, [filtered]);

  const totalsPrev = useMemo(() => {
    const sum = filteredPrev.reduce((a, s) => a + toNum(s.amount ?? s.finalTotal), 0);
    const tx = filteredPrev.length;
    const items = filteredPrev.reduce((a, s) => a + toNum(s.quantity || s.quantitySold || 1), 0);
    const returns = 0;
    return { sum, tx, items, returns, avg: tx ? sum / tx : 0 };
  }, [filteredPrev]);

  const dailyTrend = useMemo(() => {
    if (!range.start || !range.end) {
      const byMonth = new Map();
      filtered.forEach((s) => {
        const d = parseIsoDate(s.date);
        if (!d) return;
        const k = monthKey(d);
        byMonth.set(k, (byMonth.get(k) || 0) + toNum(s.amount ?? s.finalTotal));
      });
      const keys = Array.from(byMonth.keys()).sort((a, b) => a.localeCompare(b)).slice(-12);
      return keys.map((k, i) => ({ x: i, y: byMonth.get(k) || 0, label: k }));
    }
    const days = Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1;
    const byDay = new Array(days).fill(0);
    filtered.forEach((s) => {
      const d = parseIsoDate(s.date);
      if (!d) return;
      const idx = Math.floor((d.getTime() - range.start.getTime()) / 86400000);
      if (idx >= 0 && idx < days) byDay[idx] += toNum(s.amount ?? s.finalTotal);
    });
    return byDay.map((v, i) => ({ x: i, y: v, label: String(i + 1) }));
  }, [filtered, range.end, range.start]);

  const categories = useMemo(() => {
    const map = new Map();
    filtered.forEach((s) => {
      const k = normalizeCategory(s.category || s.productType || s.productName);
      map.set(k, (map.get(k) || 0) + toNum(s.amount ?? s.finalTotal));
    });
    const arr = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    arr.sort((a, b) => b.value - a.value);
    const palette = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#0ea5e9', '#ef4444'];
    return arr.slice(0, 6).map((d, i) => ({ ...d, color: palette[i % palette.length] }));
  }, [filtered]);

  const paymentMethods = useMemo(() => {
    const map = new Map();
    filtered.forEach((s) => {
      const k = normalizePayment(s.paymentMethod);
      map.set(k, (map.get(k) || 0) + toNum(s.amount ?? s.finalTotal));
    });
    const arr = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    arr.sort((a, b) => b.value - a.value);
    const palette = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#0ea5e9'];
    return arr.slice(0, 5).map((d, i) => ({ ...d, color: palette[i % palette.length] }));
  }, [filtered]);

  const topProducts = useMemo(() => {
    const map = new Map();
    filtered.forEach((s) => {
      const k = String(s.productName || s.subcategory || s.description || s.productType || 'Product').trim();
      map.set(k, (map.get(k) || 0) + toNum(s.amount ?? s.finalTotal));
    });
    const arr = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    arr.sort((a, b) => b.value - a.value);
    return arr.slice(0, 5);
  }, [filtered]);

  const recent = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || toNum(b.id) - toNum(a.id));
    return arr.slice(0, 8);
  }, [filtered]);

  const exportCSV = () => {
    const rows = [['Invoice', 'Customer', 'Items', 'Amount', 'Payment', 'Cashier', 'Date', 'Status']];
    recent.forEach((s, i) => {
      const invoice = String(s.invoiceNumber || s.id || `INV-${String(i + 1).padStart(4, '0')}`);
      const customer = String(s.customerName || '—');
      const items = String(toNum(s.quantity || s.quantitySold || 1));
      const amount = String(toNum(s.amount ?? s.finalTotal));
      const payment = normalizePayment(s.paymentMethod);
      const cashier = String(s.cashier || s.staffName || s.user || s.createdBy || '—');
      const date = String(s.date || '');
      const status = String(s.paymentMethod || '').toLowerCase() === 'credit' ? 'Pending' : 'Paid';
      rows.push([invoice, customer, items, amount, payment, cashier, date, status]);
    });
    downloadCsvFile(`sales_report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportPDF = () => {
    printWithTitle(`Sales Report - ${range.label}`);
  };

  const totalCat = categories.reduce((s, c) => s + Number(c.value || 0), 0);
  const card = (title, value, delta, tone) => (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="text-[11px] font-medium text-gray-500 tracking-wide">{title}</div>
        <div className="mt-2 text-3xl font-semibold text-gray-900">TSH {money(value)}</div>
        <div className={delta >= 0 ? 'mt-2 text-sm font-medium text-emerald-700' : 'mt-2 text-sm font-medium text-rose-700'}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </div>
      </div>
      <div className="h-1" style={{ backgroundColor: tone }} />
    </div>
  );

  const deltaSales = pct(totals.sum, totalsPrev.sum);
  const deltaTx = pct(totals.tx, totalsPrev.tx);
  const deltaAvg = pct(totals.avg, totalsPrev.avg);
  const deltaItems = pct(totals.items, totalsPrev.items);

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .report-print-scope, .report-print-scope * { visibility: visible !important; }
          .report-print-scope { position: absolute !important; inset: 0 !important; padding: 16px !important; background: white !important; }
          .report-no-print { display: none !important; }
        }
      `}</style>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-gray-600">
          Reports <span className="mx-1">›</span> <span className="text-gray-900 font-medium">Sales Report</span>
        </div>
        <div className="flex items-center gap-2 report-no-print">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm">
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisYear">This Year</option>
            <option value="all">All Time</option>
          </select>
          <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2" onClick={exportPDF}>
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button type="button" className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 inline-flex items-center gap-2" onClick={exportPDF}>
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div className="report-print-scope bg-slate-50/70 border border-slate-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[12px] text-emerald-700 font-medium tracking-wide">Revenue analysis</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">Sales Report</div>
            <div className="mt-2 text-sm text-gray-600">Complete overview of sales performance — {range.label}</div>
          </div>
          <div className="flex items-center gap-3 report-no-print">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm">
              {categoryOptions.map((c) => (
                <option key={c} value={c === 'all' ? 'all' : c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
            <select value={staff} onChange={(e) => setStaff(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm">
              {staffOptions.map((s) => (
                <option key={s} value={s === 'all' ? 'all' : s}>
                  {s === 'all' ? 'All Staff' : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {card('TOTAL SALES', totals.sum, deltaSales, '#16a34a')}
          {card('TRANSACTIONS', totals.tx, deltaTx, '#2563eb')}
          {card('AVG SALE VALUE', totals.avg, deltaAvg, '#7c3aed')}
          {card('ITEMS SOLD', totals.items, deltaItems, '#d97706')}
          {card('RETURNS', totals.returns, 0, '#ef4444')}
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Daily Sales Trend</div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">{range.label}</span>
            </div>
            <div className="p-5">
              <LineChart points={dailyTrend.length ? dailyTrend.map((p) => ({ x: p.x, y: p.y })) : [{ x: 0, y: 0 }]} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Sales by Category</div>
              <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium">Breakdown</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-4 items-center">
              <div className="flex items-center justify-center">
                <Donut data={categories} total={totalCat} />
              </div>
              <div className="space-y-3">
                {categories.slice(0, 4).map((c) => (
                  <div key={c.label} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-gray-800 truncate">{c.label}</span>
                    </div>
                    <div className="text-gray-900 font-medium">TSH {money(c.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Sales by Payment Method</div>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">Channel Split</span>
            </div>
            <div className="p-5 space-y-3">
              {paymentMethods.length ? (
                paymentMethods.map((p) => {
                  const v = Number(p.value || 0);
                  const pctVal = totals.sum ? (v * 100) / totals.sum : 0;
                  return (
                    <div key={p.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-800 font-medium">{p.label}</div>
                        <div className="text-gray-700">{pctVal.toFixed(0)}%</div>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${Math.max(2, Math.min(100, pctVal))}%`, backgroundColor: p.color }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-600">No payment data.</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Top 5 Products</div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">By Revenue</span>
            </div>
            <div className="p-5 space-y-4">
              {topProducts.length ? (
                topProducts.map((p, idx) => {
                  const max = topProducts[0]?.value || 1;
                  const ratio = (Number(p.value || 0) * 100) / max;
                  const colors = ['#16a34a', '#16a34a', '#2563eb', '#d97706', '#d97706'];
                  return (
                    <div key={p.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-900 truncate">{p.label}</div>
                        <div className="text-base font-semibold text-emerald-700">TSH {money(p.value)}</div>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${Math.max(2, Math.min(100, ratio))}%`, backgroundColor: colors[idx] || '#16a34a' }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-600">No product data.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-gray-900">Recent Sales Transactions</div>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Last 8 records</span>
          </div>
          <div className="overflow-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-600">
                <tr className="grid grid-cols-[160px_minmax(0,1fr)_90px_140px_140px_140px_140px_120px] px-5 py-3">
                  <th className="text-left tracking-wide">Invoice</th>
                  <th className="text-left tracking-wide">Customer</th>
                  <th className="text-left tracking-wide">Items</th>
                  <th className="text-left tracking-wide">Amount</th>
                  <th className="text-left tracking-wide">Payment</th>
                  <th className="text-left tracking-wide">Cashier</th>
                  <th className="text-left tracking-wide">Date</th>
                  <th className="text-left tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((s, i) => {
                  const invoice = String(s.invoiceNumber || s.id || `INV-${String(i + 1).padStart(4, '0')}`);
                  const items = toNum(s.quantity || s.quantitySold || 1);
                  const amt = toNum(s.amount ?? s.finalTotal);
                  const pay = normalizePayment(s.paymentMethod);
                  const cashier = String(s.cashier || s.staffName || s.user || s.createdBy || '—');
                  const dateLabel = s.date ? formatDisplayDate(s.date) : '—';
                  const status = String(s.paymentMethod || '').toLowerCase() === 'credit' ? 'Pending' : 'Paid';
                  return (
                    <tr key={`${invoice}_${i}`} className="grid grid-cols-[160px_minmax(0,1fr)_90px_140px_140px_140px_140px_120px] px-5 py-3 items-center">
                      <td className="text-sm text-gray-700">#{invoice}</td>
                      <td className="text-sm font-medium text-gray-900 truncate">{String(s.customerName || '—')}</td>
                      <td className="text-sm text-gray-800">{items}</td>
                      <td className="text-sm font-semibold text-emerald-700">TSH {money(amt)}</td>
                      <td className="text-sm text-gray-800">{pay}</td>
                      <td className="text-sm text-gray-800 truncate">{cashier}</td>
                      <td className="text-sm text-gray-700">{dateLabel}</td>
                      <td className="text-sm">
                        <span className={status === 'Paid' ? 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium' : 'px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium'}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recent.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-sm text-gray-600" colSpan={8}>
                      No sales found for this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
