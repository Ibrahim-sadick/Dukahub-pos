import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MoreVertical, Printer, Upload } from 'lucide-react';
const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('vendor_asc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('suppliers') || '[]');
    setSuppliers(saved);
    try {
      const savedPurchases = JSON.parse(localStorage.getItem('purchases') || '[]');
      setPurchases(Array.isArray(savedPurchases) ? savedPurchases : []);
    } catch {
      setPurchases([]);
    }
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
      const key = String(p?.supplierId || '');
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
    const next = (suppliers || []).map((s) => (String(s.id) === String(supplierId) ? { ...s, inactive: !!inactive } : s));
    localStorage.setItem('suppliers', JSON.stringify(next));
    setSuppliers(next);
    setOpenMenuId(null);
  };

  const createBillForSupplier = (supplierId) => {
    navigate(`/purchases?vendorId=${encodeURIComponent(String(supplierId))}`);
  };

  return (
    <div className="space-y-6">
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
