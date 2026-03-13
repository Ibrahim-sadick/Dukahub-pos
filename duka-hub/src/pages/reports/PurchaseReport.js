import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const parseIsoDate = (d) => {
  const t = Date.parse(String(d || ''));
  return Number.isFinite(t) ? new Date(t) : null;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

const pct = (cur, prev) => {
  const p = Number(prev || 0);
  const c = Number(cur || 0);
  if (!p) return c ? 100 : 0;
  return ((c - p) * 100) / p;
};

const addDays = (d, days) => {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
};

const LineOrBars = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const ratio = (r.value * 100) / max;
        return (
          <div key={r.label} className="grid grid-cols-[140px_minmax(0,1fr)_80px] gap-3 items-center text-sm">
            <div className="text-gray-700 truncate">{r.label}</div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-3 rounded-full" style={{ width: `${Math.max(3, Math.min(100, ratio))}%`, backgroundColor: r.color }} />
            </div>
            <div className="text-gray-700 text-right">TSH {money0(r.value)}</div>
          </div>
        );
      })}
    </div>
  );
};

export default function PurchaseReport() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('thisMonth');
  const [supplier, setSupplier] = useState('all');
  const [status, setStatus] = useState('all');
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

  const allPurchases = useMemo(() => {
    void refreshKey;
    try {
      const raw = JSON.parse(localStorage.getItem('purchases') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }, [refreshKey]);

  const supplierOptions = useMemo(() => {
    const set = new Set();
    allPurchases.forEach((p) => {
      const s = String(p.supplierName || p.supplier || '').trim();
      if (s) set.add(s);
    });
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [allPurchases]);

  const range = useMemo(() => {
    const now = new Date();
    if (period === 'thisMonth') {
      return { label: 'This Month', start: startOfMonth(now), end: endOfMonth(now) };
    }
    if (period === 'lastMonth') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { label: 'Last Month', start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    if (period === 'thisYear') {
      return { label: 'This Year', start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
    }
    return { label: 'All Time', start: null, end: null };
  }, [period]);

  const annotate = useMemo(() => {
    const now = new Date();
    return allPurchases.map((p) => {
      const d = parseIsoDate(p.date);
      const expected = d ? addDays(d, 5) : null;
      const st = expected && now >= expected ? 'received' : 'pending';
      return { ...p, _date: d, _expected: expected, _status: st };
    });
  }, [allPurchases]);

  const filtered = useMemo(() => {
    const sup = String(supplier || 'all').toLowerCase();
    const st = String(status || 'all').toLowerCase();
    const inRange = (p) => {
      if (!p._date) return false;
      if (range.start && p._date < range.start) return false;
      if (range.end && p._date > range.end) return false;
      return true;
    };
    return annotate
      .filter((p) => inRange(p))
      .filter((p) => {
        if (sup === 'all') return true;
        return String(p.supplierName || p.supplier || '').trim().toLowerCase() === sup;
      })
      .filter((p) => {
        if (st === 'all') return true;
        return String(p._status || '').toLowerCase() === st;
      });
  }, [annotate, range.end, range.start, status, supplier]);

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

  const prevTotal = useMemo(() => {
    if (!prevRange.start || !prevRange.end) return 0;
    return annotate
      .filter((p) => p._date && p._date >= prevRange.start && p._date <= prevRange.end)
      .reduce((s, p) => s + toNum(p.total), 0);
  }, [annotate, prevRange.end, prevRange.start]);

  const kpis = useMemo(() => {
    const total = filtered.reduce((s, p) => s + toNum(p.total), 0);
    const orders = filtered.length;
    const received = filtered.filter((p) => p._status === 'received').length;
    const pending = filtered.filter((p) => p._status !== 'received').length;
    const bySupplier = new Map();
    filtered.forEach((p) => {
      const s = String(p.supplierName || p.supplier || 'Unknown').trim() || 'Unknown';
      bySupplier.set(s, (bySupplier.get(s) || 0) + toNum(p.total));
    });
    const top = Array.from(bySupplier.entries()).sort((a, b) => b[1] - a[1])[0] || null;
    return { total, orders, received, pending, topSupplier: top ? top[0] : '—', topAmount: top ? top[1] : 0, bySupplier };
  }, [filtered]);

  const deltaTotal = pct(kpis.total, prevTotal);

  const purchasesBySupplier = useMemo(() => {
    const entries = Array.from(kpis.bySupplier.entries()).map(([label, value]) => ({ label, value }));
    entries.sort((a, b) => b.value - a.value);
    const palette = ['#2563eb', '#ef4444', '#d97706', '#7c3aed', '#16a34a'];
    return entries.slice(0, 5).map((r, i) => ({ ...r, color: palette[i % palette.length] }));
  }, [kpis.bySupplier]);

  const supplierPerformance = useMemo(() => {
    const by = new Map();
    filtered.forEach((p) => {
      const s = String(p.supplierName || p.supplier || 'Unknown').trim() || 'Unknown';
      const rec = by.get(s) || { total: 0, received: 0 };
      rec.total += 1;
      if (p._status === 'received') rec.received += 1;
      by.set(s, rec);
    });
    const rows = Array.from(by.entries()).map(([label, v]) => ({ label, pct: v.total ? Math.round((v.received * 100) / v.total) : 0 }));
    rows.sort((a, b) => b.pct - a.pct);
    return rows.slice(0, 5);
  }, [filtered]);

  const records = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || toNum(b.id) - toNum(a.id));
    return arr.slice(0, 12);
  }, [filtered]);

  const exportCSV = () => {
    const rows = [['PO Number', 'Supplier', 'Items', 'Amount', 'Order Date', 'Expected', 'Status']];
    filtered.forEach((p) => {
      const po = String(p.lpoNumber || p.poNumber || p.id || '');
      const sup = String(p.supplierName || p.supplier || '');
      const items = Array.isArray(p.items) ? p.items.length : 0;
      const amt = String(toNum(p.total));
      const od = String(p.date || '');
      const ex = p._expected ? p._expected.toISOString().slice(0, 10) : '';
      const st = p._status === 'received' ? 'Received' : 'Pending';
      rows.push([po, sup, String(items), amt, od, ex, st]);
    });
    downloadCsvFile(`purchase_report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportPDF = () => printWithTitle(`Purchase Report - ${range.label}`);

  const card = (title, value, note, tone) => (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="text-[11px] font-medium text-gray-500 tracking-wide">{title}</div>
        <div className="mt-2 text-3xl font-semibold text-gray-900">{value}</div>
        <div className="mt-2 text-sm text-gray-600">{note}</div>
      </div>
      <div className="h-1" style={{ backgroundColor: tone }} />
    </div>
  );

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
          Reports <span className="mx-1">›</span> <span className="text-gray-900 font-medium">Purchase Report</span>
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
            <div className="text-[12px] text-orange-700 font-medium tracking-wide">Procurement analysis</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">Purchase Report</div>
            <div className="mt-2 text-sm text-gray-600">All stock purchases from suppliers — {range.label}</div>
          </div>
          <div className="flex items-center gap-3 report-no-print">
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm">
              {supplierOptions.map((s) => (
                <option key={s} value={s === 'all' ? 'all' : s}>
                  {s === 'all' ? 'All Suppliers' : s}
                </option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm">
              <option value="all">All Status</option>
              <option value="received">Received</option>
              <option value="pending">Pending Delivery</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {card('TOTAL PURCHASED', `TSH ${money0(kpis.total)}`, `${deltaTotal >= 0 ? '▲' : '▼'} ${Math.abs(deltaTotal).toFixed(1)}% vs last month`, '#f97316')}
          {card('PURCHASE ORDERS', String(kpis.orders), range.label, '#2563eb')}
          {card('RECEIVED', String(kpis.received), `${kpis.orders ? ((kpis.received * 100) / kpis.orders).toFixed(1) : '0'}% fulfilled`, '#16a34a')}
          {card('PENDING DELIVERY', String(kpis.pending), 'In transit', '#d97706')}
          {card('TOP SUPPLIER', String(kpis.topSupplier || '—'), `TSH ${money0(kpis.topAmount)} this month`, '#7c3aed')}
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Purchase by Supplier</div>
              <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium">{range.label}</span>
            </div>
            <div className="p-5">
              {purchasesBySupplier.length ? <LineOrBars rows={purchasesBySupplier} /> : <div className="text-sm text-gray-600">No purchases for this filter.</div>}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Supplier Performance</div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">On-time Delivery</span>
            </div>
            <div className="p-5 space-y-4">
              {supplierPerformance.length ? (
                supplierPerformance.map((r) => (
                  <div key={r.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-gray-900 truncate">{r.label}</div>
                      <div className={r.pct >= 90 ? 'text-emerald-700 font-medium' : r.pct >= 70 ? 'text-amber-700 font-medium' : 'text-rose-700 font-medium'}>
                        {r.pct}%
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-2 rounded-full" style={{ width: `${Math.max(2, Math.min(100, r.pct))}%`, backgroundColor: r.pct >= 90 ? '#16a34a' : r.pct >= 70 ? '#d97706' : '#ef4444' }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-600">No supplier stats.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-gray-900">Purchase Order Records</div>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{range.label}</span>
          </div>
          <div className="overflow-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-600">
                <tr className="grid grid-cols-[160px_minmax(0,1fr)_120px_140px_140px_140px_140px] px-5 py-3">
                  <th className="text-left tracking-wide">PO NUMBER</th>
                  <th className="text-left tracking-wide">SUPPLIER</th>
                  <th className="text-left tracking-wide">ITEMS</th>
                  <th className="text-left tracking-wide">AMOUNT</th>
                  <th className="text-left tracking-wide">ORDER DATE</th>
                  <th className="text-left tracking-wide">EXPECTED</th>
                  <th className="text-left tracking-wide">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((p, i) => {
                  const po = String(p.lpoNumber || p.poNumber || p.id || `PO-${String(i + 1).padStart(4, '0')}`);
                  const sup = String(p.supplierName || p.supplier || '—');
                  const items = Array.isArray(p.items) ? p.items.length : 0;
                  const amt = toNum(p.total);
                  const od = p.date ? formatDisplayDate(p.date) : '—';
                  const ex = p._expected ? formatDisplayDate(p._expected.toISOString().slice(0, 10)) : '—';
                  const st = p._status === 'received' ? 'Received' : 'Pending';
                  return (
                    <tr key={`${po}_${i}`} className="grid grid-cols-[160px_minmax(0,1fr)_120px_140px_140px_140px_140px] px-5 py-3 items-center">
                      <td className="text-sm text-gray-700">
                        <button
                          type="button"
                          className="text-sky-700 hover:text-sky-800 underline underline-offset-2"
                          onClick={() => navigate(`/purchases?open=${encodeURIComponent(String(p.id || ''))}`)}
                        >
                          {po}
                        </button>
                      </td>
                      <td className="text-sm font-medium text-gray-900 truncate">{sup}</td>
                      <td className="text-sm text-gray-800">{items} items</td>
                      <td className="text-sm font-semibold text-gray-900">TSH {money0(amt)}</td>
                      <td className="text-sm text-gray-700">{od}</td>
                      <td className="text-sm text-gray-700">{ex}</td>
                      <td className="text-sm">
                        <span className={st === 'Received' ? 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium' : 'px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium'}>
                          {st}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-sm text-gray-600" colSpan={7}>
                      No purchases found for this filter.
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
