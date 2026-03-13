import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { formatDisplayDate } from '../../utils/date';
import { downloadCsvFile, printWithTitle } from '../../utils/reportActions';

const toNum = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const money0 = (n) => {
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n || 0));
  } catch {
    return String(n || 0);
  }
};

const money1 = (n) => {
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(Number(n || 0));
  } catch {
    return String(n || 0);
  }
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

const MultiLineChart = ({ series }) => {
  const w = 740;
  const h = 240;
  const pad = 28;
  const all = series.flatMap((s) => s.points);
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = 0;
  const maxY = Math.max(...ys, 1);
  const sx = (x) => pad + ((x - minX) * (w - pad * 2)) / (maxX - minX || 1);
  const sy = (y) => h - pad - ((y - minY) * (h - pad * 2)) / (maxY - minY || 1);
  return (
    <svg className="w-full h-[240px]" viewBox={`0 0 ${w} ${h}`}>
      <g opacity="0.35">
        {new Array(5).fill(0).map((_, i) => {
          const y = pad + (i * (h - pad * 2)) / 4;
          return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
      </g>
      {series.map((s) => {
        const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x)} ${sy(p.y)}`).join(' ');
        return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth="3" />;
      })}
      {series.map((s) =>
        s.points.map((p) => <circle key={`${s.key}_${p.x}`} cx={sx(p.x)} cy={sy(p.y)} r="3.5" fill={s.color} />)
      )}
    </svg>
  );
};

const StatCard = ({ title, value, note, tone }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="text-[11px] font-medium text-gray-500 tracking-wide">{title}</div>
        <div className="mt-2 text-3xl font-semibold text-gray-900">{value}</div>
        <div className="mt-2 text-sm text-gray-600">{note}</div>
      </div>
      <div className="h-1" style={{ backgroundColor: tone }} />
    </div>
  );
};

export default function ProfitLossReport() {
  const [period, setPeriod] = useState('thisMonth');
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

  const salesAll = useMemo(() => {
    void refreshKey;
    try {
      const raw = JSON.parse(localStorage.getItem('sales') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }, [refreshKey]);

  const expensesAll = useMemo(() => {
    void refreshKey;
    try {
      const raw = JSON.parse(localStorage.getItem('expenses') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }, [refreshKey]);

  const lossesAll = useMemo(() => {
    void refreshKey;
    try {
      const raw = JSON.parse(localStorage.getItem('losses') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }, [refreshKey]);

  const range = useMemo(() => {
    const now = new Date();
    if (period === 'thisMonth') return { label: 'This Month', start: startOfMonth(now), end: endOfMonth(now) };
    if (period === 'lastMonth') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { label: 'Last Month', start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    if (period === 'thisYear') return { label: 'This Year', start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
    return { label: 'All Time', start: null, end: null };
  }, [period]);

  const sales = useMemo(() => {
    const start = range.start;
    const end = range.end;
    return salesAll.filter((s) => {
      const d = parseIsoDate(s.date);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [range.end, range.start, salesAll]);

  const expenses = useMemo(() => {
    const start = range.start;
    const end = range.end;
    return expensesAll.filter((e) => {
      const d = parseIsoDate(e.date);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [expensesAll, range.end, range.start]);

  const losses = useMemo(() => {
    const start = range.start;
    const end = range.end;
    return lossesAll.filter((l) => {
      const d = parseIsoDate(l.date);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [lossesAll, range.end, range.start]);

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

  const totals = useMemo(() => {
    const grossRevenue = sales.reduce((s, r) => s + toNum(r.amount ?? r.finalTotal), 0);
    const totalExpenses = expenses.reduce((s, r) => s + toNum(r.amount), 0);
    const totalLosses = losses.reduce((s, r) => s + toNum(r.estimatedValue ?? r.amount), 0);
    const netProfit = grossRevenue - totalExpenses - totalLosses;
    const margin = grossRevenue ? (netProfit * 100) / grossRevenue : 0;
    const tax = netProfit > 0 ? netProfit * 0.18 : 0;
    return { grossRevenue, totalExpenses, totalLosses, netProfit, margin, tax };
  }, [expenses, losses, sales]);

  const prevTotals = useMemo(() => {
    const start = prevRange.start;
    const end = prevRange.end;
    const prevSales = salesAll.filter((s) => {
      const d = parseIsoDate(s.date);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
    const prevExpenses = expensesAll.filter((e) => {
      const d = parseIsoDate(e.date);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
    const prevLosses = lossesAll.filter((l) => {
      const d = parseIsoDate(l.date);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
    const grossRevenue = prevSales.reduce((s, r) => s + toNum(r.amount ?? r.finalTotal), 0);
    const totalExpenses = prevExpenses.reduce((s, r) => s + toNum(r.amount), 0);
    const totalLosses = prevLosses.reduce((s, r) => s + toNum(r.estimatedValue ?? r.amount), 0);
    const netProfit = grossRevenue - totalExpenses - totalLosses;
    const margin = grossRevenue ? (netProfit * 100) / grossRevenue : 0;
    return { grossRevenue, totalExpenses, netProfit, margin };
  }, [expensesAll, lossesAll, salesAll, prevRange.end, prevRange.start]);

  const deltas = useMemo(() => {
    return {
      revenue: pct(totals.grossRevenue, prevTotals.grossRevenue),
      expenses: pct(totals.totalExpenses, prevTotals.totalExpenses),
      netProfit: pct(totals.netProfit, prevTotals.netProfit),
      marginPts: totals.margin - prevTotals.margin
    };
  }, [prevTotals, totals]);

  const expensesByCategory = useMemo(() => {
    const map = new Map();
    expenses.forEach((e) => {
      const k = String(e.category || 'Other').trim() || 'Other';
      map.set(k, (map.get(k) || 0) + toNum(e.amount));
    });
    losses.forEach((l) => {
      const k = 'Other Operating Costs';
      map.set(k, (map.get(k) || 0) + toNum(l.estimatedValue ?? l.amount));
    });
    const rows = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    rows.sort((a, b) => b.value - a.value);
    return rows;
  }, [expenses, losses]);

  const trend = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), idx: 11 - i });
    }
    const rev = new Map(months.map((m) => [m.key, 0]));
    const exp = new Map(months.map((m) => [m.key, 0]));
    const los = new Map(months.map((m) => [m.key, 0]));
    salesAll.forEach((s) => {
      const d = parseIsoDate(s.date);
      if (!d) return;
      const k = monthKey(d);
      if (!rev.has(k)) return;
      rev.set(k, (rev.get(k) || 0) + toNum(s.amount ?? s.finalTotal));
    });
    expensesAll.forEach((e) => {
      const d = parseIsoDate(e.date);
      if (!d) return;
      const k = monthKey(d);
      if (!exp.has(k)) return;
      exp.set(k, (exp.get(k) || 0) + toNum(e.amount));
    });
    lossesAll.forEach((l) => {
      const d = parseIsoDate(l.date);
      if (!d) return;
      const k = monthKey(d);
      if (!los.has(k)) return;
      los.set(k, (los.get(k) || 0) + toNum(l.estimatedValue ?? l.amount));
    });
    const revenuePts = months.map((m) => ({ x: m.idx, y: rev.get(m.key) || 0 }));
    const expensePts = months.map((m) => ({ x: m.idx, y: (exp.get(m.key) || 0) + (los.get(m.key) || 0) }));
    const profitPts = months.map((m) => ({ x: m.idx, y: (rev.get(m.key) || 0) - (exp.get(m.key) || 0) - (los.get(m.key) || 0) }));
    return { revenuePts, expensePts, profitPts };
  }, [expensesAll, lossesAll, salesAll]);

  const exportCSV = () => {
    const rows = [
      ['Section', 'Label', 'Amount'],
      ['Income', 'Gross Revenue', String(totals.grossRevenue)],
      ['Expenses', 'Total Expenses', String(totals.totalExpenses)],
      ['Expenses', 'Total Losses', String(totals.totalLosses)],
      ['Summary', 'Net Profit', String(totals.netProfit)],
      ['Summary', 'Profit Margin (%)', String(totals.margin.toFixed(2))],
      ['Summary', 'Tax Estimate (18%)', String(totals.tax)]
    ];
    expensesByCategory.forEach((r) => rows.push(['Expenses', r.label, String(r.value)]));
    downloadCsvFile(`profit_loss_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportPDF = () => printWithTitle(`Profit & Loss Report - ${range.label}`);

  const monthLabel = useMemo(() => {
    if (!range.start) return 'All Time';
    return range.start.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }, [range.start]);

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
          Reports <span className="mx-1">›</span> <span className="text-gray-900 font-medium">Profit &amp; Loss Report</span>
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
            <div className="text-[12px] text-sky-700 font-medium tracking-wide">Financial summary</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">Profit &amp; Loss Report</div>
            <div className="mt-2 text-sm text-gray-600">Income vs expenses financial statement — {range.label}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">{monthLabel}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard title="GROSS REVENUE" value={`TSH ${money0(totals.grossRevenue)}`} note={`${deltas.revenue >= 0 ? '▲' : '▼'} ${money1(Math.abs(deltas.revenue))}% vs last month`} tone="#16a34a" />
          <StatCard title="TOTAL EXPENSES" value={`TSH ${money0(totals.totalExpenses + totals.totalLosses)}`} note={`${deltas.expenses >= 0 ? '▲' : '▼'} ${money1(Math.abs(deltas.expenses))}% vs last month`} tone="#ef4444" />
          <StatCard title="NET PROFIT" value={`TSH ${money0(totals.netProfit)}`} note={`${deltas.netProfit >= 0 ? '▲' : '▼'} ${money1(Math.abs(deltas.netProfit))}% vs last month`} tone="#2563eb" />
          <StatCard title="PROFIT MARGIN" value={`${money1(totals.margin)}%`} note={`${deltas.marginPts >= 0 ? '▲' : '▼'} ${money1(Math.abs(deltas.marginPts))} pts`} tone="#7c3aed" />
          <StatCard title="TAX ESTIMATE (18%)" value={`TSH ${money0(totals.tax)}`} note="VAT inclusive" tone="#f59e0b" />
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Revenue vs Expenses vs Profit — 12 Months</div>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">Trend</span>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 flex-wrap text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-600" />
                  Revenue
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-rose-600" />
                  Expenses
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-indigo-600" />
                  Profit
                </div>
              </div>
              <div className="mt-4">
                <MultiLineChart
                  series={[
                    { key: 'rev', color: '#16a34a', points: trend.revenuePts },
                    { key: 'exp', color: '#ef4444', points: trend.expensePts },
                    { key: 'pro', color: '#4f46e5', points: trend.profitPts }
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">P&amp;L Statement</div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">{monthLabel}</span>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-5 py-3 text-[12px] text-gray-600 font-medium tracking-wide">INCOME</div>
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="text-sm text-gray-800">Product Sales</div>
                <div className="text-sm font-medium text-emerald-700">TSH {money0(totals.grossRevenue)}</div>
              </div>
              <div className="px-5 py-3 flex items-center justify-between gap-3 bg-emerald-50/40">
                <div className="text-sm text-gray-800">Net Revenue</div>
                <div className="text-sm font-medium text-emerald-700">TSH {money0(totals.grossRevenue)}</div>
              </div>
              <div className="px-5 py-3 text-[12px] text-gray-600 font-medium tracking-wide">EXPENSES</div>
              {expensesByCategory.slice(0, 6).map((r) => (
                <div key={r.label} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-800 truncate">{r.label}</div>
                  <div className="text-sm font-medium text-rose-700">-TSH {money0(r.value)}</div>
                </div>
              ))}
              <div className="px-5 py-3 flex items-center justify-between gap-3 bg-rose-50/40">
                <div className="text-sm text-gray-800">Total Expenses</div>
                <div className="text-sm font-medium text-rose-700">-TSH {money0(totals.totalExpenses + totals.totalLosses)}</div>
              </div>
              <div className="px-5 py-4 flex items-center justify-between gap-3 bg-emerald-50/60">
                <div className="text-sm text-gray-900 font-medium">NET PROFIT</div>
                <div className="text-xl font-semibold text-emerald-700">TSH {money0(totals.netProfit)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-gray-900">Recent Activity</div>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{range.label}</span>
          </div>
          <div className="overflow-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-600">
                <tr className="grid grid-cols-[140px_minmax(0,1fr)_140px_180px_140px] px-5 py-3">
                  <th className="text-left tracking-wide">DATE</th>
                  <th className="text-left tracking-wide">TYPE</th>
                  <th className="text-left tracking-wide">REF</th>
                  <th className="text-left tracking-wide">CATEGORY</th>
                  <th className="text-left tracking-wide">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  const rows = [];
                  sales.slice(-10).forEach((s, i) => {
                    rows.push({
                      key: `s_${s.id}_${i}`,
                      date: s.date,
                      type: 'Sale',
                      ref: String(s.invoiceNumber || s.id || ''),
                      category: String(s.productType || s.category || s.productName || 'Sales'),
                      amount: toNum(s.amount ?? s.finalTotal)
                    });
                  });
                  expenses.slice(-10).forEach((e, i) => {
                    rows.push({
                      key: `e_${e.id}_${i}`,
                      date: e.date,
                      type: 'Expense',
                      ref: String(e.expenseNumber || e.id || ''),
                      category: String(e.category || 'Expense'),
                      amount: -toNum(e.amount)
                    });
                  });
                  losses.slice(-10).forEach((l, i) => {
                    rows.push({
                      key: `l_${l.id}_${i}`,
                      date: l.date,
                      type: 'Loss',
                      ref: String(l.id || ''),
                      category: String(l.reason || l.type || 'Loss'),
                      amount: -toNum(l.estimatedValue ?? l.amount)
                    });
                  });
                  rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
                  return rows.slice(0, 10);
                })().map((r) => (
                  <tr key={r.key} className="grid grid-cols-[140px_minmax(0,1fr)_140px_180px_140px] px-5 py-3 items-center">
                    <td className="text-sm text-gray-700">{r.date ? formatDisplayDate(r.date) : '—'}</td>
                    <td className="text-sm font-medium text-gray-900 truncate">{r.type}</td>
                    <td className="text-sm text-gray-800 truncate">{r.ref || '—'}</td>
                    <td className="text-sm text-gray-700 truncate">{r.category || '—'}</td>
                    <td className={r.amount >= 0 ? 'text-sm font-medium text-emerald-700' : 'text-sm font-medium text-rose-700'}>
                      {r.amount >= 0 ? `TSH ${money0(r.amount)}` : `-TSH ${money0(Math.abs(r.amount))}`}
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && expenses.length === 0 && losses.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-sm text-gray-600" colSpan={5}>
                      No transactions found for this period.
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
