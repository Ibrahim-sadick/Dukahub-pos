import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { reportingApi } from '../../services/reportingApi';
import { formatDisplayDate } from '../../utils/date';
import { downloadExcelFile, printWithTitle } from '../../utils/reportActions';

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

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

const pct = (cur, prev) => {
  const p = Number(prev || 0);
  const c = Number(cur || 0);
  if (!p) return c ? 100 : 0;
  return ((c - p) * 100) / p;
};

const GroupedBarChart = ({ groups }) => {
  const w = 740;
  const h = 260;
  const padX = 52;
  const padY = 26;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;
  const vals = (Array.isArray(groups) ? groups : []).flatMap((g) => [Number(g?.revenue || 0), Number(g?.expenses || 0), Number(g?.profit || 0)]);
  const rawMin = Math.min(0, ...vals.map((v) => Number(v) || 0));
  const rawMax = Math.max(0, ...vals.map((v) => Number(v) || 0));
  const niceNum = (range, round) => {
    const exponent = Math.floor(Math.log10(range || 1));
    const fraction = range / Math.pow(10, exponent);
    let niceFraction;
    if (round) {
      if (fraction < 1.5) niceFraction = 1;
      else if (fraction < 3) niceFraction = 2;
      else if (fraction < 7) niceFraction = 5;
      else niceFraction = 10;
    } else {
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 5) niceFraction = 5;
      else niceFraction = 10;
    }
    return niceFraction * Math.pow(10, exponent);
  };
  const range = niceNum(rawMax - rawMin, false);
  const step = niceNum(range / 4, true);
  const minV = Math.floor(rawMin / step) * step;
  const maxV = Math.ceil(rawMax / step) * step;
  const yFor = (v) => padY + ((maxV - v) * plotH) / (maxV - minV || 1);
  const y0 = yFor(0);
  const n = Math.max(1, (Array.isArray(groups) ? groups : []).length);
  const groupW = plotW / n;
  const barW = Math.max(6, groupW * 0.22);
  const gap = Math.max(3, barW * 0.25);
  const series = [
    { key: 'revenue', label: 'Revenue', color: '#16a34a' },
    { key: 'expenses', label: 'Expenses', color: '#ef4444' },
    { key: 'profit', label: 'Profit', color: '#4f46e5' }
  ];
  return (
    <svg className="w-full h-[260px]" viewBox={`0 0 ${w} ${h}`}>
      <g opacity="0.35">
        {new Array(5).fill(0).map((_, i) => {
          const v = maxV - i * step;
          const y = yFor(v);
          return <line key={i} x1={padX} y1={y} x2={w - padX} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
      </g>
      <g>
        {new Array(5).fill(0).map((_, i) => {
          const v = maxV - i * step;
          const y = yFor(v);
          return (
            <text key={i} x={padX - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
              {money0(v)}
            </text>
          );
        })}
      </g>
      <line x1={padX} y1={y0} x2={w - padX} y2={y0} stroke="#9ca3af" strokeWidth="1" opacity="0.6" />
      {(Array.isArray(groups) ? groups : []).map((g, i) => {
        const cx = padX + groupW * i + groupW / 2;
        const totalW = barW * 3 + gap * 2;
        const startX = cx - totalW / 2;
        const values = {
          revenue: Number(g?.revenue || 0),
          expenses: Number(g?.expenses || 0),
          profit: Number(g?.profit || 0)
        };
        return (
          <g key={g.key || i}>
            {series.map((s, j) => {
              const v = values[s.key];
              const x = startX + j * (barW + gap);
              const yV = yFor(v);
              const yZ = y0;
              const y = Math.min(yV, yZ);
              const bh = Math.abs(yV - yZ);
              return (
                <rect
                  key={s.key}
                  x={x}
                  y={y}
                  width={barW}
                  height={bh}
                  rx="3"
                  fill={s.color}
                  opacity={s.key === 'profit' && v < 0 ? 0.5 : 0.85}
                />
              );
            })}
            <text x={cx} y={h - 8} textAnchor="middle" fontSize="10" fill="#6b7280">
              {String(g.label || '')}
            </text>
          </g>
        );
      })}
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
  const [report, setReport] = useState(null);
  const [prevSummary, setPrevSummary] = useState(null);

  useEffect(() => {
    const onEvent = () => setRefreshKey((v) => v + 1);
    window.addEventListener('dataUpdated', onEvent);
    return () => {
      window.removeEventListener('dataUpdated', onEvent);
    };
  }, []);

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

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const [currentReport, previousSummary] = await Promise.all([
          reportingApi.profitLossReport({ from: range.start, to: range.end }),
          reportingApi.profitLossSummary({ from: prevRange.start, to: prevRange.end })
        ]);
        if (!alive) return;
        setReport(currentReport || null);
        setPrevSummary(previousSummary || null);
      })
      .catch(() => {
        if (!alive) return;
        setReport(null);
        setPrevSummary(null);
      });
    return () => {
      alive = false;
    };
  }, [prevRange.end, prevRange.start, range.end, range.start, refreshKey]);

  const summaryTotals = useMemo(() => {
    const grossRevenue = toNum(report?.revenue);
    const totalExpenses = toNum(report?.operatingExpenses);
    const totalLosses = toNum(report?.stockLosses);
    const netProfit = toNum(report?.netProfit);
    const margin = grossRevenue ? (netProfit * 100) / grossRevenue : 0;
    const tax = netProfit > 0 ? netProfit * 0.18 : 0;
    return { grossRevenue, totalExpenses, totalLosses, netProfit, margin, tax };
  }, [report]);

  const summaryPrevTotals = useMemo(() => {
    const grossRevenue = toNum(prevSummary?.revenue);
    const totalExpenses = toNum(prevSummary?.operatingExpenses);
    const totalLosses = toNum(prevSummary?.stockLosses);
    const netProfit = toNum(prevSummary?.netProfit);
    const margin = grossRevenue ? (netProfit * 100) / grossRevenue : 0;
    return { grossRevenue, totalExpenses, totalLosses, netProfit, margin };
  }, [prevSummary]);

  const summaryDeltas = useMemo(() => {
    return {
      revenue: pct(summaryTotals.grossRevenue, summaryPrevTotals.grossRevenue),
      expenses: pct(
        summaryTotals.totalExpenses + summaryTotals.totalLosses,
        summaryPrevTotals.totalExpenses + summaryPrevTotals.totalLosses
      ),
      netProfit: pct(summaryTotals.netProfit, summaryPrevTotals.netProfit),
      marginPts: summaryTotals.margin - summaryPrevTotals.margin
    };
  }, [summaryPrevTotals, summaryTotals]);

  const expensesByCategory = useMemo(() => {
    return Array.isArray(report?.expenseCategories) ? report.expenseCategories : [];
  }, [report]);

  const trendGroups = useMemo(() => {
    return Array.isArray(report?.trend?.groups) ? report.trend.groups : [];
  }, [report]);

  const recentActivity = useMemo(() => {
    return Array.isArray(report?.recentActivity) ? report.recentActivity : [];
  }, [report]);

  const exportExcel = () => {
    const rows = [
      ['Section', 'Label', 'Amount'],
      ['Income', 'Gross Revenue', String(summaryTotals.grossRevenue)],
      ['Expenses', 'Total Expenses', String(summaryTotals.totalExpenses)],
      ['Expenses', 'Total Losses', String(summaryTotals.totalLosses)],
      ['Summary', 'Net Profit', String(summaryTotals.netProfit)],
      ['Summary', 'Profit Margin (%)', String(summaryTotals.margin.toFixed(2))],
      ['Summary', 'Tax Estimate (18%)', String(summaryTotals.tax)]
    ];
    expensesByCategory.forEach((r) => rows.push(['Expenses', r.label, String(r.value)]));
    downloadExcelFile(`profit_loss_${new Date().toISOString().slice(0, 10)}.xls`, {
      title: 'Profit & Loss Report',
      subtitle: String(range?.label || ''),
      rows
    });
  };

  const exportPDF = () => printWithTitle(`Profit & Loss Report - ${range.label}`);

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
          Reports <span className="mx-1">›</span> <span className="text-gray-900 font-medium">Profit &amp; Loss</span>
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
          <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2" onClick={exportExcel}>
            <Download className="w-4 h-4" />
            Excel
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
            <div className="mt-2 text-sm text-gray-600">Income vs expenses</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard title="GROSS REVENUE" value={`TSH ${money0(summaryTotals.grossRevenue)}`} note={`${summaryDeltas.revenue >= 0 ? '▲' : '▼'} ${money1(Math.abs(summaryDeltas.revenue))}% vs last month`} tone="#16a34a" />
          <StatCard title="TOTAL EXPENSES" value={`TSH ${money0(summaryTotals.totalExpenses + summaryTotals.totalLosses)}`} note={`${summaryDeltas.expenses >= 0 ? '▲' : '▼'} ${money1(Math.abs(summaryDeltas.expenses))}% vs last month`} tone="#ef4444" />
          <StatCard title="NET PROFIT" value={`TSH ${money0(summaryTotals.netProfit)}`} note={`${summaryDeltas.netProfit >= 0 ? '▲' : '▼'} ${money1(Math.abs(summaryDeltas.netProfit))}% vs last month`} tone="#2563eb" />
          <StatCard title="PROFIT MARGIN" value={`${money1(summaryTotals.margin)}%`} note={`${summaryDeltas.marginPts >= 0 ? '▲' : '▼'} ${money1(Math.abs(summaryDeltas.marginPts))} pts`} tone="#7c3aed" />
          <StatCard title="TAX ESTIMATE (18%)" value={`TSH ${money0(summaryTotals.tax)}`} note="VAT inclusive" tone="#f59e0b" />
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Revenue vs Expenses vs Profit — 12 Months</div>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">Monthly</span>
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
                <GroupedBarChart groups={trendGroups} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">P&amp;L Statement</div>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-5 py-3 text-[12px] text-gray-600 font-medium tracking-wide">INCOME</div>
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="text-sm text-gray-800">Product Sales</div>
                <div className="text-sm font-medium text-emerald-700">TSH {money0(summaryTotals.grossRevenue)}</div>
              </div>
              <div className="px-5 py-3 flex items-center justify-between gap-3 bg-emerald-50/40">
                <div className="text-sm text-gray-800">Net Revenue</div>
                <div className="text-sm font-medium text-emerald-700">TSH {money0(summaryTotals.grossRevenue)}</div>
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
                <div className="text-sm font-medium text-rose-700">-TSH {money0(summaryTotals.totalExpenses + summaryTotals.totalLosses)}</div>
              </div>
              <div className="px-5 py-4 flex items-center justify-between gap-3 bg-emerald-50/60">
                <div className="text-sm text-gray-900 font-medium">NET PROFIT</div>
                <div className="text-xl font-semibold text-emerald-700">TSH {money0(summaryTotals.netProfit)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-gray-900">Recent Activity</div>
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
                {recentActivity.map((r) => (
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
                {recentActivity.length === 0 ? (
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
