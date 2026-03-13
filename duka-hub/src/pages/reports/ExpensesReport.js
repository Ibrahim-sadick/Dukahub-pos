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

const normalizeCategory = (s) => {
  const v = String(s || '').trim();
  if (!v) return 'Other';
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
      <path d={area} fill="rgba(239,68,68,0.07)" />
      <path d={d} fill="none" stroke="#ef4444" strokeWidth="3" />
      {points.map((p) => (
        <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r="4" fill="#ef4444" />
      ))}
    </svg>
  );
};

export default function ExpensesReport() {
  const [period, setPeriod] = useState('thisMonth');
  const [category, setCategory] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || 'null') || JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const onEvent = () => setRefreshKey((v) => v + 1);
    window.addEventListener('dataUpdated', onEvent);
    window.addEventListener('storage', onEvent);
    return () => {
      window.removeEventListener('dataUpdated', onEvent);
      window.removeEventListener('storage', onEvent);
    };
  }, []);

  const allExpenses = useMemo(() => {
    void refreshKey;
    try {
      const raw = JSON.parse(localStorage.getItem('expenses') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }, [refreshKey]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    allExpenses.forEach((e) => set.add(normalizeCategory(e.category)));
    return ['all', ...Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b))];
  }, [allExpenses]);

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
    const inRange = (e) => {
      const d = parseIsoDate(e.date);
      if (!d) return false;
      if (range.start && d < range.start) return false;
      if (range.end && d > range.end) return false;
      return true;
    };
    return allExpenses
      .filter((e) => inRange(e))
      .filter((e) => {
        if (cat === 'all') return true;
        return normalizeCategory(e.category).toLowerCase() === cat;
      });
  }, [allExpenses, category, range.end, range.start]);

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
    return allExpenses.filter((e) => {
      const d = parseIsoDate(e.date);
      if (!d) return false;
      return d >= prevRange.start && d <= prevRange.end;
    });
  }, [allExpenses, prevRange.end, prevRange.start]);

  const sums = useMemo(() => {
    const total = filtered.reduce((s, e) => s + toNum(e.amount), 0);
    const byCategory = new Map();
    filtered.forEach((e) => {
      const k = normalizeCategory(e.category);
      byCategory.set(k, (byCategory.get(k) || 0) + toNum(e.amount));
    });
    const get = (k) => byCategory.get(k) || 0;
    const salaries = get('Staff');
    const rentUtilities = get('Utilities');
    const cogs = get('Chicken Feeds');
    const other = Math.max(0, total - salaries - rentUtilities - cogs);
    return { total, salaries, rentUtilities, cogs, other, byCategory };
  }, [filtered]);

  const prevTotal = useMemo(() => filteredPrev.reduce((s, e) => s + toNum(e.amount), 0), [filteredPrev]);
  const deltaTotal = pct(sums.total, prevTotal);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(monthKey(d));
    }
    const map = new Map(months.map((m) => [m, 0]));
    allExpenses.forEach((e) => {
      const d = parseIsoDate(e.date);
      if (!d) return;
      const k = monthKey(d);
      if (!map.has(k)) return;
      map.set(k, (map.get(k) || 0) + toNum(e.amount));
    });
    return months.map((m, idx) => ({ x: idx, y: map.get(m) || 0, label: m }));
  }, [allExpenses]);

  const breakdown = useMemo(() => {
    const arr = Array.from(sums.byCategory.entries()).map(([label, value]) => ({ label, value }));
    arr.sort((a, b) => b.value - a.value);
    const palette = ['#ef4444', '#d97706', '#2563eb', '#7c3aed', '#6b7280'];
    return arr.slice(0, 5).map((d, i) => ({ ...d, color: palette[i % palette.length] }));
  }, [sums.byCategory]);

  const totalBreakdown = breakdown.reduce((s, b) => s + Number(b.value || 0), 0);

  const records = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || toNum(b.id) - toNum(a.id));
    return arr.slice(0, 12);
  }, [filtered]);

  const exportCSV = () => {
    const rows = [['Ref', 'Description', 'Category', 'Amount', 'Paid To', 'Date', 'Approved By']];
    filtered.forEach((e) => {
      const ref = String(e.expenseNumber || e.id || '');
      const desc = String(e.items?.[0]?.description || e.notes || e.location || '—');
      const cat = normalizeCategory(e.category);
      const amount = String(toNum(e.amount));
      const paidTo = String(e.supplier || e.location || '—');
      const date = String(e.date || '');
      const approvedBy = String(currentUser?.fullName || 'Admin');
      rows.push([ref, desc, cat, amount, paidTo, date, approvedBy]);
    });
    downloadCsvFile(`expenses_report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportPDF = () => printWithTitle(`Expenses Report - ${range.label}`);

  const card = (title, value, note, tone) => (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="text-[11px] font-medium text-gray-500 tracking-wide">{title}</div>
        <div className="mt-2 text-3xl font-semibold text-gray-900">TSH {money0(value)}</div>
        <div className="mt-2 text-sm text-gray-600">{note}</div>
      </div>
      <div className="h-1" style={{ backgroundColor: tone }} />
    </div>
  );

  const percentOfTotal = (value) => {
    const t = sums.total || 0;
    if (!t) return 0;
    return (Number(value || 0) * 100) / t;
  };

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
          Reports <span className="mx-1">›</span> <span className="text-gray-900 font-medium">Expenses Report</span>
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
            <div className="text-[12px] text-rose-700 font-medium tracking-wide">Cost analysis</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">Expenses Report</div>
            <div className="mt-2 text-sm text-gray-600">Full breakdown of operational costs — {range.label}</div>
          </div>
          <div className="flex items-center gap-3 report-no-print">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm">
              {categoryOptions.map((c) => (
                <option key={c} value={c === 'all' ? 'all' : c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {card('TOTAL EXPENSES', sums.total, `${deltaTotal >= 0 ? '▲' : '▼'} ${Math.abs(deltaTotal).toFixed(1)}% vs last month`, '#ef4444')}
          {card('COGS', sums.cogs, `${percentOfTotal(sums.cogs).toFixed(0)}% of expenses`, '#d97706')}
          {card('SALARIES', sums.salaries, `${percentOfTotal(sums.salaries).toFixed(0)}% of expenses`, '#2563eb')}
          {card('RENT & UTILITIES', sums.rentUtilities, `${percentOfTotal(sums.rentUtilities).toFixed(0)}% of expenses`, '#7c3aed')}
          {card('OTHER COSTS', sums.other, `${percentOfTotal(sums.other).toFixed(0)}% of expenses`, '#6b7280')}
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Monthly Expense Trend</div>
              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-medium">12 Months</span>
            </div>
            <div className="p-5">
              <LineChart points={monthlyTrend.length ? monthlyTrend.map((p) => ({ x: p.x, y: p.y })) : [{ x: 0, y: 0 }]} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Expense Breakdown</div>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">By Category</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-4 items-center">
              <div className="flex items-center justify-center">
                <Donut data={breakdown} total={totalBreakdown} />
              </div>
              <div className="space-y-3">
                {breakdown.map((b) => (
                  <div key={b.label} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="text-gray-800 truncate">{b.label}</span>
                    </div>
                    <div className="text-gray-900 font-medium">TSH {money0(b.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-gray-900">Expense Records</div>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{range.label}</span>
          </div>
          <div className="overflow-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-600">
                <tr className="grid grid-cols-[140px_minmax(0,1fr)_160px_140px_160px_140px_140px] px-5 py-3">
                  <th className="text-left tracking-wide">REF #</th>
                  <th className="text-left tracking-wide">DESCRIPTION</th>
                  <th className="text-left tracking-wide">CATEGORY</th>
                  <th className="text-left tracking-wide">AMOUNT</th>
                  <th className="text-left tracking-wide">PAID TO</th>
                  <th className="text-left tracking-wide">DATE</th>
                  <th className="text-left tracking-wide">APPROVED BY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((e, i) => {
                  const ref = String(e.expenseNumber || e.id || `EXP-${String(i + 1).padStart(3, '0')}`);
                  const desc = String(e.items?.[0]?.description || e.notes || e.location || '—');
                  const cat = normalizeCategory(e.category);
                  const amt = toNum(e.amount);
                  const paidTo = String(e.supplier || e.location || '—');
                  const dateLabel = e.date ? formatDisplayDate(e.date) : '—';
                  const approvedBy = String(currentUser?.fullName || 'Admin');
                  return (
                    <tr key={`${ref}_${i}`} className="grid grid-cols-[140px_minmax(0,1fr)_160px_140px_160px_140px_140px] px-5 py-3 items-center">
                      <td className="text-sm text-gray-700">{ref}</td>
                      <td className="text-sm font-medium text-gray-900 truncate">{desc}</td>
                      <td className="text-sm">
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">{cat}</span>
                      </td>
                      <td className="text-sm font-semibold text-rose-700">TSH {money0(amt)}</td>
                      <td className="text-sm text-gray-800 truncate">{paidTo}</td>
                      <td className="text-sm text-gray-700">{dateLabel}</td>
                      <td className="text-sm text-gray-800 truncate">{approvedBy}</td>
                    </tr>
                  );
                })}
                {records.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-sm text-gray-600" colSpan={7}>
                      No expenses found for this filter.
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
