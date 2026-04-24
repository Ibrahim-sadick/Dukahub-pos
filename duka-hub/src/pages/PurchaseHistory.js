import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { formatDisplayDate } from '../utils/date';
import DateInput from '../shared/DateInput';
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal';
import { canDeleteRecords } from '../utils/deletePassword';
import { downloadExcelFile } from '../utils/reportActions';
import { purchasesApi } from '../services/purchasingApi';
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
    void safeJsonParse;
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
  }
};

// eslint-disable-next-line no-unused-vars
const getStoredJson = (key, fallback) => localStore.get(key, fallback);
// eslint-disable-next-line no-unused-vars
const supplierIdFromName = (name) => {
  const s = String(name || '').trim().toLowerCase();
  if (!s) return '';
  return s.replace(/\s+/g, '_').replace(/[^a-z0-9_]+/g, '').slice(0, 60) || s.slice(0, 60);
};

const PurchaseHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hideHeader, setHideHeader] = useState(false);
  const [sortKey, setSortKey] = useState('date_desc');
  const [periodLabel] = useState('This Month-to-date');
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [purchases, setPurchases] = useState([]);
  const [widths, setWidths] = useState([160, 120, 220, 120, 140, 110, 160]);
  const [deleteModal, setDeleteModal] = useState({ open: false, purchaseId: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const vendorIdFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('vendorId') || '';
  }, [location.search]);
  const vendorIdsFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('vendorIds') || '';
    return v ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];
  }, [location.search]);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const list = await purchasesApi.list();
        if (!alive) return;
        const arr = Array.isArray(list) ? list : [];
        const withSupplierId = arr.map((p) => ({ ...p, supplierId: p?.supplierId || supplierIdFromName(p?.supplierName) }));
        setPurchases(withSupplierId);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const onEvent = () => setRefreshKey((v) => v + 1);
    window.addEventListener('dataUpdated', onEvent);
    return () => window.removeEventListener('dataUpdated', onEvent);
  }, []);

  const filteredRows = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    const rows = (purchases || []).filter((p) => {
      if (vendorIdsFilter.length > 0 && !vendorIdsFilter.includes(String(p?.supplierId || ''))) return false;
      if (vendorIdsFilter.length === 0 && vendorIdFilter && String(p?.supplierId || '') !== String(vendorIdFilter)) return false;
      const d = new Date(p?.date || '');
      if (isNaN(d) || d < start || d > end) return false;
      if (!q) return true;
      return (
        String(p?.lpoNumber || '').toLowerCase().includes(q) ||
        String(p?.supplierName || '').toLowerCase().includes(q) ||
        String(p?.date || '').toLowerCase().includes(q)
      );
    });
    const sorted = rows.slice().sort((a, b) => {
      const ad = String(a?.date || '');
      const bd = String(b?.date || '');
      switch (sortKey) {
        case 'date_asc':
          return ad > bd ? 1 : ad < bd ? -1 : 0;
        case 'date_desc':
          return ad < bd ? 1 : ad > bd ? -1 : 0;
        case 'vendor_asc':
          return String(a?.supplierName || '').localeCompare(String(b?.supplierName || ''));
        case 'vendor_desc':
          return String(b?.supplierName || '').localeCompare(String(a?.supplierName || ''));
        case 'total_asc':
          return (Number(a?.total) || 0) - (Number(b?.total) || 0);
        case 'total_desc':
          return (Number(b?.total) || 0) - (Number(a?.total) || 0);
        default:
          return 0;
      }
    });
    return sorted;
  }, [purchases, fromDate, toDate, search, sortKey, vendorIdFilter, vendorIdsFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((p) => {
      const key = p?.supplierName || '(No Vendor)';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return Array.from(map.entries()).map(([vendor, list]) => {
      const total = (list || []).reduce((s, p) => s + (Number(p?.total) || 0), 0);
      return { vendor, list, total };
    });
  }, [filteredRows]);

  const onMouseDown = (i, e) => {
    const startX = e.clientX;
    const startW = widths[i];
    const move = (ev) => {
      const dx = ev.clientX - startX;
      setWidths((prev) => prev.map((w, idx) => (idx === i ? Math.max(90, startW + dx) : w)));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const exportExcel = () => {
    const header = ['Date', 'P.O. No.', 'Vendor', 'Items', 'Total (TSH)'];
    const rows = filteredRows.map((p) => [
      formatDisplayDate(p?.date),
      p?.lpoNumber || '',
      p?.supplierName || '',
      String(Array.isArray(p?.items) ? p.items.length : 0),
      String(Number(p?.total) || 0)
    ]);
    downloadExcelFile(`purchase_history_${new Date().toISOString().slice(0, 10)}.xls`, {
      title: 'Purchase History',
      subtitle: `${String(fromDate || '').slice(0, 10)} to ${String(toDate || '').slice(0, 10)}`,
      rows: [header, ...rows]
    });
  };

  const deletePurchase = (purchaseId) => {
    setDeleteModal({ open: true, purchaseId: String(purchaseId || '') });
  };

  const confirmDeletePurchase = () => {
    if (deleteLoading) return;
    const purchaseId = String(deleteModal.purchaseId || '');
    if (!purchaseId) return;
    if (!canDeleteRecords()) return;

    const startedAt = Date.now();
    setDeleteLoading(true);
    (async () => {
      try {
        await purchasesApi.remove(purchaseId);
        const next = (Array.isArray(purchases) ? purchases : []).filter((p) => String(p?.id) !== String(purchaseId));
        setPurchases(next);
        try {
          window.dispatchEvent(new CustomEvent('dataUpdated'));
        } catch {}
      } catch (error) {
        setFeedback(String(error?.message || 'Unable to delete purchase.'));
        window.setTimeout(() => setFeedback(''), 3200);
      }
      const elapsed = Date.now() - startedAt;
      const remaining = 5000 - elapsed;
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      setDeleteLoading(false);
      setDeleteModal({ open: false, purchaseId: '' });
      setRefreshKey((n) => n + 1);
    })();
  };

  const openPurchase = (purchaseId) => {
    navigate(`/purchases?open=${encodeURIComponent(String(purchaseId))}`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      {feedback ? (
        <div className="mx-6 mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {feedback}
        </div>
      ) : null}
      <ConfirmDeleteModal
        open={deleteModal.open}
        title="Delete Purchase Order?"
        description="This purchase order will be permanently deleted and cannot be recovered."
        confirmText="Delete"
        loading={deleteLoading}
        onCancel={() => (deleteLoading ? null : setDeleteModal({ open: false, purchaseId: '' }))}
        onConfirm={confirmDeletePurchase}
      />
      <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Customize Report</button>
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Comment on Report</button>
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Share Template</button>
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Memorize</button>
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={() => window.print()}>
            Print
          </button>
          <button
            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm"
            onClick={() => {
              const subject = encodeURIComponent('Purchase History');
              const body = encodeURIComponent('Please find the Purchase History report.');
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}
          >
            E-mail
          </button>
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={exportExcel}>
            Excel
          </button>
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={() => setHideHeader((v) => !v)}>
            {hideHeader ? 'Show Header' : 'Hide Header'}
          </button>
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={() => setRefreshKey((k) => k + 1)}>
            Refresh
          </button>
          <button className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm" onClick={() => navigate('/purchases')}>
            New Purchase Order
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 text-sm">{periodLabel}</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">From</span>
            <DateInput className="px-3 py-2 border rounded-lg text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">To</span>
            <DateInput className="px-3 py-2 border rounded-lg text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Sort By</span>
            <select className="px-3 py-2 border rounded-lg text-sm" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              <option value="date_desc">Default</option>
              <option value="date_asc">Date Asc</option>
              <option value="vendor_asc">Vendor A→Z</option>
              <option value="vendor_desc">Vendor Z→A</option>
              <option value="total_desc">Total High→Low</option>
              <option value="total_asc">Total Low→High</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm w-72"
              placeholder="PO number, vendor, date"
            />
          </div>
        </div>

        {!hideHeader && (
          <div className="text-center mt-4">
            <div className="text-xs text-gray-600">Accrual Basis</div>
            <div className="text-lg font-semibold text-gray-900">Purchase Orders by Vendor</div>
            <div className="text-sm text-gray-700">{formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}</div>
          </div>
        )}

        <div className="mt-4 border rounded-lg">
          {grouped.map((section) => (
            <div key={section.vendor} className="border-b">
              <div className="overflow-auto">
                <table className="min-w-[1100px] w-full table-fixed border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: widths[0] }}>
                        Date
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(0, e)}></div>
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: widths[1] }}>
                        P.O. No.
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(1, e)}></div>
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: widths[2] }}>
                        Vendor
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(2, e)}></div>
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: widths[3] }}>
                        Items
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(3, e)}></div>
                      </th>
                      <th className="px-3 py-2 pr-6 text-xs text-gray-700 text-right border-b relative" style={{ width: widths[4] }}>
                        Total
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(4, e)}></div>
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-center border-b relative" style={{ width: widths[5] }}>
                        Status
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(5, e)}></div>
                      </th>
                      <th className="px-3 py-2 text-xs text-gray-700 text-center border-b relative" style={{ width: widths[6] }}>
                        Action
                        <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e) => onMouseDown(6, e)}></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.list.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="px-3 py-2 text-sm text-gray-800" style={{ width: widths[0] }}>
                          {formatDisplayDate(p.date)}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-800" style={{ width: widths[1] }}>
                          <button className="underline text-blue-700" onClick={() => openPurchase(p.id)}>
                            {p.lpoNumber || '—'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-800" style={{ width: widths[2] }}>
                          {p.supplierName || '—'}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-800" style={{ width: widths[3] }}>
                          {(Array.isArray(p.items) ? p.items.length : 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 pr-6 text-sm text-right text-gray-800" style={{ width: widths[4] }}>
                          {(Number(p.total) || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-sm text-center" style={{ width: widths[5] }}>
                          <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">Open</span>
                        </td>
                        <td className="px-3 py-2 text-sm text-center" style={{ width: widths[6] }}>
                          <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700" onClick={() => openPurchase(p.id)}>
                            Open
                          </button>
                          {canDeleteRecords() && !p.persisted ? (
                            <button data-delete-trigger="true" className="ml-2 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50" onClick={() => deletePurchase(p.id)}>
                              <span className="inline-flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </span>
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td className="px-3 py-2 text-sm font-semibold text-gray-900" colSpan={4}>
                        Total Amount
                      </td>
                      <td className="px-3 py-2 pr-6 text-sm font-semibold text-right text-gray-900">{section.total.toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm"></td>
                      <td className="px-3 py-2 text-sm"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {grouped.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-600">
              <div>No records for selected period</div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100"
                  onClick={() => {
                    setFromDate('1970-01-01');
                    setToDate('2999-12-31');
                  }}
                >
                  Show All Dates
                </button>
                <button className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={() => navigate('/purchases')}>
                  Go to Purchase Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseHistory;
