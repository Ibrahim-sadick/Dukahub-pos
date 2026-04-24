import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { formatDisplayDate } from '../../utils/date';
import { downloadExcelFile, printWithTitle } from '../../utils/reportActions';
import { reportingApi } from '../../services/reportingApi';
import { salesApi } from '../../services/salesApi';

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

const BarChart = ({ points }) => {
  const w = 640;
  const h = 220;
  const padX = 56;
  const padY = 22;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;
  const ys = points.map((p) => Number(p.y || 0));
  const rawMax = Math.max(0, ...ys, 1);
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
  const range = niceNum(rawMax, false);
  const step = niceNum(range / 4, true);
  const maxV = Math.ceil(rawMax / step) * step || 1;
  const yFor = (v) => padY + ((maxV - v) * plotH) / (maxV || 1);
  const y0 = padY + plotH;
  const n = Math.max(1, points.length);
  const barW = Math.max(6, (plotW / n) * 0.6);
  const gap = (plotW - barW * n) / (n + 1);

  return (
    <svg className="w-full h-[220px]" viewBox={`0 0 ${w} ${h}`}>
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
              {money(v)}
            </text>
          );
        })}
      </g>
      {points.map((p, i) => {
        const v = Number(p.y || 0);
        const x = padX + gap + i * (barW + gap);
        const y = yFor(v);
        const bh = Math.max(0, y0 - y);
        return <rect key={p.label || i} x={x} y={y} width={barW} height={bh} fill="#16a34a" rx="6" />;
      })}
      {points.map((p, i) => {
        const x = padX + gap + i * (barW + gap) + barW / 2;
        return (
          <text key={p.label || i} x={x} y={h - 8} textAnchor="middle" fontSize="10" fill="#6b7280">
            {String(p.label || '')}
          </text>
        );
      })}
    </svg>
  );
};

export default function SalesReport() {
  const [period, setPeriod] = useState('thisMonth');
  const [category, setCategory] = useState('all');
  const [staff, setStaff] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [allSales, setAllSales] = useState([]);
  const [salesSummary, setSalesSummary] = useState(null);
  const [prevSalesSummary, setPrevSalesSummary] = useState(null);

  useEffect(() => {
    const onEvent = () => setRefreshKey((v) => v + 1);
    window.addEventListener('dataUpdated', onEvent);
    return () => {
      window.removeEventListener('dataUpdated', onEvent);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const rawSales = await salesApi.list().catch(() => []);
        if (!alive) return;

        const combined = Array.isArray(rawSales) ? rawSales : [];

        const normalized = combined.map((s) => {
          const items = Array.isArray(s?.items) ? s.items : [];
          const qty = items.reduce((sum, it) => sum + toNum(it?.quantity ?? it?.qty), 0);
          const cat = String(items[0]?.productType || s?.itemType || s?.saleType || 'General').trim();
          const invoiceNumber = String(s?.saleNumber || s?.invoiceNumber || s?.orderNumber || s?.id || '').trim();
          const date = String(s?.date || s?.orderDateTime || s?.orderDate || s?.createdAt || '').trim();
          const amount = toNum(s?.amount ?? s?.finalTotal ?? s?.total ?? s?.totalTzs);
          return {
            ...s,
            date,
            amount,
            finalTotal: amount,
            invoiceNumber,
            customerName: String(s?.customerName || s?.name || s?.customer || '').trim() || '—',
            category: cat,
            productType: cat,
            quantitySold: qty,
            cashier: String(s?.cashier || s?.staff?.fullName || s?.staff?.employeeId || s?.user || s?.createdBy || '').trim(),
            paymentMethod: String(s?.paymentMethod || '').trim()
          };
        });
        setAllSales(normalized);
      })
      .catch(() => setAllSales([]));
    return () => {
      alive = false;
    };
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

  const rangeRequest = useMemo(() => ({
    from: range.start || new Date(2000, 0, 1),
    to: range.end || new Date()
  }), [range.end, range.start]);

  const prevRangeRequest = useMemo(() => {
    if (!prevRange.start || !prevRange.end) return null;
    return { from: prevRange.start, to: prevRange.end };
  }, [prevRange.end, prevRange.start]);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const [currentSummary, previousSummary] = await Promise.all([
          reportingApi.salesSummary(rangeRequest),
          prevRangeRequest ? reportingApi.salesSummary(prevRangeRequest) : Promise.resolve(null)
        ]);
        if (!alive) return;
        setSalesSummary(currentSummary || null);
        setPrevSalesSummary(previousSummary || null);
      })
      .catch(() => {
        if (!alive) return;
        setSalesSummary(null);
        setPrevSalesSummary(null);
      });
    return () => {
      alive = false;
    };
  }, [prevRangeRequest, rangeRequest, refreshKey]);

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

  const useBackendSummary = category === 'all' && staff === 'all';

  const summaryTotals = useMemo(() => {
    if (!useBackendSummary || !salesSummary) return totals;
    const sum = toNum(salesSummary?.aggregate?._sum?.finalTotal);
    const tx = toNum(salesSummary?.aggregate?._count?._all);
    const items = (Array.isArray(salesSummary?.topProducts) ? salesSummary.topProducts : []).reduce(
      (acc, entry) => acc + toNum(entry?._sum?.qty),
      0
    );
    return { sum, tx, items, returns: 0, avg: tx ? sum / tx : 0 };
  }, [salesSummary, totals, useBackendSummary]);

  const summaryTotalsPrev = useMemo(() => {
    if (!useBackendSummary || !prevSalesSummary) return totalsPrev;
    const sum = toNum(prevSalesSummary?.aggregate?._sum?.finalTotal);
    const tx = toNum(prevSalesSummary?.aggregate?._count?._all);
    const items = (Array.isArray(prevSalesSummary?.topProducts) ? prevSalesSummary.topProducts : []).reduce(
      (acc, entry) => acc + toNum(entry?._sum?.qty),
      0
    );
    return { sum, tx, items, returns: 0, avg: tx ? sum / tx : 0 };
  }, [prevSalesSummary, totalsPrev, useBackendSummary]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const months = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: d.toLocaleString(undefined, { month: 'short' }) });
    }

    const cat = String(category || 'all').toLowerCase();
    const st = String(staff || 'all').toLowerCase();
    const byMonth = new Map(months.map((m) => [m.key, 0]));
    allSales
      .filter((s) => {
        if (cat === 'all') return true;
        return normalizeCategory(s.category || s.productType || s.productName).toLowerCase() === cat;
      })
      .filter((s) => {
        if (st === 'all') return true;
        const v = String(s.cashier || s.staffName || s.user || s.createdBy || '').trim().toLowerCase();
        return v === st;
      })
      .forEach((s) => {
        const d = parseIsoDate(s.date);
        if (!d) return;
        if (d < start || d > end) return;
        const k = monthKey(d);
        if (!byMonth.has(k)) return;
        byMonth.set(k, (byMonth.get(k) || 0) + toNum(s.amount ?? s.finalTotal));
      });

    return months.map((m, i) => ({ x: i, y: byMonth.get(m.key) || 0, label: m.label }));
  }, [allSales, category, staff]);

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
    if (useBackendSummary && salesSummary && Array.isArray(salesSummary?.byPaymentMethod)) {
      const palette = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#0ea5e9'];
      return salesSummary.byPaymentMethod
        .map((entry, i) => ({
          label: normalizePayment(entry?.paymentMethod),
          value: toNum(entry?._sum?.finalTotal),
          color: palette[i % palette.length]
        }))
        .filter((entry) => entry.value > 0)
        .slice(0, 5);
    }
    const map = new Map();
    filtered.forEach((s) => {
      const k = normalizePayment(s.paymentMethod);
      map.set(k, (map.get(k) || 0) + toNum(s.amount ?? s.finalTotal));
    });
    const arr = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    arr.sort((a, b) => b.value - a.value);
    const palette = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#0ea5e9'];
    return arr.slice(0, 5).map((d, i) => ({ ...d, color: palette[i % palette.length] }));
  }, [filtered, salesSummary, useBackendSummary]);

  const topProducts = useMemo(() => {
    if (useBackendSummary && salesSummary && Array.isArray(salesSummary?.topProducts)) {
      return salesSummary.topProducts
        .map((entry) => ({
          label: String(entry?.productName || 'Product').trim() || 'Product',
          value: toNum(entry?._sum?.total),
          qty: toNum(entry?._sum?.qty)
        }))
        .filter((entry) => entry.value > 0 || entry.qty > 0)
        .slice(0, 5);
    }
    const map = new Map();
    filtered.forEach((s) => {
      const items = Array.isArray(s.items) ? s.items : null;
      if (items && items.length) {
        items.forEach((it) => {
          const name = String(it?.item || it?.itemName || '').trim();
          if (!name) return;
          const amt = (() => {
            if (it?.amountTzs != null && it?.amountTzs !== '') return toNum(it.amountTzs);
            if (it?.amount != null && it?.amount !== '') return toNum(it.amount);
            return toNum(it?.qty) * toNum(it?.rate);
          })();
          map.set(name, (map.get(name) || 0) + amt);
        });
        return;
      }
      const k = String(s.productName || s.subcategory || s.description || s.productType || 'Product').trim();
      map.set(k, (map.get(k) || 0) + toNum(s.amount ?? s.finalTotal));
    });
    const arr = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    arr.sort((a, b) => b.value - a.value);
    return arr.slice(0, 5);
  }, [filtered, salesSummary, useBackendSummary]);

  const recent = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || toNum(b.id) - toNum(a.id));
    return arr.slice(0, 8);
  }, [filtered]);

  const exportExcel = () => {
    const rows = [['Invoice', 'Customer', 'Items', 'Amount (TSH)', 'Payment', 'Cashier', 'Date', 'Status']];
    const list = filtered.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || toNum(a.id) - toNum(b.id));
    list.forEach((s, i) => {
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
    downloadExcelFile(`sales_report_${new Date().toISOString().slice(0, 10)}.xls`, {
      title: 'Sales Report',
      subtitle: String(range?.label || ''),
      rows
    });
  };

  const exportPDF = () => {
    printWithTitle(`Sales Report - ${range.label}`);
  };

  const totalCat = categories.reduce((s, c) => s + Number(c.value || 0), 0);
  const count0 = (n) => {
    const x = Number(n || 0);
    try {
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number.isFinite(x) ? x : 0);
    } catch {
      return String(Number.isFinite(x) ? x : 0);
    }
  };
  const card = (title, value, delta, tone, kind = 'money') => (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="text-[11px] font-medium text-gray-500 tracking-wide">{title}</div>
        <div className="mt-2 text-3xl font-semibold text-gray-900">{kind === 'money' ? `TSH ${money(value)}` : count0(value)}</div>
        <div className={delta >= 0 ? 'mt-2 text-sm font-medium text-emerald-700' : 'mt-2 text-sm font-medium text-rose-700'}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </div>
      </div>
      <div className="h-1" style={{ backgroundColor: tone }} />
    </div>
  );

  const deltaSales = pct(summaryTotals.sum, summaryTotalsPrev.sum);
  const deltaTx = pct(summaryTotals.tx, summaryTotalsPrev.tx);
  const deltaAvg = pct(summaryTotals.avg, summaryTotalsPrev.avg);
  const deltaItems = pct(summaryTotals.items, summaryTotalsPrev.items);

  return (
    <div className="space-y-6">
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

      <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[12px] text-emerald-700 font-medium tracking-wide">Revenue analysis</div>
            <div className="mt-2 text-sm text-gray-600">Complete overview of sales performance</div>
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
          {card('TOTAL SALES', summaryTotals.sum, deltaSales, '#16a34a', 'money')}
          {card('TRANSACTIONS', summaryTotals.tx, deltaTx, '#2563eb', 'count')}
          {card('AVG SALE VALUE', summaryTotals.avg, deltaAvg, '#7c3aed', 'money')}
          {card('ITEMS SOLD', summaryTotals.items, deltaItems, '#d97706', 'count')}
          {card('RETURNS', summaryTotals.returns, 0, '#ef4444', 'count')}
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Daily Sales Trend</div>
            </div>
            <div className="p-5">
              <BarChart points={monthlyTrend.length ? monthlyTrend.map((p) => ({ x: p.x, y: p.y, label: p.label })) : [{ x: 0, y: 0, label: '' }]} />
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
                  const pctVal = summaryTotals.sum ? (v * 100) / summaryTotals.sum : 0;
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

        <div className="report-print-scope mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
            <div>
              <div className="report-print-only">
                <div className="text-lg font-semibold text-gray-900">Sales Report</div>
              </div>
              <div className="report-no-print text-base font-semibold text-gray-900">Recent Sales Transactions</div>
            </div>
            <span className="report-no-print px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Last 8 records</span>
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
