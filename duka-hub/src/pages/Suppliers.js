import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MoreVertical, Printer, Upload } from 'lucide-react';
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
    void safeJsonParse;
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
const setStoredJson = (key, value) => Promise.resolve(localStore.set(key, value));
const supplierIdFromName = (name) => {
  const s = String(name || '').trim().toLowerCase();
  if (!s) return '';
  return s.replace(/\s+/g, '_').replace(/[^a-z0-9_]+/g, '').slice(0, 60) || s.slice(0, 60);
};
const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('vendor_asc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    const load = () => {
      Promise.resolve()
        .then(async () => {
          const [savedSuppliers, purchaseOrders] = await Promise.all([
            suppliersApi.list(),
            purchasesApi.list()
          ]);
          if (!alive) return;
          const stored = Array.isArray(savedSuppliers) ? savedSuppliers : [];
          const orders = Array.isArray(purchaseOrders) ? purchaseOrders : [];
          const ordersWithSupplierId = orders.map((p) => ({ ...p, supplierId: p?.supplierId || supplierIdFromName(p?.supplierName) }));
          setPurchases(ordersWithSupplierId);

          const byId = new Map(stored.map((s) => [String(s?.id || ''), s]));
          const byName = new Map(stored.map((s) => [String(s?.name || s?.companyName || '').trim().toLowerCase(), s]));
          const derived = Array.from(
            new Map(
              ordersWithSupplierId
                .map((p) => {
                  const supplierName = String(p?.supplierName || '').trim();
                  const supplierId = String(p?.supplierId || supplierIdFromName(supplierName));
                  return supplierName ? [supplierId || supplierIdFromName(supplierName), { supplierId, supplierName }] : null;
                })
                .filter(Boolean)
            ).values()
          )
            .filter(({ supplierId, supplierName }) => {
              const normalizedName = String(supplierName || '').trim().toLowerCase();
              return !byId.has(String(supplierId || '')) && !byName.has(normalizedName);
            })
            .map(({ supplierId, supplierName }) => {
              const nm = String(supplierName || '').trim();
              const id = String(supplierId || supplierIdFromName(nm));
              const prev = byId.get(id) || byName.get(nm.toLowerCase()) || null;
              return {
                id,
                name: nm,
                companyName: nm,
                email: prev?.email || '',
                phone: prev?.phone || '',
                openingBalance: prev?.openingBalance ?? 0,
                inactive: Boolean(prev?.inactive),
                persisted: Boolean(prev?.persisted)
              };
            });
          const mergedSuppliers = [...stored, ...derived].sort((left, right) => {
            return String(left?.name || left?.companyName || '').localeCompare(String(right?.name || right?.companyName || ''));
          });
          setSuppliers(mergedSuppliers);
        })
        .catch(() => {});
    };
    load();
    window.addEventListener('dataUpdated', load);
    return () => {
      alive = false;
      window.removeEventListener('dataUpdated', load);
    };
  }, []);
  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest('[data-supplier-menu]')) setOpenMenuId(null);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const supplierStats = useMemo(() => {
    const map = new Map();
    (purchases || []).forEach((p) => {
      const key = String(p?.supplierId || supplierIdFromName(p?.supplierName) || '');
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { poCount: 0, total: 0, lastDate: '' });
      }
      const s = map.get(key);
      s.poCount += 1;
      s.total += Number(p?.total) || 0;
      const d = String(p?.date || '');
      if (d && (!s.lastDate || d > s.lastDate)) s.lastDate = d;
    });
    return map;
  }, [purchases]);

  const rows = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    const list = (suppliers || []).map((s) => {
      const stat = supplierStats.get(String(s.id)) || { poCount: 0, total: 0, lastDate: '' };
      const opening = Number(s?.openingBalance) || 0;
      const openBalance = opening + stat.total;
      return {
        ...s,
        poCount: stat.poCount,
        purchasedTotal: stat.total,
        lastPurchaseDate: stat.lastDate,
        openBalance
      };
    }).filter((s) => {
      if (!q) return true;
      return (
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.companyName || '').toLowerCase().includes(q) ||
        String(s.email || '').toLowerCase().includes(q) ||
        String(s.phone || '').toLowerCase().includes(q)
      );
    });

    const sorted = list.slice().sort((a, b) => {
      switch (sortKey) {
        case 'vendor_desc':
          return String(b.name || '').localeCompare(String(a.name || ''));
        case 'balance_desc':
          return (Number(b.openBalance) || 0) - (Number(a.openBalance) || 0);
        case 'balance_asc':
          return (Number(a.openBalance) || 0) - (Number(b.openBalance) || 0);
        case 'po_desc':
          return (Number(b.poCount) || 0) - (Number(a.poCount) || 0);
        case 'po_asc':
          return (Number(a.poCount) || 0) - (Number(b.poCount) || 0);
        case 'vendor_asc':
        default:
          return String(a.name || '').localeCompare(String(b.name || ''));
      }
    });

    return sorted;
  }, [suppliers, supplierStats, search, sortKey]);

  const selectionLabel = useMemo(() => {
    if (selectedIds.length === 0) return 'All vendors';
    if (selectedIds.length === 1) {
      const s = (suppliers || []).find((x) => String(x.id) === String(selectedIds[0]));
      return s?.name || 'Selected vendor';
    }
    return `${selectedIds.length} vendors selected`;
  }, [selectedIds, suppliers]);

  const metrics = useMemo(() => {
    const selectedSet = new Set((selectedIds || []).map(String));
    const list = selectedSet.size
      ? (purchases || []).filter((p) => selectedSet.has(String(p?.supplierId || '')))
      : (purchases || []);
    const purchaseOrderCount = list.length;
    const openBills = purchaseOrderCount;
    const overdue = 0;
    const paidLast30 = list.filter((p) => {
      const status = String(p?.status || '').toLowerCase();
      if (status !== 'paid') return false;
      const d = new Date(p?.date || '');
      if (isNaN(d)) return false;
      const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;
    return { purchaseOrderCount, overdue, openBills, paidLast30 };
  }, [purchases, selectedIds]);

  const goToSelectedPurchaseHistory = () => {
    if (selectedIds.length === 1) {
      navigate(`/purchases/history?vendorId=${encodeURIComponent(String(selectedIds[0]))}`);
      return;
    }
    if (selectedIds.length > 1) {
      navigate(`/purchases/history?vendorIds=${encodeURIComponent(selectedIds.map(String).join(','))}`);
      return;
    }
    navigate('/purchases/history');
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => String(r.id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const setSupplierInactive = (supplierId, inactive) => {
    (async () => {
      try {
        const updated = await suppliersApi.patch(supplierId, { inactive: !!inactive });
        setSuppliers((prev) => (Array.isArray(prev) ? prev.map((s) => (String(s.id) === String(supplierId) ? { ...s, ...updated } : s)) : prev));
        setFeedback(inactive ? 'Supplier marked inactive' : 'Supplier marked active');
        window.setTimeout(() => setFeedback(''), 2200);
      } catch (error) {
        setFeedback(String(error?.message || 'Failed to update supplier'));
        window.setTimeout(() => setFeedback(''), 2600);
      } finally {
        setOpenMenuId(null);
      }
    })();
  };

  const createBillForSupplier = (supplierId) => {
    navigate(`/purchases?vendorId=${encodeURIComponent(String(supplierId))}`);
  };

  return (
    <div className="space-y-6">
      {feedback ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {feedback}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">Showing: <span className="font-medium text-gray-900">{selectionLabel}</span></div>
        {selectedIds.length > 0 && (
          <button type="button" className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={() => setSelectedIds([])}>
            Clear selection
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <button type="button" className="rounded-lg overflow-hidden border border-gray-200 bg-blue-600 text-white px-4 py-3 text-left" onClick={goToSelectedPurchaseHistory}>
          <div className="text-2xl font-semibold">{metrics.purchaseOrderCount}</div>
          <div className="text-xs opacity-90 mt-1">PURCHASE ORDER</div>
        </button>
        <div className="rounded-lg overflow-hidden border border-gray-200 bg-orange-500 text-white px-4 py-3">
          <div className="text-2xl font-semibold">{metrics.overdue}</div>
          <div className="text-xs opacity-90 mt-1">OVERDUE</div>
        </div>
        <button type="button" className="rounded-lg overflow-hidden border border-gray-200 bg-gray-500 text-white px-4 py-3 text-left" onClick={goToSelectedPurchaseHistory}>
          <div className="text-2xl font-semibold">{metrics.openBills}</div>
          <div className="text-xs opacity-90 mt-1">OPEN BILLS</div>
        </button>
        <div className="rounded-lg overflow-hidden border border-gray-200 bg-green-600 text-white px-4 py-3">
          <div className="text-2xl font-semibold">{metrics.paidLast30}</div>
          <div className="text-xs opacity-90 mt-1">PAID LAST 30 DAYS</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-80"
                placeholder="Search"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-700">Sort</span>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="vendor_asc">Vendor A-Z</option>
                <option value="vendor_desc">Vendor Z-A</option>
                <option value="po_desc">Purchase Orders High-Low</option>
                <option value="po_asc">Purchase Orders Low-High</option>
                <option value="balance_desc">Open Balance High-Low</option>
                <option value="balance_asc">Open Balance Low-High</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
            </button>
            <button type="button" className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100">
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={toggleSelectAll} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Orders</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Open Balance</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((s) => (
                <tr key={s.id} className={s.inactive ? 'opacity-60' : ''}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input type="checkbox" checked={selectedIds.includes(String(s.id))} onChange={() => toggleSelectOne(String(s.id))} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{s.name || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.companyName || s.name || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.phone || s.mobile || s.workPhone || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{s.email || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{Number(s.poCount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">TZS {(Number(s.openBalance) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="relative inline-flex items-center gap-2" data-supplier-menu>
                      <button
                        type="button"
                        className="text-sm text-blue-700 hover:underline"
                        onClick={() => createBillForSupplier(s.id)}
                      >
                        Create bill
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-gray-100"
                        onClick={() => setOpenMenuId((prev) => (prev === s.id ? null : s.id))}
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>
                      {openMenuId === s.id && (
                        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow w-56 z-50">
                          <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => createBillForSupplier(s.id)}>
                            Create bill
                          </button>
                          <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => navigate(`/purchases?vendorId=${encodeURIComponent(String(s.id))}`)}>
                            Create purchase order
                          </button>
                          <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => navigate(`/purchases/history?vendorId=${encodeURIComponent(String(s.id))}`)}>
                            View purchase history
                          </button>
                          <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm" onClick={() => navigate('/expenses')}>
                            Create expense
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                            onClick={() => setSupplierInactive(s.id, !s.inactive)}
                          >
                            {s.inactive ? 'Make active' : 'Make inactive'}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-gray-600" colSpan={8}>
                    No suppliers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Suppliers;
