/* eslint-disable no-undef */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  // eslint-disable-next-line no-unused-vars
  Lightbulb,
  ClipboardList,
  HandCoins,
  Building2,
  Scale,
  BadgeCheck,
  Rocket,
  FileText,
  Truck,
  PackageCheck,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ArrowDown
} from 'lucide-react';
import { formatDisplayDate } from '../utils/date';
import { UNIT_OPTIONS } from '../utils/units';
import DateInput from '../shared/DateInput';
import SalesOrderPrint from '../shared/SalesOrderPrint';
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal';
import SystemPreferences from './SystemPreferences';
import { canDeleteRecords } from '../utils/deletePassword';
import { downloadCsvFile, printWithTitle } from '../utils/reportActions';
import SalesReport from './reports/SalesReport';
import ExpensesReport from './reports/ExpensesReport';
import PurchaseReport from './reports/PurchaseReport';

export default function Placeholder() {
  const { page } = useParams();
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try {
      const local = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (local) return local;
    } catch {}
    try {
      const session = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      if (session) return session;
    } catch {}
    return null;
  }, []);
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const canDelete = canDeleteRecords();
  const restrictedForStaff = !isAdmin && (String(page || '') === 'settings-preferences' || String(page || '').startsWith('reports-') || String(page || '') === 'system-logs');
  const lockedForAll = [
    'accounting',
    'income-overview',
    'expense-overview',
    'stock-value',
    'period-closing',
    'audit-trail',
    'banking',
    'banking-accounts',
    'banking-transfers',
    'banking-reconciliation',
    'alerts-expiry',
    'reports-inventory',
    'reports-kpis',
    'integrations',
    'integration-mobile-money',
    'integration-sms',
    'integration-export'
  ].includes(String(page || ''));
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
  }, []);

  if (lockedForAll) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-300 rounded-xl p-6">
          <div className="text-lg font-semibold text-gray-900">Access denied</div>
          <div className="text-sm text-gray-600 mt-1">This module is locked and cannot be accessed.</div>
          <div className="mt-4">
            <button className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (restrictedForStaff) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-300 rounded-xl p-6">
          <div className="text-lg font-semibold text-gray-900">Access denied</div>
          <div className="text-sm text-gray-600 mt-1">You do not have permission to access this module.</div>
          <div className="mt-4">
            <button className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const NotAvailable = ({ forBusiness }) => (
    <div className="bg-white border border-red-200 rounded-xl p-6">
      <div className="text-sm font-semibold text-red-700">Not available</div>
      <div className="text-xs text-red-600 mt-1">This module is only available for {forBusiness} business type.</div>
    </div>
  );

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

  const LowStockAlerts = () => {
    const businessId = React.useMemo(() => {
      const role = String(currentUser?.role || '').toLowerCase();
      if (role === 'staff') return String(currentUser?.businessId || '');
      return String(currentUser?.id || '');
    }, []);
    const prefsKey = React.useMemo(() => `systemPreferences:${businessId || 'default'}`, [businessId]);
    const prefs = React.useMemo(() => {
      try {
        return JSON.parse(localStorage.getItem(prefsKey) || 'null') || null;
      } catch {
        return null;
      }
    }, [prefsKey]);
    const defaultMin = React.useMemo(() => {
      const raw = String(prefs?.inventory?.defaultReorderLevel || '10').trim();
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : 10;
    }, [prefs]);
    const [query, setQuery] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('all');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [refreshing, setRefreshing] = React.useState(false);
    const [markAllLoading, setMarkAllLoading] = React.useState(false);
    const [nonce, setNonce] = React.useState(0);
    const toNumber = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    };
    const data = React.useMemo(() => {
      void nonce;
      const qtyByName = new Map();
      const unitByName = new Map();
      const minByName = new Map();
      const categoryByName = new Map();
      const priceByName = new Map();
      try {
        const items = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
        (Array.isArray(items) ? items : []).forEach((it) => {
          const name = String(it?.name || '').trim();
          if (!name) return;
          unitByName.set(name, String(it?.unit || '').trim());
          const category = String(it?.category || it?.itemType || 'general').trim() || 'general';
          categoryByName.set(name, category);
          const price = toNumber(it?.buyingPrice ?? it?.buyPrice ?? it?.costPrice ?? it?.price);
          if (price) priceByName.set(name, price);
          const minRaw = parseInt(String(it?.reorderLevel || '').trim(), 10);
          if (Number.isFinite(minRaw) && minRaw > 0) minByName.set(name, minRaw);
        });
      } catch {}
      try {
        Object.keys(localStorage || {}).forEach((k) => {
          if (!/^stockIn_/.test(k)) return;
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          (Array.isArray(list) ? list : []).forEach((r) => {
            const name = String(r?.itemName || r?.name || '').trim();
            if (!name) return;
            const qty = toNumber(r?.quantity);
            qtyByName.set(name, (qtyByName.get(name) || 0) + qty);
            if (r?.unit && !unitByName.get(name)) unitByName.set(name, String(r.unit));
            if (r?.category && !categoryByName.get(name)) categoryByName.set(name, String(r.category));
            const p = toNumber(r?.pricePerItem || r?.price);
            if (p && !priceByName.get(name)) priceByName.set(name, p);
          });
        });
        Object.keys(localStorage || {}).forEach((k) => {
          if (!/^stockOut_/.test(k)) return;
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          (Array.isArray(list) ? list : []).forEach((r) => {
            const name = String(r?.itemName || r?.name || '').trim();
            if (!name) return;
            const qty = toNumber(r?.quantity);
            qtyByName.set(name, (qtyByName.get(name) || 0) - qty);
          });
        });
      } catch {}
      const entries = Array.from(qtyByName.entries()).map(([name, qty]) => {
        const minLevel = minByName.get(name) || defaultMin;
        const percent = minLevel > 0 ? Math.round(Math.max(0, Math.min(100, (qty / minLevel) * 100))) : 0;
        const status = qty <= minLevel ? 'critical' : qty <= Math.ceil(minLevel * 1.5) ? 'warning' : 'ok';
        const price = priceByName.get(name) || 0;
        const reorderQty = qty < minLevel ? Math.max(0, Math.ceil(minLevel - qty)) : 0;
        const reorderValue = reorderQty * price;
        return {
          name,
          unit: unitByName.get(name) || '',
          category: categoryByName.get(name) || 'general',
          price,
          qty: Math.max(0, Math.round(qty)),
          minLevel,
          percent,
          status,
          reorderQty,
          reorderValue
        };
      });
      const filtered = entries
        .filter((e) => !query || e.name.toLowerCase().includes(query.toLowerCase()))
        .filter((e) => categoryFilter === 'all' ? true : String(e.category || 'general') === String(categoryFilter))
        .filter((e) => statusFilter === 'all' ? true : e.status === statusFilter)
        .sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
      const critical = filtered.filter((e) => e.status === 'critical');
      const warning = filtered.filter((e) => e.status === 'warning');
      const ok = filtered.filter((e) => e.status === 'ok');
      const reorderTotal = critical.reduce((s, e) => s + e.reorderValue, 0);
      const categories = Array.from(new Set(entries.map((e) => String(e.category || 'general')))).sort((a, b) => a.localeCompare(b));
      return { filtered, critical, warning, ok, reorderTotal, categories };
    }, [defaultMin, nonce, query, categoryFilter, statusFilter]);
    const money = (n) => {
      const v = Number(n || 0);
      try {
        return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);
      } catch {
        return String(v.toFixed ? v.toFixed(2) : v);
      }
    };
    const onRefresh = () => {
      setRefreshing(true);
      setNonce((n) => n + 1);
      setTimeout(() => setRefreshing(false), 800);
    };
    const exportCSV = () => {
      const rows = [
        ['Product', 'Category', 'Unit', 'Qty', 'MinLevel', 'Status', 'LevelPct', 'ReorderQty', 'UnitPrice', 'ReorderValue']
      ];
      data.filtered.forEach((e) => {
        rows.push([e.name, e.category || '', e.unit || '', String(e.qty), String(e.minLevel), e.status, String(e.percent), String(e.reorderQty || 0), String(e.price || 0), String(e.reorderValue || 0)]);
      });
      const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'low_stock_alerts.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    const markAllRead = () => {
      setMarkAllLoading(true);
      setTimeout(() => {
        const ts = new Date().toISOString();
        try {
          localStorage.setItem('lowStockAlertsReadAt', ts);
        } catch {}
        setMarkAllLoading(false);
      }, 600);
    };
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-gray-500">Notifications <span className="mx-1">›</span> Low Stock Alerts</div>
            <div className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">Low Stock Alerts</div>
            <div className="text-sm text-gray-600">{data.critical.length + data.warning.length + data.ok.length} items are below minimum required level</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={markAllLoading ? 'px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold cursor-not-allowed' : 'px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50'} onClick={markAllRead} disabled={markAllLoading}>
              {markAllLoading ? 'Marking…' : '✓ Mark All Read'}
            </button>
            <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 flex items-center gap-2" onClick={exportCSV}>
              <span className="inline-flex w-4 h-4 items-center justify-center"><svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M12 3v12l4-4h-3V3h-2v8H8l4 4zm-7 8v7h14v-7h2v9H3v-9h2z"/></svg></span>
              Export
            </button>
            <button type="button" className={refreshing ? 'px-4 py-2 rounded-xl bg-green-600/80 text-white text-sm font-semibold flex items-center gap-2 cursor-not-allowed' : 'px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 flex items-center gap-2'} onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" /> : <span className="w-4 h-4 rounded-full border-2 border-white/60" style={{ borderTopColor: 'transparent' }} />}
              Refresh
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="text-xs font-semibold text-red-700">CRITICAL</div>
            <div className="mt-2 text-3xl font-extrabold text-red-700">{data.critical.length}</div>
            <div className="text-xs text-red-700 mt-1">Need immediate reorder</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-semibold text-amber-700">WARNING</div>
            <div className="mt-2 text-3xl font-extrabold text-amber-700">{data.warning.length}</div>
            <div className="text-xs text-amber-700 mt-1">Order soon</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-semibold text-emerald-700">ITEMS OK</div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-700">{data.ok.length}</div>
            <div className="text-xs text-emerald-700 mt-1">Well-stocked</div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-xs font-semibold text-blue-700">REORDER VALUE</div>
            <div className="mt-2 text-3xl font-extrabold text-blue-700">TZS {money(data.reorderTotal)}</div>
            <div className="text-xs text-blue-700 mt-1">Estimated total cost</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <select className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="ok">OK</option>
              </select>
              
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search product..."
                className="w-60 pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="mt-3 overflow-auto">
            <div className="min-w-[880px]">
              <div className="grid grid-cols-[minmax(0,1fr)_160px_160px_140px_140px] px-3 py-2 text-[13px] text-gray-700 font-semibold">
                <div>Product</div>
                <div>Category</div>
                <div>Stock Level</div>
                <div>Current / Min</div>
                <div>Status</div>
              </div>
              <div className="divide-y divide-gray-100">
                {data.filtered.length ? (
                  data.filtered.map((it) => (
                    <div key={it.name} className="px-3 py-3 grid grid-cols-[minmax(0,1fr)_160px_160px_140px_140px] items-center gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <span className="shrink-0 w-9 h-9 rounded-lg bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-700 text-xs font-bold">
                          {String(it.name || 'P').slice(0,1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{it.name}</div>
                          <div className="text-xs text-gray-600">{it.unit || 'unit'}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 truncate">{it.category || 'general'}</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className={it.status === 'critical' ? 'h-2 bg-red-500' : it.status === 'warning' ? 'h-2 bg-amber-500' : 'h-2 bg-emerald-500'} style={{ width: `${Math.max(0, Math.min(100, it.percent))}%` }} />
                        </div>
                        <div className="text-xs text-gray-700 w-10 text-right">{it.percent}%</div>
                      </div>
                      <div className="text-sm">
                        <span className={it.qty <= it.minLevel ? 'text-red-600 font-semibold' : 'text-gray-900 font-medium'}>{it.qty}</span>
                        <span className="text-gray-500"> / {it.minLevel} {it.unit ? String(it.unit).toLowerCase() : 'units'}</span>
                      </div>
                      <div>
                        <span className={it.status === 'critical' ? 'px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold' : it.status === 'warning' ? 'px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold' : 'px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold'}>
                          {it.status === 'critical' ? 'Critical' : it.status === 'warning' ? 'Warning' : 'OK'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-sm text-gray-600 text-center">No items match</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PaymentDueAlerts = () => {
    const [q, setQ] = useState('');
    const [planFilter, setPlanFilter] = useState('all');
    const [unsubLoading, setUnsubLoading] = useState(false);
    const [showUnsub, setShowUnsub] = useState(false);
    const [unsubDesc, setUnsubDesc] = useState('');
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
        return JSON.parse(localStorage.getItem('currentUser') || 'null') || JSON.parse(sessionStorage.getItem('currentUser') || 'null');
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
          const ci = JSON.parse(localStorage.getItem('companyInfo') || '{}') || {};
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
    const formatTs = (iso) => {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
      } catch {
        return iso;
      }
    };
    const buildInvoiceHtml = (rec) => {
      const safe = (v) => String(v == null ? '' : v);
      const esc = (s) =>
        safe(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      const ci = (() => {
        try {
          return JSON.parse(localStorage.getItem('companyInfo') || '{}') || {};
        } catch {
          return {};
        }
      })();
      const companyName = esc(ci.companyName || ci.name || 'Dukahub');
      const companyEmail = esc(ci.email || '');
      const invoiceId = esc(rec.id || 'RECEIPT');
      const planName = esc(rec.planTitle || rec.planId || '');
      const provider = esc(rec.provider || '');
      const phone = esc(rec.phone || '');
      const amount = esc(`TSh ${toMoney(rec.amount)}`);
      const paidAt = esc(formatTs(rec.paidAt));
      const endsAt = esc(formatTs(rec.endsAt));
      const period = esc(rec.period || '');
      const months = esc(rec.months || '');
      const issuedAt = esc(formatTs(new Date().toISOString()));
      const receiptTitle = 'Receipt from Dukahub';
      return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(receiptTitle)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #111827; }
      .bg { min-height: 100vh; padding: 28px; background: #0ea5e9; }
      .sheet { max-width: 760px; margin: 0 auto; }
      .card { background: #fff; border: 2px solid rgba(59,130,246,.35); border-radius: 14px; overflow: hidden; }
      .card + .card { margin-top: 18px; }
      .p { padding: 18px 20px; }
      .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
      .title { font-size: 14px; font-weight: 700; color: #111827; }
      .amount { font-size: 34px; font-weight: 900; letter-spacing: -0.02em; margin-top: 6px; }
      .muted { color: #64748b; font-size: 12px; margin-top: 4px; }
      .chip { width: 56px; height: 44px; border-radius: 10px; border: 1px solid #e5e7eb; background: linear-gradient(135deg, #f8fafc, #eef2ff); }
      .hr { height: 1px; background: #e5e7eb; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; margin-top: 14px; }
      .k { font-size: 12px; color: #64748b; }
      .v { font-size: 12px; font-weight: 700; color: #111827; text-align: right; }
      .left { text-align: left; }
      .sectionTitle { font-size: 13px; font-weight: 800; color: #111827; }
      .row { display: flex; justify-content: space-between; gap: 14px; }
      .row + .row { margin-top: 8px; }
      .line { height: 1px; background: #e5e7eb; margin: 12px 0; }
      .foot { font-size: 11px; color: #64748b; padding: 14px 20px; }
      .foot a { color: #2563eb; text-decoration: none; font-weight: 700; }
      @media print {
        .bg { background: #fff; padding: 0; }
        .card { border-color: #e5e7eb; }
      }
    </style>
  </head>
  <body>
    <div class="bg">
      <div class="sheet">
        <div class="card">
          <div class="p">
            <div class="top">
              <div>
                <div class="title">${esc(receiptTitle)}</div>
                <div class="amount">${amount}</div>
                <div class="muted">Paid ${paidAt}</div>
              </div>
              <div class="chip" aria-hidden="true"></div>
            </div>
          </div>
          <div class="hr"></div>
          <div class="p">
            <div class="grid2">
              <div class="k left">Receipt number</div><div class="v">${invoiceId}</div>
              <div class="k left">Invoice number</div><div class="v">${invoiceId}</div>
              <div class="k left">Payment method</div><div class="v">${provider || '—'}${phone ? ` - ${phone}` : ''}</div>
              <div class="k left">Issued</div><div class="v">${issuedAt}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="p">
            <div class="sectionTitle">Receipt #${invoiceId}</div>
            <div class="muted" style="margin-top:6px;">${paidAt} — ${endsAt}</div>
            <div class="line"></div>
            <div class="row">
              <div style="font-size:13px; font-weight:800;">${planName || 'Subscription'}</div>
              <div style="font-size:13px; font-weight:800;">${amount}</div>
            </div>
            <div class="muted">Period: ${period || '—'} ${months ? `(${months} month(s))` : ''}</div>
            <div class="line"></div>
            <div class="row">
              <div class="k left">Total</div>
              <div class="v">${amount}</div>
            </div>
            <div class="row">
              <div class="k left">Amount paid</div>
              <div class="v">${amount}</div>
            </div>
          </div>
          <div class="hr"></div>
          <div class="foot">
            Questions? Contact us at ${companyEmail ? `<a href="mailto:${companyEmail}">${companyEmail}</a>` : `<span>${companyName}</span>`}
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
    };

    const downloadInvoice = (rec) => {
      const html = buildInvoiceHtml(rec);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.srcdoc = html;
      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch {}
        setTimeout(() => {
          try {
            iframe.remove();
          } catch {}
        }, 800);
      };
      document.body.appendChild(iframe);
    };
    const planTypeLabel = (id) => {
      const s = String(id || '').trim();
      if (!s) return '—';
      return s.charAt(0).toUpperCase() + s.slice(1);
    };
    const companyInfo = (() => {
      try {
        return JSON.parse(localStorage.getItem('companyInfo') || '{}') || {};
      } catch {
        return {};
      }
    })();
    const currentPlanId = String(companyInfo.subscriptionPlan || '').trim();
    React.useEffect(() => {
      if (currentPlanId) {
        setPlanFilter(currentPlanId.toLowerCase());
      }
    }, [currentPlanId]);
    const billingFiltered = useMemo(() => {
      const ql = (q || '').trim().toLowerCase();
      let arr = billingHistory.slice();
      if (planFilter !== 'all') {
        arr = arr.filter((r) => String(r.planId || r.planTitle || '').toLowerCase() === String(planFilter));
      }
      if (ql) {
        arr = arr.filter((r) => {
          const hay = [r.planTitle, r.planId, r.amount, r.paidAt, r.endsAt].map((x) => String(x || '').toLowerCase()).join(' ');
          return hay.includes(ql);
        });
      }
      arr.sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
      return arr;
    }, [billingHistory, planFilter, q]);
    const openUnsubscribe = () => {
      const latest = (billingFiltered && billingFiltered[0]) || (billingHistory && billingHistory[0]) || null;
      const lines = [];
      if (latest) {
        lines.push(`Plan: ${planTypeLabel(latest.planId || latest.planTitle)}`);
        if (latest.amount !== undefined) lines.push(`Last Amount: TSh ${toMoney(latest.amount)}`);
        if (latest.paidAt) lines.push(`Paid At: ${formatTs(latest.paidAt)}`);
        if (latest.endsAt) lines.push(`Ending: ${formatTs(latest.endsAt)}`);
        if (latest.provider) lines.push(`Provider: ${latest.provider}`);
        if (latest.phone) lines.push(`Phone: ${latest.phone}`);
      } else {
        lines.push('Current plan details not found.');
      }
      setUnsubDesc(lines.join(' • '));
      setShowUnsub(true);
    };
    const unsubscribePlan = () => {
      if (unsubLoading) return;
      setUnsubLoading(true);
      setTimeout(() => {
        try {
          const userLocal = JSON.parse(localStorage.getItem('currentUser') || 'null');
          const userSession = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
          const user = userLocal || userSession || null;
          if (user) {
            const nextUser = {
              ...user,
              subscriptionPlan: '',
              subscriptionUserLimit: 0,
              subscriptionPrice: 0,
              subscriptionPricePerMonth: 0,
              subscriptionPeriod: '',
              subscriptionMonths: 0,
              subscriptionDiscountPercent: 0,
              subscriptionTrialDays: 0,
              subscriptionStartedAt: '',
              subscriptionEndsAt: '',
              subscriptionTrialEndsAt: '',
              subscriptionPaymentStatus: ''
            };
            if (userLocal) localStorage.setItem('currentUser', JSON.stringify(nextUser));
            if (userSession && !userLocal) sessionStorage.setItem('currentUser', JSON.stringify(nextUser));
            try {
              const all = JSON.parse(localStorage.getItem('users') || '[]');
              const list = Array.isArray(all) ? all : [];
              const idx = list.findIndex((u) => String(u?.id || '') === String(nextUser.id || '') && String(u?.role || '').toLowerCase() === 'admin');
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...nextUser };
                localStorage.setItem('users', JSON.stringify(list));
              }
            } catch {}
          }
        } catch {}
        try {
          const existingCompany = JSON.parse(localStorage.getItem('companyInfo') || '{}');
          const updatedCompany = {
            ...existingCompany,
            subscriptionPlan: '',
            subscriptionUserLimit: 0,
            subscriptionPrice: 0,
            subscriptionPricePerMonth: 0,
            subscriptionPeriod: '',
            subscriptionMonths: 0,
            subscriptionDiscountPercent: 0,
            subscriptionTrialDays: 0,
            subscriptionStartedAt: '',
            subscriptionEndsAt: '',
            subscriptionTrialEndsAt: '',
            subscriptionPaymentStatus: ''
          };
          localStorage.setItem('companyInfo', JSON.stringify(updatedCompany));
          try {
            window.dispatchEvent(new CustomEvent('companyInfoUpdated'));
          } catch {}
        } catch {}
        setUnsubLoading(false);
        setShowUnsub(false);
        setNonce((n) => n + 1);
      }, 600);
    };
    return (
      <div className="space-y-6">
        <ConfirmDeleteModal
          open={showUnsub}
          title="Unsubscribe Plan?"
          description={unsubDesc || 'This will remove your active subscription.'}
          confirmText="Unsubscribe"
          cancelText="No"
          loading={unsubLoading}
          onCancel={() => (unsubLoading ? null : setShowUnsub(false))}
          onConfirm={unsubscribePlan}
        />
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-gray-900">Billing History</div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-sm">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search plan, date…"
                  className="w-56 bg-transparent outline-none"
                />
              </div>
              <div className="inline-flex items-center gap-2">
                {['all', 'starter', 'professional', 'enterprise'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlanFilter(p)}
                    className={
                      planFilter === p
                        ? 'px-3 py-1.5 rounded-full bg-green-600 text-white text-xs font-semibold'
                        : 'px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs hover:bg-gray-50'
                    }
                  >
                    {p === 'all' ? 'All' : planTypeLabel(p)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 overflow-auto">
            <table className="min-w-[720px] w-full">
              <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-600">
                <tr className="grid grid-cols-[minmax(0,1fr)_120px_140px_200px_200px_240px] px-4 py-2">
                  <th className="text-left">Name</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Amount</th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Ending</th>
                  <th className="text-left">Operation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billingFiltered.map((r) => (
                  <tr key={r.id} className="grid grid-cols-[minmax(0,1fr)_120px_140px_200px_200px_240px] px-4 py-3 items-center">
                    <td className="text-sm text-gray-900">{r.planTitle || r.planId}</td>
                    <td className="text-sm text-gray-900">{planTypeLabel(r.planId || r.planTitle)}</td>
                    <td className="text-sm text-gray-900">TSh {toMoney(r.amount)}</td>
                    <td className="text-sm text-gray-700">{formatTs(r.paidAt)}</td>
                    <td className="text-sm text-gray-700">{formatTs(r.endsAt)}</td>
                    <td className="text-sm">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold"
                        onClick={() => downloadInvoice(r)}
                        data-no-loading="true"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
                {billingFiltered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-sm text-gray-600" colSpan={6}>
                      No billing history found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              className={unsubLoading ? 'px-4 py-2 rounded-xl bg-red-600/70 text-white text-sm cursor-not-allowed' : 'px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700'}
              onClick={openUnsubscribe}
              disabled={unsubLoading}
            >
              {unsubLoading ? 'Unsubscribing…' : 'Unsubscribe Plan'}
            </button>
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
        return localStorage.getItem('usdToTzsRate') || '';
      } catch {
        return '';
      }
    });
    const [customers, setCustomers] = useState([]);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showCustomerMenu, setShowCustomerMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
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
    const [productPickerOpen, setProductPickerOpen] = useState(false);
    const [productQuery, setProductQuery] = useState('');
    const [productCatalog, setProductCatalog] = useState([]);
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
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [paid, setPaid] = useState(false);
    const unitOptions = UNIT_OPTIONS;
    const exchangeRate = useMemo(() => {
      const raw = String(usdRate || '').replace(/,/g, '');
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }, [usdRate]);
    const currencyPrefix = usdEnabled ? 'USD' : 'TSH';
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
    const companyInfo = useMemo(() => {
      try {
        const info = JSON.parse(localStorage.getItem('companyInfo') || '{}');
        return info || {};
      } catch {
        return {};
      }
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
      try {
        const list = JSON.parse(localStorage.getItem('customers') || '[]');
        setCustomers(Array.isArray(list) ? list : []);
      } catch {
        setCustomers([]);
      }
    }, []);
    React.useEffect(() => {
      try {
        const chosen = JSON.parse(localStorage.getItem('selectedCustomerForOrder') || 'null');
        if (chosen) {
          setCustomer({
            name: chosen.name || chosen.company || '',
            email: chosen.mainEmail || chosen.ccEmail || '',
            phone: chosen.mainPhone || chosen.mobile || chosen.workPhone || '',
            billTo: chosen.billTo || chosen.address || '',
            shipTo: chosen.shipTo || chosen.address || ''
          });
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
        try {
          const list = JSON.parse(localStorage.getItem('customers') || '[]');
          setCustomers(Array.isArray(list) ? list : []);
        } catch {
          setCustomers([]);
        }
        try {
          const chosen = JSON.parse(localStorage.getItem('selectedCustomerForOrder') || 'null');
          if (chosen) {
            setCustomer({
              name: chosen.name || chosen.company || '',
              email: chosen.mainEmail || chosen.ccEmail || '',
              phone: chosen.mainPhone || chosen.mobile || chosen.workPhone || '',
              billTo: chosen.billTo || chosen.address || '',
              shipTo: chosen.shipTo || chosen.address || ''
            });
            localStorage.removeItem('selectedCustomerForOrder');
          }
        } catch {}
      };
      window.addEventListener('dataUpdated', handler);
      return () => window.removeEventListener('dataUpdated', handler);
    }, []);
    React.useEffect(() => {
      const load = () => {
        try {
          const list = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
          const arr = Array.isArray(list) ? list : [];
          setProductCatalog(arr);
        } catch {
          setProductCatalog([]);
        }
      };
      load();
      window.addEventListener('dataUpdated', load);
      window.addEventListener('storage', load);
      return () => {
        window.removeEventListener('dataUpdated', load);
        window.removeEventListener('storage', load);
      };
    }, []);
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
            orderNumber: sel.orderNumber || prev.orderNumber,
            orderDate: (sel.orderDate || '').slice(0,10) || prev.orderDate,
            orderTime: timePart || '00:00:00',
            terms: sel.terms || prev.terms,
            invoiceNumber: sel.invoiceNumber || prev.invoiceNumber
          }));
          setPaid((sel.status || '') === 'Paid');
          setPaymentMethod(String(sel.paymentMethod || '').trim() || 'cash');
          setUsdEnabled(Boolean(sel.usdEnabled) || String(sel.currency || '').toUpperCase() === 'USD');
          if (sel.usdRate != null && sel.usdRate !== '') setUsdRate(String(sel.usdRate));
          setCustomer({
            name: sel.name || '',
            email: sel.email || '',
            phone: sel.phone || '',
            billTo: sel.billTo || '',
            shipTo: sel.shipTo || ''
          });
          setItems((sel.items || []).map(it => ({
            item: it.item || '',
            description: it.description || '',
            unit: it.unit || 'try',
            qty: Number(it.qty) || 0,
            rate: Number(it.rate) || 0
          })));
          localStorage.removeItem('selectedOrderForEdit');
        }
      } catch {}
    }, []);
    React.useEffect(() => {
      if (editingOrderId) return;
      const id = window.setInterval(() => {
        setHeader((prev) => ({ ...prev, orderTime: getNowTime() }));
      }, 1000);
      return () => window.clearInterval(id);
    }, [editingOrderId]);
    React.useEffect(() => {
      try {
        localStorage.setItem('salesOrderUsdEnabled', JSON.stringify(Boolean(usdEnabled)));
      } catch {}
    }, [usdEnabled]);
    React.useEffect(() => {
      try {
        localStorage.setItem('usdToTzsRate', String(usdRate || ''));
      } catch {}
    }, [usdRate]);

    const setHeaderField = (k, v) => setHeader(prev => ({ ...prev, [k]: v }));
    const setCustomerField = (k, v) => setCustomer(prev => ({ ...prev, [k]: v }));
    const updateItem = (i, k, v) => {
      setItems(prev => prev.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
    };
    const addItem = () => setItems(prev => [...prev, { item: '', description: '', unit: 'try', qty: 1, rate: 0 }]);
    const addProductToOrder = (product) => {
      const name = String(product?.name || product?.itemName || '').trim();
      if (!name) return;
      const unit = String(product?.unit || '').trim() || 'try';
      const rate = (() => {
        const raw = product?.sellingPrice ?? product?.sellPrice ?? product?.price ?? 0;
        const n = typeof raw === 'number' ? raw : parseFloat(String(raw || '').replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
      })();
      const description = String(product?.description || '').trim();
      setItems((prev) => {
        const next = Array.isArray(prev) ? prev.slice() : [];
        const idx = next.findIndex((r) => !String(r?.item || '').trim());
        const row = { item: name, description, unit, qty: 1, rate };
        if (idx >= 0) next[idx] = { ...next[idx], ...row };
        else next.push(row);
        return next.length ? next : [row];
      });
      setProductPickerOpen(false);
      setProductQuery('');
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
      if (row < 0 || key === 'amount' || clipboard == null) return;
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
    };
    const saveOrder = () => {
      const dateOnly = String(header.orderDate || '').slice(0, 10);
      const timeOnly = (() => {
        const raw = String(header.orderTime || '').trim();
        const m = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (!m) return '00:00:00';
        return `${m[1]}:${m[2]}:${m[3] || '00'}`;
      })();
      const mappedType = activeBusiness === 'meat' ? 'chickens' : 'eggs';
      const orderDateTime = dateOnly ? `${dateOnly}T${timeOnly}` : '';
      const order = {
        id: Date.now(),
        ...header,
        orderDate: dateOnly,
        orderDateTime,
        ...customer,
        paymentMethod,
        itemType: mappedType,
        currency: usdEnabled ? 'USD' : 'TZS',
        usdEnabled: Boolean(usdEnabled),
        usdRate: usdEnabled ? exchangeRate : 0,
        items: items.map(r => {
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
        const existing = JSON.parse(localStorage.getItem('salesOrders') || '[]');
        const applyStockOut = () => {
          if (!paid) return false;
          if (order._stockApplied) return false;
          const key = `stockOut_${mappedType}`;
          const outRaw = JSON.parse(localStorage.getItem(key) || '[]');
          const outList = Array.isArray(outRaw) ? outRaw : [];
          (order.items || []).forEach((it) => {
            const qty = Number(it?.qty) || 0;
            const itemName = String(it?.item || '').trim();
            if (!itemName || qty <= 0) return;
            outList.push({
              id: Date.now() + Math.random(),
              date: String(order.orderDate || '').slice(0, 10),
              quantity: String(qty),
              unit: String(it?.unit || ''),
              reason: 'Sales Order',
              description: `Sales Order ${String(order.orderNumber || '')}`,
              saleOrderId: order.id,
              itemType: mappedType,
              itemName
            });
          });
          localStorage.setItem(key, JSON.stringify(outList));
          return true;
        };
        if (editingOrderId) {
          const idx = existing.findIndex(o => o.id === editingOrderId);
          if (idx >= 0) {
            order.id = editingOrderId;
            order._stockApplied = Boolean(existing[idx]?._stockApplied);
            if (applyStockOut()) order._stockApplied = true;
            existing[idx] = order;
          } else {
            order._stockApplied = false;
            if (applyStockOut()) order._stockApplied = true;
            existing.push(order);
          }
        } else {
          order._stockApplied = false;
          if (applyStockOut()) order._stockApplied = true;
          existing.push(order);
          try {
            const so = parseInt(localStorage.getItem('nextSoNumber') || '1150', 10);
            const inv = parseInt(localStorage.getItem('nextInvoiceNumber') || '1', 10);
            localStorage.setItem('nextSoNumber', String((Number.isFinite(so) ? so : 1150) + 1));
            localStorage.setItem('nextInvoiceNumber', String((Number.isFinite(inv) ? inv : 1) + 1));
          } catch {}
        }
        localStorage.setItem('salesOrders', JSON.stringify(existing));
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}
    };
    const saveAndClose = () => {
      saveOrder();
      navigate('/placeholder/sales-history');
    };
    const saveAndNew = () => {
      saveOrder();
      clearForm();
    };
    const closeForm = () => {
      navigate('/placeholder/sales-history');
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
      setDeleteLoading(true);
      try {
        const currentId = editingOrderId;
        if (currentId) {
          const existing = JSON.parse(localStorage.getItem('salesOrders') || '[]');
          const list = Array.isArray(existing) ? existing : [];
          const next = list.filter((o) => String(o?.id || '') !== String(currentId));
          localStorage.setItem('salesOrders', JSON.stringify(next));
          try {
            localStorage.removeItem('selectedOrderForEdit');
          } catch {}
          try {
            window.dispatchEvent(new CustomEvent('dataUpdated'));
          } catch {}
        }
      } catch {}
      clearForm();
      setDeleteLoading(false);
      setDeleteModalOpen(false);
      navigate('/placeholder/sales-history');
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
        <div className="so-invoice-preview" style={{ display: 'none' }}>
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Sales Order</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2" onClick={()=>window.print()}>
              <Printer size={16} />
              <span className="text-sm">Print</span>
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                const subject = encodeURIComponent(`Sales Order ${header.orderNumber}`);
                const body = encodeURIComponent(`Dear ${customer.name || 'Customer'},\n\nPlease find Sales Order ${header.orderNumber} dated ${header.orderDate}.\nTotal: ${shareTotalText}\n\nThank you.`);
                window.location.href = `mailto:${customer.email || ''}?subject=${subject}&body=${body}`;
              }}
            >
              <Mail size={16} />
              <span className="text-sm">Email</span>
            </button>
            <div className="relative">
              <button
                className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
                onClick={()=>setShowShareMenu(v=>!v)}
              >
                <Share2 size={16} />
                <span className="text-sm">Share</span>
              </button>
              {showShareMenu && (
                <div className="absolute right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow w-52">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    onClick={()=>{
                      const url = window.location.href;
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(url);
                      }
                      setShowShareMenu(false);
                    }}
                  >
                    Copy Link
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    onClick={()=>{
                      const summary = `Sales Order ${header.orderNumber} • Date ${header.orderDate}\nCustomer: ${customer.name || ''}\nTotal: ${shareTotalText}`;
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(summary);
                      }
                      setShowShareMenu(false);
                    }}
                  >
                    Copy Summary
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    onClick={()=>{
                      window.print();
                      const subject = encodeURIComponent(`Sales Order ${header.orderNumber} PDF`);
                      const body = encodeURIComponent(`Please find attached the PDF for Sales Order ${header.orderNumber} dated ${header.orderDate}.\nTotal: ${shareTotalText}\n\n(If the attachment is not added automatically, attach the saved PDF.)`);
                      window.location.href = `mailto:${customer.email || ''}?subject=${subject}&body=${body}`;
                      setShowShareMenu(false);
                    }}
                  >
                    Share as PDF via Email
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    onClick={()=>{
                      window.print();
                      const shareText = `Sales Order ${header.orderNumber} PDF • Date ${header.orderDate} • Total ${shareTotalText}. Please attach the saved PDF.`;
                      const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                      window.open(url, '_blank');
                      setShowShareMenu(false);
                    }}
                  >
                    Share as PDF via WhatsApp
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    onClick={()=>{
                      const shareText = `Sales Order ${header.orderNumber} dated ${header.orderDate}. Total: ${shareTotalText}`;
                      const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                      window.open(url, '_blank');
                      setShowShareMenu(false);
                    }}
                  >
                    Share via WhatsApp
                  </button>
                </div>
              )}
            </div>
            <button
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
              onClick={createCopy}
            >
              <Copy size={16} />
              <span className="text-sm">Create Copy</span>
            </button>
            {canDelete ? (
              <button
                className="px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-2"
                onClick={deleteCurrent}
              >
                <Trash2 size={16} />
                <span className="text-sm">Delete</span>
              </button>
            ) : null}
          </div>
        </div>
        {showShareMenu && <div className="fixed inset-0 z-40" onClick={()=>setShowShareMenu(false)}></div>}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
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
                <div className="w-32">
                  <label className="block text-sm font-semibold text-gray-700 mb-0.5">S.O. No.</label>
                  <input
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                    value={header.orderNumber}
                    maxLength={6}
                    onChange={(e)=>{
                      const digits = e.target.value.replace(/[^\d]/g, '').slice(0,6);
                      setHeaderField('orderNumber', digits);
                    }}
                    placeholder="0000"
                  />
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
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => {
                    setProductPickerOpen(true);
                    setProductQuery('');
                  }}
                >
                  <PackageCheck size={16} />
                  <span className="text-sm">Add Product</span>
                </button>
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
                    return (
                      <tr key={i} className="align-middle">
                      <td className="px-3 py-2 border border-gray-200 text-center select-none">{i + 1}</td>
                      <td className="px-3 py-2 border border-gray-200" onContextMenu={(e)=>showMenu(e,i,'item')}>
                          <input
                          className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none"
                            value={row.item}
                            onChange={(e)=>updateItem(i,'item',e.target.value)}
                            placeholder="Product or service"
                          />
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
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
                          onChange={(e)=>setUsdRate(e.target.value)}
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
          
          <div className="mt-6 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={saveAndClose}>Save & Close</button>
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={saveAndNew}>Save & New</button>
            <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100" onClick={closeForm}>Close</button>
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
                  <span>S.O. No</span>
                  <span className="font-medium text-gray-900">{header.orderNumber || '—'}</span>
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
        {productPickerOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                <div className="text-gray-900 font-semibold">Select Product</div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm"
                  onClick={() => {
                    setProductPickerOpen(false);
                    setProductQuery('');
                  }}
                >
                  Close
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Search product..."
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </div>
                <div className="mt-3 max-h-[60vh] overflow-auto border border-gray-200 rounded-xl">
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
                          return (
                            <button
                              key={String(p?.id || name)}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3"
                              onClick={() => addProductToOrder(p)}
                            >
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{name || '—'}</div>
                                <div className="text-xs text-gray-600">
                                  {unit ? `Unit: ${unit}` : 'Unit: —'} {String(p?.sku || '').trim() ? `• SKU: ${String(p.sku).trim()}` : ''}
                                </div>
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
                              setCustomer({
                                name: c.name || c.company || '',
                                email: c.mainEmail || c.ccEmail || '',
                                phone: c.mainPhone || c.mobile || c.workPhone || '',
                                billTo: c.billTo || c.address || '',
                                shipTo: c.shipTo || c.address || ''
                              });
                              setShowCustomerModal(false);
                            }}
                          >
                            Use
                          </button>
                          <button
                            className="px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 text-xs"
                            onClick={()=>{
                              try {
                                const list = JSON.parse(localStorage.getItem('customers') || '[]');
                                const next = (Array.isArray(list) ? list : []).filter(x => !(
                                  (x.name || '') === (c.name || '') &&
                                  (x.mainEmail || '') === (c.mainEmail || '')
                                ));
                                localStorage.setItem('customers', JSON.stringify(next));
                                setCustomers(next);
                              } catch {}
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
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={()=>{
                  const displayName = newCustomer.company || [newCustomer.prefix, newCustomer.firstName, newCustomer.middle, newCustomer.lastName].filter(Boolean).join(' ');
                  if (!displayName.trim()) return;
                  try {
                    const list = JSON.parse(localStorage.getItem('customers') || '[]');
                    const updated = Array.isArray(list) ? list : [];
                    updated.push({ ...newCustomer, name: displayName });
                    localStorage.setItem('customers', JSON.stringify(updated));
                    setCustomers(updated);
                    setCustomer({
                      name: displayName,
                      email: newCustomer.mainEmail || newCustomer.ccEmail || '',
                      phone: newCustomer.mainPhone || newCustomer.mobile || '',
                      billTo: newCustomer.billTo || newCustomer.address || '',
                      shipTo: newCustomer.defaultShipTo ? (newCustomer.shipTo || newCustomer.billTo || newCustomer.address || '') : (newCustomer.shipTo || '')
                    });
                  } catch {}
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
    React.useEffect(() => {
      try {
        const list = JSON.parse(localStorage.getItem('salesOrders') || '[]');
        setOrders(Array.isArray(list) ? list : []);
      } catch {
        setOrders([]);
      }
    }, [refreshKey]);
    const filteredLines = useMemo(() => {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const rows = [];
      orders.forEach(o => {
        const oDate = new Date(o.orderDate || o.date || '');
        if (isNaN(oDate)) return;
        if (oDate < start || oDate > end) return;
        const isUsd = String(o.currency || '').toUpperCase() === 'USD' || Boolean(o.usdEnabled);
        const orderRate = Number(o.usdRate);
        const usableRate = Number.isFinite(orderRate) && orderRate > 0 ? orderRate : 0;
        (o.items || []).forEach((it, idx) => {
          const qty = Number(it.qty) || 0;
          const price = Number(it.rate) || 0;
          const amount = qty * price;
          const amountTzsRaw = it.amountTzs;
          const amountTzs = isUsd
            ? (Number.isFinite(Number(amountTzsRaw)) ? Number(amountTzsRaw) : (usableRate ? amount * usableRate : null))
            : amount;
          rows.push({
            id: `${o.id}-${idx}`,
            orderId: o.id,
            date: (o.orderDate || '').slice(0,10),
            invoiceNo: o.invoiceNumber || '',
            soNo: o.orderNumber || '',
            name: o.name || '',
            item: it.item || '',
            description: it.description || '',
            qty,
            unit: it.unit || '',
            price,
            amount,
            amountTzs,
            paymentMethod: String(o.paymentMethod || '').trim(),
            currency: isUsd ? 'USD' : 'TZS',
            usdRate: usableRate,
            usdAmount: isUsd ? amount : null,
            tzsAmount: isUsd ? amountTzs : amount,
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
      return sorted;
    }, [orders, fromDate, toDate, sortKey]);
    const totals = useMemo(() => {
      const totalUsd = filteredLines.reduce((s, r) => s + (r.currency === 'USD' ? (Number(r.usdAmount) || 0) : 0), 0);
      const totalTzs = filteredLines.reduce((s, r) => {
        const v = r.currency === 'USD' ? r.tzsAmount : r.amount;
        return s + (Number.isFinite(Number(v)) ? Number(v) : 0);
      }, 0);
      const missingRates = filteredLines.some((r) => r.currency === 'USD' && !Number(r.usdRate));
      return { totalUsd, totalTzs, missingRates };
    }, [filteredLines]);
    const hasUsd = useMemo(() => filteredLines.some((r) => r.currency === 'USD'), [filteredLines]);
    const exportCSV = () => {
      const header = ['Date','S.O. No.','Invoice No.','Customer Name','Item','Qty','Unit','Sales Price Currency','Sales Price','Amount USD','Rate','Amount TZS','Sell With','Status'];
      const rows = filteredLines.map(r => [
        r.date,
        r.soNo,
        r.invoiceNo,
        r.name,
        r.item,
        r.qty,
        r.unit,
        r.currency === 'USD' ? 'USD' : 'TZS',
        r.price,
        r.currency === 'USD' ? (Number(r.usdAmount) || 0) : '',
        r.currency === 'USD' ? (Number(r.usdRate) || '') : '',
        r.currency === 'USD' ? (r.tzsAmount == null ? '' : Number(r.tzsAmount)) : (Number(r.amount) || 0),
        r.paymentMethod || '',
        (r.raw.status || '') || 'Open'
      ]);
      const csv = [header, ...rows].map(x => x.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales_by_customer_detail.csv';
      a.click();
      URL.revokeObjectURL(url);
    };
    const toggleOrderStatus = (orderId) => {
      setOrders(prev => {
        const updated = (Array.isArray(prev) ? prev : []).map(o => {
          if (o.id !== orderId) return o;
          const current = (o.status || 'Open') === 'Paid' ? 'Paid' : 'Open';
          const nextStatus = current === 'Paid' ? 'Open' : 'Paid';
          const next = { ...o, status: nextStatus };
          if (nextStatus === 'Paid' && !next._stockApplied) {
            try {
              const type = String(next.itemType || 'eggs').trim() || 'eggs';
              const key = `stockOut_${type}`;
              const outRaw = JSON.parse(localStorage.getItem(key) || '[]');
              const outList = Array.isArray(outRaw) ? outRaw : [];
              (next.items || []).forEach((it) => {
                const qty = Number(it?.qty) || 0;
                const itemName = String(it?.item || '').trim();
                if (!itemName || qty <= 0) return;
                outList.push({
                  id: Date.now() + Math.random(),
                  date: String(next.orderDate || next.date || '').slice(0, 10),
                  quantity: String(qty),
                  unit: String(it?.unit || ''),
                  reason: 'Sales Order',
                  description: `Sales Order ${String(next.orderNumber || '')}`,
                  saleOrderId: next.id,
                  itemType: type,
                  itemName
                });
              });
              localStorage.setItem(key, JSON.stringify(outList));
              next._stockApplied = true;
            } catch {}
          }
          return next;
        });
        try {
          localStorage.setItem('salesOrders', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('dataUpdated'));
        } catch {}
        return updated;
      });
    };
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Customize Report</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Comment on Report</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Share Template</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm">Memorize</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>window.print()}>Print</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>{
              const subject = encodeURIComponent('Sales by Customer Detail');
              const body = encodeURIComponent('Please find the Sales by Customer Detail report.');
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}>E-mail</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={exportCSV}>Excel</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>setHideHeader(v=>!v)}>{hideHeader ? 'Show Header' : 'Hide Header'}</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>setRefreshKey(k=>k+1)}>Refresh</button>
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
          </div>
          {!hideHeader && (
            <div className="text-center mt-4">
              <div className="text-xs text-gray-600">Accrual Basis</div>
              <div className="text-lg font-semibold text-gray-900">Sales by Customer Detail</div>
              <div className="text-sm text-gray-700">{formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}</div>
            </div>
          )}
          <div className="mt-4 border rounded-lg">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-[1400px] w-full table-fixed border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: shWidths[0] }}>
                      Date
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(0,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: shWidths[1] }}>
                      S.O. No.
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(1,e)}></div>
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
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(4,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: shWidths[5] }}>
                      Qty
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(5,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: shWidths[6] }}>
                      U/M
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(6,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: shWidths[7] }}>
                      Sales Price
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(7,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: shWidths[8] }}>
                      Amount (USD)
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(8,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-right border-b relative" style={{ width: shWidths[9] }}>
                      Rate
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(9,e)}></div>
                    </th>
                    <th className="px-3 py-2 pr-6 text-xs text-gray-700 text-right border-b relative" style={{ width: shWidths[10] }}>
                      Amount (TZS)
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(10,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-left border-b relative" style={{ width: shWidths[11] }}>
                      Sell with
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(11,e)}></div>
                    </th>
                    <th className="px-3 py-2 text-xs text-gray-700 text-center border-b relative" style={{ width: shWidths[12] }}>
                      Status
                      <div className="absolute right-0 top-0 h-full cursor-col-resize" style={{ width: 2, backgroundColor: '#d1d5db' }} onMouseDown={(e)=>onShMouseDown(12,e)}></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="px-3 py-2 text-sm text-gray-800" style={{ width: shWidths[0] }}>{r.date}</td>
                      <td className="px-3 py-2 text-sm text-gray-800" style={{ width: shWidths[1] }}>
                        <button className="underline text-blue-700" onClick={()=>{
                          try { localStorage.setItem('selectedOrderForEdit', JSON.stringify(r.raw)); } catch {}
                          navigate('/placeholder/sales-order');
                        }}>{r.soNo}</button>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-800" style={{ width: shWidths[2] }}>{r.invoiceNo}</td>
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
                        <button
                          type="button"
                          className={((r.raw.status || '') === 'Paid')
                            ? 'px-2 py-1 rounded bg-green-100 text-green-700 text-xs hover:bg-green-200'
                            : 'px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs hover:bg-gray-200'}
                          onClick={() => toggleOrderStatus(r.orderId)}
                          title="Click to toggle Paid/Open"
                        >
                          {((r.raw.status || '') === 'Paid') ? 'Paid' : 'Open'}
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
    React.useEffect(() => {
      try {
        const list = JSON.parse(localStorage.getItem('customers') || '[]');
        setCustomers(Array.isArray(list) ? list : []);
      } catch {
        setCustomers([]);
      }
    }, []);
    const addCustomer = () => {
      const displayName = newCustomer.name || newCustomer.company;
      if (!displayName || !displayName.trim()) return;
      try {
        const list = JSON.parse(localStorage.getItem('customers') || '[]');
        const updated = Array.isArray(list) ? list : [];
        updated.push({
          name: displayName,
          company: newCustomer.company || '',
          mainEmail: newCustomer.mainEmail || '',
          mainPhone: newCustomer.mainPhone || '',
          billTo: newCustomer.billTo || '',
          shipTo: newCustomer.shipTo || '',
          address: newCustomer.billTo || ''
        });
        localStorage.setItem('customers', JSON.stringify(updated));
        setCustomers(updated);
        setShowAdd(false);
        setNewCustomer({ name: '', company: '', mainEmail: '', mainPhone: '', billTo: '', shipTo: '' });
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}
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
      setDeleteCustomerLoading(true);
      window.setTimeout(() => {
        try {
          const list = JSON.parse(localStorage.getItem('customers') || '[]');
          const next = (Array.isArray(list) ? list : []).filter(x => !(
            (x.name || '') === (c.name || '') &&
            (x.mainEmail || '') === (c.mainEmail || '')
          ));
          localStorage.setItem('customers', JSON.stringify(next));
          setCustomers(next);
          window.dispatchEvent(new CustomEvent('dataUpdated'));
        } catch {}
        setDeleteCustomerLoading(false);
        setDeleteCustomerModal({ open: false, customer: null });
      }, 5000);
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
    const creditTotals = useMemo(() => {
      const subtotal = creditItems.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
      const tax = vatEnabled ? subtotal * VAT_RATE : 0;
      const shipping = 0;
      const total = subtotal + tax + shipping;
      return { subtotal, tax, shipping, total };
    }, [creditItems, vatEnabled]);
    React.useEffect(() => {
      try {
        const list = JSON.parse(localStorage.getItem('customers') || '[]');
        setCustomers(Array.isArray(list) ? list : []);
      } catch {
        setCustomers([]);
      }
    }, []);
    React.useEffect(() => {
      const handler = () => {
        try {
          const list = JSON.parse(localStorage.getItem('customers') || '[]');
          setCustomers(Array.isArray(list) ? list : []);
        } catch {
          setCustomers([]);
        }
      };
      window.addEventListener('dataUpdated', handler);
      return () => window.removeEventListener('dataUpdated', handler);
    }, []);
    const addCustomer = () => {
      const displayName = (newCustomer.name || '').trim() || (newCustomer.company || '').trim();
      if (!displayName) return;
      try {
        const list = JSON.parse(localStorage.getItem('customers') || '[]');
        const updated = Array.isArray(list) ? list : [];
        updated.push({ ...newCustomer, name: displayName });
        localStorage.setItem('customers', JSON.stringify(updated));
        setCustomers(updated);
        setCreditForm(prev => ({
          ...prev,
          name: displayName,
          phone: newCustomer.mainPhone || ''
        }));
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}
      setShowCustomerModal(false);
    };
    const saveCreditSale = () => {
      const name = (creditForm.name || '').trim();
      const phone = (creditForm.phone || '').trim();
      const dueDate = (creditForm.dueDate || '').slice(0,10);
      if (!name || !dueDate) return;
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
        const list = JSON.parse(localStorage.getItem('creditSales') || '[]');
        const next = Array.isArray(list) ? list : [];
        next.push(entry);
        localStorage.setItem('creditSales', JSON.stringify(next));
        try {
          const cur = parseInt(localStorage.getItem('nextCreditNumber') || String(nextCreditInit), 10);
          const nextNum = (Number.isFinite(cur) ? cur : nextCreditInit) + 1;
          localStorage.setItem('nextCreditNumber', String(nextNum));
          setHeader(prev => ({ ...prev, creditNumber: String(nextNum).padStart(CREDIT_PAD, '0') }));
        } catch {}
        setCreditForm({
          name: '',
          phone: '',
          dueDate: new Date().toISOString().slice(0,10),
          notes: ''
        });
        setCreditItems([{ item: '', description: '', unit: 'kg', qty: 1, rate: 0 }]);
      } catch {}
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
            <button className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={()=>{saveCreditSale(); navigate('/placeholder/credit-history');}}>Save & Close</button>
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={()=>{saveCreditSale(); setCreditItems([{ item:'', description:'', unit:'kg', qty:1, rate:0 }]);}}>Save & New</button>
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
      try {
        const list = JSON.parse(localStorage.getItem('creditSales') || '[]');
        setCredits(Array.isArray(list) ? list : []);
      } catch {
        setCredits([]);
      }
    }, []);
    const filteredRows = useMemo(() => {
      const start = new Date(fromDate);
      const end = new Date(toDate);
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
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Credit History</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>navigate('/placeholder/sales-credit')}>New Credit</button>
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
    const RMA_PAD = 6;
    const nextRmaInit = (() => {
      try {
        const v = parseInt(localStorage.getItem('nextRmaNumber') || '7000', 10);
        return Number.isFinite(v) ? v : 7000;
      } catch { return 7000; }
    })();
    const [header, setHeader] = useState({
      rmaNumber: String(nextRmaInit).padStart(RMA_PAD, '0'),
      rmaDate: new Date().toISOString().slice(0,10),
      windowDays: '30'
    });
    const [form, setForm] = useState({ name: '', phone: '', notes: '' });
    const categoryOptions = ['eggs','chickens'];
    const getUnitsForCategory = (cat) => (cat === 'eggs' ? ['tray','piece'] : ['piece','kg']);
    const [items, setItems] = useState([{ item:'', description:'', unit:getUnitsForCategory('eggs')[0], qty:1, price:0, reason:'', condition:'New', restock:true, category:'eggs' }]);
    const [vatEnabled, setVatEnabled] = useState(false);
    const VAT_RATE = 0.18;
    const [restockPercent, setRestockPercent] = useState('0');
    const totals = useMemo(() => {
      const subtotal = items.reduce((s, r) => s + (Number(r.qty)||0) * (Number(r.price)||0), 0);
      const tax = vatEnabled ? subtotal * VAT_RATE : 0;
      const restockFee = subtotal * (Number(restockPercent||0)/100);
      const shippingReverse = 0;
      const refundTotal = subtotal + tax - restockFee - shippingReverse;
      return { subtotal, tax, restockFee, shippingReverse, refundTotal };
    }, [items, vatEnabled, restockPercent]);
    const saveReturn = () => {
      const name = (form.name||'').trim();
      const phone = (form.phone||'').trim();
      if (!name) return;
      const entry = {
        id: Date.now(),
        rmaNumber: header.rmaNumber,
        rmaDate: header.rmaDate,
        windowDays: header.windowDays,
        name,
        phone,
        items: items.map(r=>({
          item:r.item||'',
          description:r.description||'',
          unit:r.unit||'',
          qty:Number(r.qty)||0,
          price:Number(r.price)||0,
          amount:(Number(r.qty)||0)*(Number(r.price)||0),
          reason:r.reason||'',
          condition:r.condition||'New',
          restock: !!r.restock
        })),
        totals,
        restockPercent: Number(restockPercent||0),
        vatEnabled,
        refundMethod: 'Original',
        notes: (form.notes||'').trim(),
        status: 'Closed',
        createdAt: new Date().toISOString()
      };
      try {
        const list = JSON.parse(localStorage.getItem('returns') || '[]');
        const next = Array.isArray(list) ? list : [];
        next.push(entry);
        localStorage.setItem('returns', JSON.stringify(next));
        items.forEach(r => {
          if (r.restock) {
            const cat = (r.category || 'eggs');
            const stockKey = `stockIn_${cat}`;
            const stockIn = JSON.parse(localStorage.getItem(stockKey) || '[]');
            const record = {
              id: Date.now() + Math.random(),
              quantity: String(r.qty || 0),
              unit: r.unit || '',
              supplier: 'Return',
              pricePerItem: String(r.price || 0),
              date: new Date().toISOString().slice(0,10),
              itemType: cat,
              note: `Restock from RMA ${header.rmaNumber}`,
              itemName: r.item || ''
            };
            stockIn.push(record);
            localStorage.setItem(stockKey, JSON.stringify(stockIn));
          }
        });
        try {
          const cur = parseInt(localStorage.getItem('nextRmaNumber') || String(nextRmaInit), 10);
          const nextNum = (Number.isFinite(cur) ? cur : nextRmaInit) + 1;
          localStorage.setItem('nextRmaNumber', String(nextNum));
          setHeader(prev => ({ ...prev, rmaNumber: String(nextNum).padStart(RMA_PAD, '0') }));
        } catch {}
        setForm({ name:'', phone:'', notes:'' });
        setItems([{ item:'', description:'', unit:getUnitsForCategory('eggs')[0], qty:1, price:0, reason:'', condition:'New', restock:true, category:'eggs' }]);
      } catch {}
    };
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Returns & Refunds</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>navigate('/placeholder/returns-history')}>Show History</button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm flex items-center gap-2" onClick={()=>window.print()}>
              <Printer size={16} />
              <span>Print</span>
            </button>
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm flex items-center gap-2" onClick={()=>{
              const subject = `Return ${header.rmaNumber}`;
              const body = `RMA Date: ${header.rmaDate}\nWindow: ${header.windowDays} days\nCustomer: ${(form.name||'')}\nRefund: ${totals.refundTotal.toLocaleString()}`;
              window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }}>
              <Mail size={16} />
              <span>Email</span>
            </button>
            {canDelete ? (
              <button className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm flex items-center gap-2" onClick={()=>{
                setForm({ name:'', phone:'', notes:'' });
                setItems([{ item:'', description:'', unit:getUnitsForCategory('eggs')[0], qty:1, price:0, reason:'', condition:'New', restock:true, category:'eggs' }]);
              }}>
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-xs text-gray-700">RMA Number</div>
              <input className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" value={header.rmaNumber} readOnly />
            </div>
            <div>
              <div className="text-xs text-gray-700">RMA Date</div>
              <DateInput className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" value={header.rmaDate} onChange={(e)=>setHeader(prev=>({ ...prev, rmaDate: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-700">Return Window (days)</div>
              <input className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" value={header.windowDays} onChange={(e)=>setHeader(prev=>({ ...prev, windowDays: e.target.value.replace(/[^0-9]/g,'') }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-xs text-gray-700">Customer Name</div>
              <input className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" value={form.name} onChange={(e)=>setForm(prev=>({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-700">Phone</div>
              <input className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" value={form.phone} onChange={(e)=>setForm(prev=>({ ...prev, phone: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-700">Refund Method</div>
              <select className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
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
              <div className="text-gray-900 font-semibold">Return Items</div>
              <button className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2" onClick={()=>setItems(prev=>[...prev,{ item:'', description:'', unit:getUnitsForCategory('eggs')[0], qty:1, price:0, reason:'', condition:'New', restock:true, category:'eggs' }])}>
                <Plus size={16} />
                <span className="text-sm">Add Line</span>
              </button>
            </div>
            <div className="p-4 overflow-auto">
              <table className="min-w-[1100px] w-full table-fixed border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center w-1/12 border border-gray-200">No.</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-2/12 border border-gray-200">Item</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-2/12 border border-gray-200">Description</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-1/12 border border-gray-200">Category</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-1/12 border border-gray-200">Unit</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Qty Return</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Price</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Amount</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-1/12 border border-gray-200">Reason</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-1/12 border border-gray-200">Condition</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center w-1/12 border border-gray-200">Restock</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => {
                    const amount = (Number(row.qty)||0) * (Number(row.price)||0);
                    return (
                      <tr key={i} className="align-middle">
                        <td className="px-3 py-2 border border-gray-200 text-center select-none">{i + 1}</td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.item} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,item:e.target.value}:r))} placeholder="Product or service" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.description} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,description:e.target.value}:r))} placeholder="Description" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <select className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.category||'eggs'} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,category:e.target.value, unit:getUnitsForCategory(e.target.value)[0]}:r))}>
                            {categoryOptions.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <select className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.unit} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,unit:e.target.value}:r))}>
                            {getUnitsForCategory(row.category||'eggs').map(u => <option key={u} value={u}>{u}</option>)}
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
                        <td className="px-3 py-2 border border-gray-200">
                          <select className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.condition} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,condition:e.target.value}:r))}>
                            <option>New</option>
                            <option>Opened</option>
                            <option>Damaged</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 border border-gray-200 text-center">
                          <input type="checkbox" checked={!!row.restock} onChange={(e)=>setItems(prev=>prev.map((r,idx)=>idx===i?{...r,restock:e.target.checked}:r))} />
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
                  <span className="text-sm font-semibold text-gray-900">Refund Total</span>
                  <span className="text-lg font-bold text-gray-900">{totals.refundTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={()=>{ saveReturn(); navigate('/placeholder/sales-returns'); }}>Save & Close</button>
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={()=>{ saveReturn(); setItems([{ item:'', description:'', unit:getUnitsForCategory('eggs')[0], qty:1, price:0, reason:'', condition:'New', restock:true, category:'eggs' }]); }}>Save & New</button>
            <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100" onClick={()=>{ setItems([{ item:'', description:'', unit:getUnitsForCategory('eggs')[0], qty:1, price:0, reason:'', condition:'New', restock:true, category:'eggs' }]); setForm({ name:'', phone:'', notes:'' }); }}>Clear</button>
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
    React.useEffect(() => {
      try {
        const list = JSON.parse(localStorage.getItem('returns') || '[]');
        const lines = [];
        (Array.isArray(list) ? list : []).forEach(ret => {
          (ret.items || []).forEach((it, idx) => {
            lines.push({
              id: `${ret.id}-${idx}`,
              date: (ret.rmaDate || '').slice(0,10),
              rmaNo: ret.rmaNumber || '',
              name: ret.name || '',
              item: it.item || '',
              qty: Number(it.qty) || 0,
              unit: it.unit || '',
              price: Number(it.price) || 0,
              amount: (Number(it.qty)||0) * (Number(it.price)||0),
              category: it.category || 'eggs',
              restock: !!it.restock
            });
          });
        });
        setRows(lines);
      } catch {
        setRows([]);
      }
    }, []);
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
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Returns History</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm" onClick={()=>navigate('/placeholder/sales-returns')}>New Return</button>
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
              <div className="text-lg font-semibold text-gray-900">Returns Detail</div>
              <div className="text-sm text-gray-700">{formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}</div>
            </div>
          )}
          <div className="mt-4 overflow-auto">
            <table className="min-w-[1100px] w-full table-fixed border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Date</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">RMA No</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Customer</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Item</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-right border border-gray-200">Qty</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Unit</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-right border border-gray-200">Price</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-right border border-gray-200">Amount</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-left border border-gray-200">Category</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center border border-gray-200">Restocked</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{r.date}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{r.rmaNo}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{r.name}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{r.item}</td>
                    <td className="px-3 py-2 border border-gray-200 text-right text-sm text-gray-900">{Number(r.qty || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900">{r.unit}</td>
                    <td className="px-3 py-2 border border-gray-200 text-right text-sm text-gray-900">{Number(r.price || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 border border-gray-200 text-right text-sm font-semibold text-gray-900">{Number(r.amount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 border border-gray-200 text-sm text-gray-900 capitalize">{r.category}</td>
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${r.restock ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                        {r.restock ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-sm text-gray-600" colSpan={10}>No returns found</td>
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
          <div className="absolute -top-24 -right-28 w-[420px] h-[420px] rounded-full bg-green-200/30 blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-28 w-[420px] h-[420px] rounded-full bg-emerald-200/30 blur-3xl animate-pulse" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[44px] leading-[1.05] font-extrabold tracking-tight text-gray-900">
                  Purchase <span className="text-green-600">Planning</span>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Planning Guide
              </button>
            </div>

            <div className="mt-2" />
          </div>
        </Card>

        <div className="space-y-5">
          <SectionTitle title="Purchase Planning Process Flowchart" />
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
      try {
        const list = JSON.parse(localStorage.getItem('expenses') || '[]');
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    }, [nonce, refreshKey]);

    const income = useMemo(() => {
      void nonce;
      void refreshKey;
      const readArray = (key) => {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          return Array.isArray(list) ? list : [];
        } catch {
          return [];
        }
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
      setDeleteExpenseLoading(true);
      window.setTimeout(() => {
        try {
          const list = JSON.parse(localStorage.getItem('expenses') || '[]');
          const next = (Array.isArray(list) ? list : []).filter((e) => String(e?.id || '') !== expenseId);
          localStorage.setItem('expenses', JSON.stringify(next));
          window.dispatchEvent(new CustomEvent('dataUpdated'));
        } catch {}
        setDeleteExpenseLoading(false);
        setDeleteExpenseModal({ open: false, expenseId: '' });
        setRefreshKey((k) => k + 1);
      }, 5000);
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
    const [stockFilter] = useState('all');
    const [sortKey] = useState('name_asc');
    const [products, setProducts] = useState([]);
    const [locationFilter, setLocationFilter] = useState('all');
    const [modal, setModal] = useState({ open: false, mode: 'create', id: '' });
    const [deleteModal, setDeleteModal] = useState({ open: false, id: '', name: '' });
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
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener('dataUpdated', handler);
        window.removeEventListener('storage', handler);
      };
    }, []);

    React.useEffect(() => {
      void refreshKey;
      try {
        const list = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
        setProducts(Array.isArray(list) ? list : []);
      } catch {
        setProducts([]);
      }
    }, [refreshKey]);

    const toMoney = (v) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v || '').replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const money = (n) => (Number(n || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const stockState = useMemo(() => {
      void refreshKey;
      const qtyByName = new Map();
      const add = (name, delta) => {
        const key = String(name || '').trim();
        if (!key) return;
        qtyByName.set(key, (qtyByName.get(key) || 0) + delta);
      };
      const safeParse = (raw) => {
        try {
          const list = JSON.parse(raw || '[]');
          return Array.isArray(list) ? list : [];
        } catch {
          return [];
        }
      };
      const keys = Object.keys(localStorage || {});
      keys.forEach((k) => {
        if (!/^stock(In|Out)_/.test(k)) return;
        const isIn = k.startsWith('stockIn_');
        const list = safeParse(localStorage.getItem(k));
        list.forEach((r) => {
          const name = String(r?.itemName || r?.name || '').trim();
          const qty = parseFloat(String(r?.quantity || 0)) || 0;
          if (!name || !qty) return;
          add(name, isIn ? qty : -qty);
        });
      });
      return { qtyByName };
    }, [refreshKey]);

    const categories = useMemo(() => {
      const set = new Set();
      (products || []).forEach((p) => {
        const c = String(p?.category || p?.itemType || 'general').trim() || 'general';
        set.add(c);
      });
      return ['all', ...Array.from(set.values()).sort((a, b) => a.localeCompare(b))];
    }, [products]);

    const rows = useMemo(() => {
      const q = (search || '').trim().toLowerCase();
      const cat = String(categoryFilter || 'all');
      const stockF = String(stockFilter || 'all');
      const list = (products || []).map((p) => {
        const name = String(p?.name || '').trim();
        const qty = stockState.qtyByName.get(name) || 0;
        const buying = toMoney(p?.buyingPrice ?? p?.buyPrice ?? p?.costPrice ?? 0);
        const selling = toMoney(p?.sellingPrice ?? p?.sellPrice ?? p?.price ?? 0);
        const value = qty > 0 ? qty * (buying || 0) : 0;
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
        if (stockF === 'in' && !(p._qty > 0)) return false;
        if (stockF === 'out' && !(p._qty <= 0)) return false;
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
    }, [categoryFilter, products, search, sortKey, stockFilter, stockState.qtyByName]);

    const kpis = useMemo(() => {
      const total = rows.length;
      const inStock = rows.filter((r) => r._qty > 0).length;
      const outStock = rows.filter((r) => r._qty <= 0).length;
      const stockValue = rows.reduce((s, r) => s + (r._value || 0), 0);
      let salesMade = 0;
      try {
        const list = JSON.parse(localStorage.getItem('sales') || '[]');
        const salesCount = (Array.isArray(list) ? list : []).length;
        const orders = JSON.parse(localStorage.getItem('salesOrders') || '[]');
        const paidOrdersCount = (Array.isArray(orders) ? orders : []).filter((o) => String(o?.status || '').toLowerCase() === 'paid').length;
        salesMade = salesCount + paidOrdersCount;
      } catch {
        salesMade = 0;
      }
      return { total, inStock, outStock, stockValue, salesMade };
    }, [rows]);

    const exportProductsCsv = () => {
      const header = ['Name', 'Category', 'Unit', 'BuyingPrice', 'SellingPrice', 'Qty'];
      const dataRows = rows.map((p) => [
        String(p?._name || ''),
        String(p?._category || ''),
        String(p?.unit || ''),
        String(p?._buying ?? ''),
        String(p?._selling ?? ''),
        String(p?._qty ?? '')
      ]);
      const csv = [header, ...dataRows]
        .map((r) =>
          r
            .map((v) => {
              const s = String(v ?? '');
              return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(',')
        )
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products.csv';
      a.click();
      URL.revokeObjectURL(url);
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
        const existing = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
        const list = Array.isArray(existing) ? existing : [];
        const byName = new Map(list.map((p) => [String(p?.name || '').trim().toLowerCase(), p]));
        const now = new Date().toISOString();
        normalized.forEach((p) => {
          const key = p.name.toLowerCase();
          const prev = byName.get(key);
          const next = {
            ...(prev || {}),
            id: String(prev?.id || `PROD-${Date.now()}-${Math.random().toString(16).slice(2)}`),
            name: p.name,
            category: p.category,
            unit: p.unit,
            buyingPrice: p.buyingPrice,
            sellingPrice: p.sellingPrice,
            price: p.sellingPrice,
            sku: p.sku,
            barcode: p.barcode,
            imageDataUrl: p.imageDataUrl,
            status: String(prev?.status || 'active'),
            updatedAt: now,
            createdAt: String(prev?.createdAt || now)
          };
          byName.set(key, next);
        });
        const nextList = Array.from(byName.values()).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        localStorage.setItem('inventoryItems', JSON.stringify(nextList));
        try {
          window.dispatchEvent(new CustomEvent('dataUpdated'));
        } catch {}
        setToast(`Imported ${normalized.length.toLocaleString()} products`);
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
        qty: '',
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

    const saveProduct = () => {
      if (saving) return;
      const name = String(draft.name || '').trim();
      if (!name) {
        setToast('Product name is required');
        return;
      }
      const unit = String(draft.unit || '').trim() || 'kg';
      const qty = (() => {
        const raw = String(draft.qty || '').trim();
        if (!raw) return null;
        const n = parseFloat(raw);
        return Number.isFinite(n) ? Math.max(0, n) : null;
      })();
      const buying = toMoney(draft.buyingPrice);
      const selling = toMoney(draft.sellingPrice);
      setSaving(true);
      window.setTimeout(() => {
        try {
          const existing = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
          const list = Array.isArray(existing) ? existing : [];
          const id = modal.mode === 'edit' && modal.id ? modal.id : `PROD-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const normalizedName = name.toLowerCase();
          const idx = list.findIndex((p) => String(p?.id || '') === String(id));
          const dupeIdx = list.findIndex((p, i) => i !== idx && String(p?.name || '').trim().toLowerCase() === normalizedName);
          if (dupeIdx >= 0) {
            setToast('Product already exists');
            setSaving(false);
            return;
          }
          const originalName = idx >= 0 ? String(list[idx]?.name || '').trim() : '';
          const originalCategory = idx >= 0 ? String(list[idx]?.category || list[idx]?.itemType || '').trim() : '';
          const now = new Date().toISOString();
          const nextRecord = {
            ...(idx >= 0 ? list[idx] : {}),
            id,
            name,
            sku: String(draft.sku || '').trim(),
            barcode: String(draft.barcode || '').trim(),
            category: String(draft.category || 'general').trim() || 'general',
            unit,
            buyingPrice: buying,
            sellingPrice: selling,
            price: selling,
            description: String(draft.description || '').trim(),
            imageDataUrl: String(draft.imageDataUrl || ''),
            status: String(draft.status || 'active'),
            updatedAt: now,
            createdAt: idx >= 0 ? String(list[idx]?.createdAt || now) : now
          };
          const next = idx >= 0 ? list.map((p, i) => (i === idx ? nextRecord : p)) : [nextRecord, ...list];
          localStorage.setItem('inventoryItems', JSON.stringify(next));
          if (qty !== null) {
            const targetCategory = String(nextRecord.category || 'general').trim() || 'general';
            const currentQty = idx >= 0 ? (stockState.qtyByName.get(originalName || name) || 0) : 0;
            const delta = idx >= 0 ? (qty - currentQty) : qty;
            const isIn = delta >= 0;
            const absQty = Math.abs(delta);
            if (absQty > 0) {
              const key = `${isIn ? 'stockIn' : 'stockOut'}_${targetCategory || 'general'}`;
              const existingMoves = JSON.parse(localStorage.getItem(key) || '[]');
              const movesList = Array.isArray(existingMoves) ? existingMoves : [];
              movesList.push({
                id: Date.now() + Math.random(),
                date: new Date().toISOString().slice(0, 10),
                quantity: String(absQty),
                unit,
                supplier: isIn ? 'Opening Stock' : 'Stock Adjustment',
                pricePerItem: String(buying || 0),
                itemType: targetCategory,
                note: isIn ? 'Opening stock' : 'Stock adjustment',
                itemName: originalName && originalName !== name ? originalName : name
              });
              localStorage.setItem(key, JSON.stringify(movesList));
            }
            if (originalCategory && originalCategory !== targetCategory) {
              void 0;
            }
          }
          try {
            window.dispatchEvent(new CustomEvent('dataUpdated'));
          } catch {}
          setModal({ open: false, mode: 'create', id: '' });
          setSaving(false);
          setToast('Saved');
          window.setTimeout(() => setToast(''), 1500);
          return;
        } catch {
          setSaving(false);
          setToast('Failed to save');
        }
      }, 300);
    };

    const requestDelete = (p) => {
      if (!canDelete) return;
      setDeleteModal({ open: true, id: String(p?.id || ''), name: String(p?._name || p?.name || '') });
    };

    const confirmDelete = () => {
      if (deleteLoading) return;
      setDeleteLoading(true);
      setTimeout(() => {
        try {
          const existing = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
          const list = Array.isArray(existing) ? existing : [];
          const byId = list.filter((x) => String(x?.id || '') !== String(deleteModal.id));
          const byName = byId.filter((x) => String(x?.name || '').trim().toLowerCase() !== String(deleteModal.name || '').trim().toLowerCase());
          const next = byName;
          localStorage.setItem('inventoryItems', JSON.stringify(next));
          setProducts(next);
          try {
            window.dispatchEvent(new CustomEvent('dataUpdated'));
          } catch {}
        } catch {}
        setDeleteLoading(false);
        setDeleteModal({ open: false, id: '', name: '' });
        setToast('Deleted');
        window.setTimeout(() => setToast(''), 1200);
      }, 500);
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
                    <option key={c} value={c}>{c === 'all' ? 'Category' : c}</option>
                  ))}
                </select>
              </div>
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
              <div className="mt-2 text-3xl font-extrabold text-gray-900">{kpis.total.toLocaleString()}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Selling goods</div>
                <div className="w-9 h-9 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-gray-900">{kpis.salesMade.toLocaleString()}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Out of stock</div>
                <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-gray-900">{kpis.outStock.toLocaleString()}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Stock value</div>
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <HandCoins className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-gray-900">TZS {money(kpis.stockValue)}</div>
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
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3 text-right">Value</th>
                    <th className="px-5 py-3">Updated</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={String(p.id)} className="border-b border-gray-100">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {p.imageDataUrl ? (
                            <img alt="" src={p.imageDataUrl} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm font-extrabold text-blue-700">
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
                          <button
                            type="button"
                            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                            onClick={() => {
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
                            title="Sell"
                          >
                            <ArrowRight className="w-4 h-4 text-gray-700" />
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
                          {canDelete ? (
                            <button
                              type="button"
                              className={deleteLoading && String(deleteModal.id) === String(p.id) ? 'w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 cursor-not-allowed' : 'w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 hover:bg-red-50'}
                              onClick={() => requestDelete(p)}
                              title="Delete"
                              disabled={deleteLoading && String(deleteModal.id) === String(p.id)}
                            >
                              {deleteLoading && String(deleteModal.id) === String(p.id) ? (
                                <span className="w-4 h-4 rounded-full border-2 border-red-600/60 border-t-red-600 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-700" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
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
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button type="button" className="absolute inset-0 bg-transparent" onClick={closeModal} />
            <div className="relative w-[94vw] max-w-[980px] rounded-2xl border border-gray-200 overflow-hidden max-h-[92vh] overflow-y-auto bg-gray-50">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500" />
              <div className="absolute -inset-1 rounded-[18px] bg-gradient-to-br from-green-200/60 via-white to-emerald-200/60 -z-10" />
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div className="text-sm text-gray-900">{modal.mode === 'edit' ? 'Edit Product' : 'New Product'}</div>
                <button type="button" className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50" onClick={closeModal}>Close</button>
              </div>
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4 bg-white border border-gray-200 rounded-2xl p-5 focus-within:ring-2 focus-within:ring-green-200">
                  <div>
                    <div className="text-xs text-gray-600">Product name</div>
                    <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="Product name" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600">Category</div>
                      <input value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="eggs / feeds / general" />
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
                      <input value={draft.buyingPrice} onChange={(e) => setDraft((p) => ({ ...p, buyingPrice: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="0" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Selling price</div>
                      <input value={draft.sellingPrice} onChange={(e) => setDraft((p) => ({ ...p, sellingPrice: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600">Qty</div>
                      <input value={draft.qty} onChange={(e) => setDraft((p) => ({ ...p, qty: e.target.value.replace(/[^0-9.]/g, '') }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="0" />
                    </div>
                    <div className="flex items-end">
                      <div className="text-xs text-gray-500">Creates an opening stock adjustment</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600">SKU</div>
                      <input value={draft.sku} onChange={(e) => setDraft((p) => ({ ...p, sku: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="SKU" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Barcode</div>
                      <input value={draft.barcode} onChange={(e) => setDraft((p) => ({ ...p, barcode: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="Barcode" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Description</div>
                    <textarea value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500 h-28" placeholder="Description" />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50" onClick={closeModal} disabled={saving}>Cancel</button>
                    <button type="button" className={saving ? 'px-4 py-2 rounded-xl bg-green-600/70 text-white text-sm cursor-not-allowed' : 'px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm'} onClick={saveProduct} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <div className="space-y-4 bg-white border border-gray-200 rounded-2xl p-5 focus-within:ring-2 focus-within:ring-green-200">
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
                          <button type="button" className="mt-2 px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-100" onClick={() => setDraft((p) => ({ ...p, imageDataUrl: '' }))}>
                            Remove image
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="text-xs text-gray-600">Status</div>
                    <select value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))} className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500">
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
    const [storeTab, setStoreTab] = useState('value');
    const [fromDate, setFromDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [moveType, setMoveType] = useState('IN');
    const [q, setQ] = useState('');
    const [valueQ, setValueQ] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [assetDraft, setAssetDraft] = useState({ name: '', value: '', years: '' });
    const [assets, setAssets] = useState(() => {
      try {
        const raw = JSON.parse(localStorage.getItem('fixedAssets') || '[]');
        return Array.isArray(raw) ? raw : [];
      } catch {
        return [];
      }
    });

    React.useEffect(() => {
      const handler = () => setRefreshKey((v) => v + 1);
      window.addEventListener('dataUpdated', handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener('dataUpdated', handler);
        window.removeEventListener('storage', handler);
      };
    }, []);

    const toMoney = (v) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v || '').replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const money = (n) => (Number(n || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const saveAssets = (next) => {
      const list = Array.isArray(next) ? next : [];
      setAssets(list);
      try {
        localStorage.setItem('fixedAssets', JSON.stringify(list));
      } catch {}
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

    const assetsSummary = useMemo(() => {
      const list = Array.isArray(assets) ? assets : [];
      const totalValue = list.reduce((s, a) => s + toMoney(a?.value), 0);
      const totalAnnualDep = list.reduce((s, a) => {
        const v = toMoney(a?.value);
        const y = parseFloat(String(a?.years || '').replace(/,/g, ''));
        if (!(v > 0) || !(Number.isFinite(y) && y > 0)) return s;
        return s + v / y;
      }, 0);
      return { totalValue, totalAnnualDep, count: list.length };
    }, [assets]);

    const moveRows = useMemo(() => {
      void refreshKey;
      const out = [];
      const safeParse = (raw) => {
        try {
          const list = JSON.parse(raw || '[]');
          return Array.isArray(list) ? list : [];
        } catch {
          return [];
        }
      };
      const keys = Object.keys(localStorage || {});
      keys.forEach((k) => {
        if (!/^stock(In|Out)_/.test(k)) return;
        const isIn = k.startsWith('stockIn_');
        const list = safeParse(localStorage.getItem(k));
        list.forEach((r, sourceIndex) => {
          const name = String(r?.itemName || r?.name || '').trim();
          const qty = parseFloat(String(r?.quantity || 0)) || 0;
          out.push({
            id: String(r?.id || `${k}_${Math.random()}`),
            date: String(r?.date || r?.createdAt || '').slice(0, 10),
            dateTime: String(r?.createdAt || r?.timestamp || r?.dateTime || r?.date || ''),
            type: isIn ? 'IN' : 'OUT',
            itemType: String(r?.itemType || k.replace(/^stock(In|Out)_/, '') || ''),
            name,
            quantity: qty,
            unit: String(r?.unit || ''),
            unitCost: toMoney(r?.unitCost ?? r?.cost ?? r?.purchasePrice ?? (isIn ? (r?.pricePerItem ?? r?.price) : 0) ?? 0),
            sellingPrice: toMoney(r?.sellingPrice ?? r?.sellPrice ?? (!isIn ? (r?.pricePerItem ?? r?.price) : 0) ?? 0),
            reference: String(r?.reference || r?.ref || r?.saleId || r?.purchaseId || r?.invoiceNumber || r?.lpoNumber || ''),
            note: String(r?.note || r?.supplier || r?.description || r?.reason || ''),
            sourceKey: k,
            sourceIndex,
            raw: r
          });
        });
      });
      out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      return out;
    }, [refreshKey]);

    const inventoryItems = useMemo(() => {
      void refreshKey;
      try {
        const raw = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
        return Array.isArray(raw) ? raw : [];
      } catch {
        return [];
      }
    }, [refreshKey]);

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
      const term = (q || '').trim().toLowerCase();
      const base = (moveRows || []).filter((r) => {
        const d = new Date(String(r?.date || ''));
        if (isNaN(d)) return false;
        if (d < start || d > end) return false;
        if (type !== 'all' && String(r.type || '').toUpperCase() !== type.toUpperCase()) return false;
        return true;
      });
      return term
        ? base.filter((r) => {
            const hay = `${r.name || ''} ${r.itemType || ''} ${r.note || ''} ${r.reference || ''}`.toLowerCase();
            return hay.includes(term);
          })
        : base;
    }, [fromDate, moveRows, moveType, q, toDate]);

    const stockValueRows = useMemo(() => {
      const byKey = new Map();
      const meta = new Map();
      const tsOf = (r) => {
        const s = String(r?.dateTime || r?.raw?.createdAt || r?.raw?.timestamp || r?.date || '');
        const t = Date.parse(s);
        return Number.isFinite(t) ? t : Date.parse(`${String(r?.date || '')}T00:00:00`);
      };
      const asc = [...(moveRows || [])].sort((a, b) => tsOf(a) - tsOf(b));
      asc.forEach((r) => {
        const key = `${String(r.itemType || '').trim()}__${String(r.name || '').trim()}`;
        const cur = byKey.get(key) || 0;
        const next = cur + (String(r.type || '').toUpperCase() === 'IN' ? Number(r.quantity || 0) : -Number(r.quantity || 0));
        byKey.set(key, next);
        const m = meta.get(key) || {
          name: r.name,
          itemType: r.itemType,
          unit: r.unit,
          lastCost: 0,
          lastCostTs: 0,
          lastSeenTs: 0
        };
        const t = tsOf(r);
        m.name = r.name || m.name;
        m.itemType = r.itemType || m.itemType;
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
        const fallback = priceByName.get(String(m.name || '').toLowerCase()) || 0;
        const unitCost = Number(m.lastCost || 0) || fallback;
        rows.push({
          key,
          name: m.name || '—',
          itemType: m.itemType || '—',
          unit: m.unit || '—',
          qty: qn,
          unitCost,
          totalValue: qn * unitCost,
          updatedAt: m.lastSeenTs ? new Date(m.lastSeenTs).toISOString() : ''
        });
      });
      rows.sort((a, b) => b.totalValue - a.totalValue);
      return rows;
    }, [moveRows, priceByName]);

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
      const asc = [...movementRows].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
      const balanceByName = new Map();
      const withBal = asc.map((r) => {
        const key = `${String(r.itemType || '').trim()}__${String(r.name || '').trim()}`;
        const cur = balanceByName.get(key) || 0;
        const next = cur + (String(r.type || '').toUpperCase() === 'IN' ? Number(r.quantity || 0) : -Number(r.quantity || 0));
        balanceByName.set(key, next);
        return { ...r, balanceQty: next };
      });
      withBal.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      return withBal;
    }, [movementRows]);

    const kpis = useMemo(() => {
      const totalIn = rowsWithBalance.filter((r) => String(r.type || '').toUpperCase() === 'IN').reduce((s, r) => s + Number(r.quantity || 0), 0);
      const totalOut = rowsWithBalance.filter((r) => String(r.type || '').toUpperCase() === 'OUT').reduce((s, r) => s + Number(r.quantity || 0), 0);
      const balance = totalIn - totalOut;
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
      const rows = [
        ['#', 'Product', 'Type', 'Qty In', 'Qty Out', 'Unit Cost', 'Selling Price', 'Total Amount', 'Balance Qty', 'Reference', 'Date & Time', 'Note', 'Category']
      ];
      rowsWithBalance.forEach((r, idx) => {
        const qtyIn = String(r.type === 'IN' ? Number(r.quantity || 0) : 0);
        const qtyOut = String(r.type === 'OUT' ? Number(r.quantity || 0) : 0);
        const unitCost = r.unitCost ? String(r.unitCost) : '';
        const selling = r.sellingPrice ? String(r.sellingPrice) : '';
        const total = r.type === 'IN' ? Number(r.quantity || 0) * Number(r.unitCost || 0) : Number(r.quantity || 0) * Number(r.sellingPrice || 0);
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
      downloadCsvFile(`stock_movement_${new Date().toISOString().slice(0, 10)}.csv`, rows);
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
      downloadCsvFile(`stock_value_${new Date().toISOString().slice(0, 10)}.csv`, rows);
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
      setDeleteLoading(true);
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
        setDeleteLoading(false);
      }
    };

    return (
      <div className="space-y-5">
        <style>{`
          @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body * { visibility: hidden !important; }
            .report-print-scope, .report-print-scope * { visibility: visible !important; }
            .report-print-scope { position: absolute !important; inset: 0 !important; padding: 10px !important; background: white !important; zoom: 0.86; }
            .report-no-print { display: none !important; }
            .report-print-scope .overflow-auto { overflow: visible !important; }
            .report-print-scope table { width: 100% !important; min-width: 0 !important; }
            .report-print-scope th, .report-print-scope td { padding-top: 6px !important; padding-bottom: 6px !important; }
            .report-print-scope * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
            <button type="button" className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700" onClick={() => navigate('/purchases')}>
              <span className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Stock In
              </span>
            </button>
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

        <div className="report-print-scope bg-white border border-gray-200 rounded-2xl p-6">
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
                  <div className="flex items-center gap-2 report-no-print">
                    <select value={moveType} onChange={(e) => setMoveType(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm">
                      <option value="IN">Stock In</option>
                      <option value="OUT">Stock Out</option>
                    </select>
                    <button type="button" className="px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 inline-flex items-center gap-2" onClick={() => navigate('/purchases')}>
                      <Plus className="w-4 h-4" />
                      Add Stock In
                    </button>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-[1320px] w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-600">
                      <tr className="grid grid-cols-[60px_220px_110px_100px_110px_120px_120px_140px_120px_140px_170px_110px] px-5 py-3">
                        <th className="text-left tracking-wide">#</th>
                        <th className="text-left tracking-wide">PRODUCT</th>
                        <th className="text-left tracking-wide">TYPE</th>
                        <th className="text-right tracking-wide">QTY IN</th>
                        <th className="text-right tracking-wide">QTY OUT</th>
                        <th className="text-right tracking-wide">UNIT COST</th>
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
                        const total = r.type === 'IN' ? qtyIn * Number(r.unitCost || 0) : qtyOut * Number(r.sellingPrice || 0);
                        const dt = r.dateTime || r.date || '';
                        return (
                          <tr key={r.id} className="grid grid-cols-[60px_220px_110px_100px_110px_120px_120px_140px_120px_140px_170px_110px] px-5 py-3 items-center">
                            <td className="text-sm text-gray-700">{idx + 1}</td>
                            <td className="text-sm font-medium text-gray-900 truncate">{r.name || '—'}</td>
                            <td className="text-sm">
                              <span className={r.type === 'IN' ? 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium' : 'px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-medium'}>
                                {r.type === 'IN' ? 'Stock In' : 'Stock Out'}
                              </span>
                            </td>
                            <td className="text-sm text-gray-800 text-right">{qtyIn ? qtyIn.toLocaleString() : '—'}</td>
                            <td className="text-sm text-gray-800 text-right">{qtyOut ? qtyOut.toLocaleString() : '—'}</td>
                            <td className="text-sm text-gray-800 text-right">{r.unitCost ? `TSH ${money(r.unitCost)}` : '—'}</td>
                            <td className="text-sm text-gray-800 text-right">{r.sellingPrice ? `TSH ${money(r.sellingPrice)}` : '—'}</td>
                            <td className="text-sm text-gray-900 text-right">{total ? `TSH ${money(total)}` : '—'}</td>
                            <td className="text-sm text-gray-900 text-right">{Number(r.balanceQty || 0).toLocaleString()}</td>
                            <td className="text-sm text-gray-700 truncate">{r.reference ? String(r.reference) : '—'}</td>
                            <td className="text-sm text-gray-700">{dt ? String(dt).slice(0, 19).replace('T', ' ') : '—'}</td>
                            <td className="text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className={canDelete ? 'px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 inline-flex items-center gap-2' : 'px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed inline-flex items-center gap-2'}
                                  onClick={() => (canDelete ? openDeleteOne(r) : null)}
                                  disabled={!canDelete}
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
                      CSV
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
                  <button
                    type="button"
                    data-no-loading="true"
                    className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 inline-flex items-center gap-2"
                    onClick={() => navigate('/purchases')}
                  >
                    <Plus className="w-4 h-4" />
                    Add Stocks
                  </button>
                  <button type="button" data-no-loading="true" className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2" onClick={exportStockValueCSV}>
                    <Download className="w-4 h-4" />
                    CSV
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
                    Total assets: {assetsSummary.count} • Total value: TSH {money(assetsSummary.totalValue)} • Annual depreciation: TSH {money(assetsSummary.totalAnnualDep)}
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
                        placeholder="Time used (years)"
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
                            const value = toMoney(a?.value);
                            const years = parseFloat(String(a?.years || '').replace(/,/g, ''));
                            const annual = value && years ? value / years : 0;
                            return (
                              <div key={a.id} className="px-3 py-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{String(a?.name || '').trim() || '—'}</div>
                                  <div className="text-xs italic text-gray-600">
                                    Value: TSH {money(value)} • Years: {Number.isFinite(years) ? years : '—'} • Dep/yr: TSH {money(annual)}
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

        <ConfirmDeleteModal
          open={deleteOpen}
          title="Delete this stock record?"
          description="This will remove the selected stock movement record and cannot be undone."
          confirmText="Delete"
          loading={deleteLoading}
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
        const t = String(a?.type || '').toLowerCase();
        if (t === 'login' || t === 'logout') {
          out.push({
            id: String(a?.id || `act_${Math.random()}`),
            level: 'success',
            title: t === 'login' ? 'User signed in' : 'User signed out',
            details: String(a?.details || ''),
            user: 'System',
            module: 'Auth',
            ts: parseTime(a?.ts || Date.now())
          });
        }
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
    const clearOld = () => {
      try {
        localStorage.setItem('systemLogsCutoff', new Date().toISOString());
      } catch {}
      setNonce((n) => n + 1);
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
          <div>
            <div className="text-xs text-gray-500">Activity <span className="mx-1">›</span> System Logs</div>
            <div className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">System Logs</div>
            <div className="text-sm text-gray-600">All events, errors and security activity</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={marking ? 'px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold cursor-not-allowed' : 'px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50'} onClick={markAllRead} disabled={marking}>
              {marking ? 'Marking…' : '✓ Mark All Read'}
            </button>
            <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50" onClick={exportCSV}>Export</button>
            <button type="button" className={refreshing ? 'px-4 py-2 rounded-xl bg-green-600/80 text-white text-sm font-semibold flex items-center gap-2 cursor-not-allowed' : 'px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 flex items-center gap-2'} onClick={refresh} disabled={refreshing}>
              {refreshing ? <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" /> : <span className="w-4 h-4 rounded-full border-2 border-white/60" style={{ borderTopColor: 'transparent' }} />}
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
              <button type="button" className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100" onClick={clearOld}>Clear Old</button>
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

  if (page === 'sales-order') {
    return <SalesOrder />;
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
  if (page === 'purchase-planning') {
    return <PurchasePlanningGuide />;
  }
  if (page === 'expenses-analytics') {
    return <ExpensesAnalytics />;
  }
  if (page === 'settings-preferences') {
    return <SystemPreferences />;
  }
  if (page === 'alerts-low-stock') {
    return <LowStockAlerts />;
  }
  if (page === 'alerts-payment-due') {
    return <PaymentDueAlerts />;
  }
  if (page === 'reports-sales') {
    return <SalesReport />;
  }
  if (page === 'reports-expenses') {
    return <ExpensesReport />;
  }
  if (page === 'reports-production') {
    return <PurchaseReport />;
  }
  if (page === 'system-logs') {
    return <SystemLogs />;
  }

  return <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-700">Coming soon</div>;
}
