import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Printer, Mail, Share2, Trash2 } from 'lucide-react';
import { formatDisplayDate } from '../utils/date';
import { UNIT_LABELS, UNIT_OPTIONS } from '../utils/units';
import DateInput from '../shared/DateInput';
import PurchaseOrderPrint from '../shared/PurchaseOrderPrint';
import { flushSync } from 'react-dom';
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal';
import { canDeleteRecords } from '../utils/deletePassword';

const PO_SEQUENCE_STORAGE_KEY = 'purchaseOrderNextNumber';
const parsePoNumber = (value) => {
  const m = String(value || '').match(/(\d+)/);
  if (!m) return NaN;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : NaN;
};
const getNextPoNumber = () => {
  try {
    const v = parseInt(localStorage.getItem(PO_SEQUENCE_STORAGE_KEY) || '100', 10);
    return Number.isFinite(v) ? v : 100;
  } catch {
    return 100;
  }
};
const generateLpoNumber = () => {
  return String(getNextPoNumber()).padStart(4, '0');
};
const Purchases = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [pendingItemRowIndex, setPendingItemRowIndex] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', unit: 'kg', price: '' });
  const [companyInfo, setCompanyInfo] = useState({});
  const [poToPrint, setPoToPrint] = useState(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    openingBalance: '',
    openingBalanceAsOf: new Date().toISOString().split('T')[0],
    companyName: '',
    contactFirstName: '',
    contactLastName: '',
    jobTitle: '',
    phone: '',
    workPhone: '',
    mobile: '',
    fax: '',
    email: '',
    ccEmail: '',
    website: '',
    other: '',
    billedFrom: '',
    shippedFrom: ''
  });
  const [form, setForm] = useState({
    lpoNumber: generateLpoNumber(),
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    supplierName: '',
    supplierAddress: '',
    items: [{ item: '', description: '', qty: '', unit: 'kg', price: '', tax: '', total: 0 }],
    terms: '',
    notes: '',
    shipToName: '',
    shipToAddress: '',
    vendorMessage: '',
    memo: '',
  });
  useEffect(() => {
    const savedSuppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
    setSuppliers(savedSuppliers);
    const savedPurchases = JSON.parse(localStorage.getItem('purchases') || '[]');
    setPurchases(savedPurchases);
    try {
      const savedItems = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
      setInventoryItems(Array.isArray(savedItems) ? savedItems : []);
    } catch {
      setInventoryItems([]);
    }
    try {
      const existing = localStorage.getItem(PO_SEQUENCE_STORAGE_KEY);
      if (!existing) {
        const nums = (savedPurchases || [])
          .map((p) => String(p?.lpoNumber || '').trim())
          .filter((v) => /^\d{1,4}$/.test(v))
          .map((v) => parseInt(v, 10))
          .filter((n) => Number.isFinite(n));
        const max = nums.length ? Math.max(...nums) : null;
        const next = (max === null || max < 100) ? 100 : (max + 1);
        localStorage.setItem(PO_SEQUENCE_STORAGE_KEY, String(next));
      }
    } catch {}
    setForm(prev => ({ ...prev, lpoNumber: generateLpoNumber() }));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('purchaseDraft') || 'null';
      const draft = JSON.parse(raw);
      if (draft && Array.isArray(draft.items) && draft.items.length) {
        const items = draft.items.map((it) => ({
          item: String(it?.name || ''),
          description: '',
          qty: String(it?.qty || ''),
          unit: String(it?.unit || 'kg'),
          price: String(it?.price || ''),
          tax: '',
          total: 0
        }));
        setForm((prev) => ({ ...prev, items: items.length ? items : prev.items }));
        localStorage.removeItem('purchaseDraft');
      }
    } catch {}
  }, []);

  useEffect(() => {
    const loadCompanyInfo = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('companyInfo') || '{}');
        setCompanyInfo(saved || {});
      } catch {
        setCompanyInfo({});
      }
    };
    loadCompanyInfo();
    window.addEventListener('storage', loadCompanyInfo);
    window.addEventListener('companyInfoUpdated', loadCompanyInfo);
    return () => {
      window.removeEventListener('storage', loadCompanyInfo);
      window.removeEventListener('companyInfoUpdated', loadCompanyInfo);
    };
  }, []);

  useEffect(() => {
    const done = () => setPoToPrint(null);
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        const savedItems = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
        setInventoryItems(Array.isArray(savedItems) ? savedItems : []);
      } catch {
        setInventoryItems([]);
      }
    };
    window.addEventListener('dataUpdated', handler);
    return () => window.removeEventListener('dataUpdated', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        const savedPurchases = JSON.parse(localStorage.getItem('purchases') || '[]');
        setPurchases(Array.isArray(savedPurchases) ? savedPurchases : []);
      } catch {
        setPurchases([]);
      }
    };
    window.addEventListener('dataUpdated', handler);
    return () => window.removeEventListener('dataUpdated', handler);
  }, []);

  const itemCatalog = useMemo(() => {
    const map = new Map();
    const upsert = (name, unit, price, date) => {
      const key = (name || '').trim();
      if (!key) return;
      const existing = map.get(key);
      const nextDate = String(date || '');
      const next = {
        name: key,
        unit: unit ? String(unit) : (existing?.unit || ''),
        price: Number.isFinite(Number(price)) ? Number(price) : (existing?.price ?? null),
        lastDate: nextDate || (existing?.lastDate || '')
      };
      if (existing?.lastDate && nextDate && nextDate < existing.lastDate) {
        next.unit = existing.unit;
        next.price = existing.price;
        next.lastDate = existing.lastDate;
      }
      map.set(key, next);
    };

    (inventoryItems || []).forEach((it) => upsert(it?.name, it?.unit, it?.price, it?.updatedAt || it?.createdAt || ''));
    (suppliers || []).forEach((s) => {
      (s?.items || []).forEach((it) => upsert(it?.name, it?.unit, it?.price, ''));
    });
    (purchases || []).forEach((p) => {
      (p?.items || []).forEach((it) => upsert(it?.item, it?.unit, it?.price, p?.date || ''));
    });
    (form?.items || []).forEach((it) => upsert(it?.item, it?.unit, it?.price, form?.date || ''));

    try {
      const keys = Object.keys(localStorage || {});
      keys.forEach((k) => {
        if (!/^stockIn_/.test(k)) return;
        try {
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          (Array.isArray(list) ? list : []).forEach((r) => {
            const itemName = r?.itemName;
            if (!itemName) return;
            upsert(itemName, r?.unit, r?.pricePerItem, r?.date || '');
          });
        } catch {}
      });
    } catch {}

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventoryItems, suppliers, purchases, form.items, form.date]);

  const units = useMemo(() => UNIT_OPTIONS, []);

  const openAddItemForRow = (rowIndex) => {
    setPendingItemRowIndex(rowIndex);
    setNewItem({ name: '', unit: 'kg', price: '' });
    setShowAddItem(true);
  };

  const applyItemToRow = (rowIndex, name) => {
    const chosen = itemCatalog.find((x) => x.name === name);
    const next = [...form.items];
    next[rowIndex] = { ...next[rowIndex], item: name };
    if (chosen?.unit) next[rowIndex].unit = chosen.unit;
    const chosenBuying = chosen?.buyingPrice ?? chosen?.buyPrice ?? chosen?.costPrice ?? chosen?.price;
    if (chosenBuying !== null && chosenBuying !== undefined && String(next[rowIndex].price || '').trim() === '') {
      next[rowIndex].price = String(chosenBuying);
    }
    const qty = parseFloat(next[rowIndex].qty) || 0;
    const price = parseFloat(next[rowIndex].price) || 0;
    const taxPct = parseFloat(next[rowIndex].tax) || 0;
    const lineAmount = qty * price;
    const lineTax = (lineAmount * taxPct) / 100;
    next[rowIndex].total = (lineAmount + lineTax).toFixed(2);
    setForm((prev) => ({ ...prev, items: next }));
  };

  const saveNewItem = () => {
    const name = (newItem.name || '').trim();
    if (!name) return;
    const buyingPrice = parseFloat(newItem.price || '0') || 0;
    const record = {
      id: `ITEM-${Date.now()}`,
      name,
      unit: (newItem.unit || 'kg').trim() || 'kg',
      buyingPrice,
      price: buyingPrice,
      createdAt: new Date().toISOString()
    };
    try {
      const existing = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
      const list = Array.isArray(existing) ? existing : [];
      const has = list.some((x) => String(x?.name || '').trim().toLowerCase() === name.toLowerCase());
      const next = has ? list : [...list, record];
      localStorage.setItem('inventoryItems', JSON.stringify(next));
      setInventoryItems(next);
    } catch {
      const next = [...inventoryItems, record];
      localStorage.setItem('inventoryItems', JSON.stringify(next));
      setInventoryItems(next);
    }
    if (form.supplierId) {
      try {
        const current = JSON.parse(localStorage.getItem('suppliers') || '[]');
        const list = Array.isArray(current) ? current : [];
        const idx = list.findIndex((s) => String(s.id) === String(form.supplierId));
        if (idx >= 0) {
          const s = list[idx];
          const items = Array.isArray(s.items) ? s.items.slice() : [];
          const has = items.some((x) => String(x?.name || '').trim().toLowerCase() === name.toLowerCase());
          if (!has) items.push({ name, unit: record.unit, price: record.price });
          list[idx] = { ...s, items };
          localStorage.setItem('suppliers', JSON.stringify(list));
          setSuppliers(list);
        }
      } catch {}
    }
    if (pendingItemRowIndex !== null) {
      applyItemToRow(pendingItemRowIndex, name);
    }
    setShowAddItem(false);
    setPendingItemRowIndex(null);
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  const handleSupplierSelect = (e) => {
    const supplierId = e.target.value;
    if (supplierId === '__add_new_supplier__') {
      setShowAddSupplier(true);
      return;
    }
    const supplier = suppliers.find(s=>s.id===supplierId);
    setForm(prev => ({
      ...prev,
      supplierId,
      supplierName: supplier ? supplier.name : '',
      supplierAddress: supplier ? (supplier.address || '') : '',
      items: supplier && Array.isArray(supplier.items) && supplier.items.length>0
        ? supplier.items.map(it => ({ item: it.name, description: '', qty: '', unit: it.unit || 'kg', price: it.price || '', tax: '', total: 0 }))
        : [{ item: '', description: '', qty: '', unit: 'kg', price: '', tax: '', total: 0 }]
    }));
  };
  const handleItemChange = (i, field, value) => {
    const next = [...form.items];
    next[i][field] = value;
    const qty = parseFloat(next[i].qty) || 0;
    const price = parseFloat(next[i].price) || 0;
    const taxPct = parseFloat(next[i].tax) || 0;
    const lineAmount = qty * price;
    const lineTax = (lineAmount * taxPct) / 100;
    next[i].total = (lineAmount + lineTax).toFixed(2);
    setForm(prev => ({ ...prev, items: next }));
  };
  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { item: '', description: '', qty: '', unit: 'kg', price: '', tax: '', total: 0 }] }));
  };
  const subtotal = form.items.reduce((sum, it)=> sum + (parseFloat(it.qty||0) * parseFloat(it.price||0)), 0);
  const taxTotal = form.items.reduce((sum, it)=> {
    const qty = parseFloat(it.qty||0);
    const price = parseFloat(it.price||0);
    const taxPct = parseFloat(it.tax||0);
    return sum + ((qty*price*taxPct)/100);
  }, 0);
  const grandTotal = subtotal + taxTotal;
  const vendorPurchases = purchases.filter(p=>p.supplierId===form.supplierId);
  const selectedVendor = suppliers.find(s=>s.id===form.supplierId);
  const saveNewSupplier = () => {
    const name = (newSupplier.name || '').trim();
    if (!name) return;
    const id = `SUP-${Date.now()}`;
    const record = {
      id,
      name,
      email: (newSupplier.email || '').trim(),
      phone: (newSupplier.phone || '').trim(),
      address: (newSupplier.billedFrom || '').trim(),
      openingBalance: (newSupplier.openingBalance || '').trim(),
      openingBalanceAsOf: (newSupplier.openingBalanceAsOf || '').trim(),
      companyName: (newSupplier.companyName || '').trim(),
      contactFirstName: (newSupplier.contactFirstName || '').trim(),
      contactLastName: (newSupplier.contactLastName || '').trim(),
      jobTitle: (newSupplier.jobTitle || '').trim(),
      workPhone: (newSupplier.workPhone || '').trim(),
      mobile: (newSupplier.mobile || '').trim(),
      fax: (newSupplier.fax || '').trim(),
      ccEmail: (newSupplier.ccEmail || '').trim(),
      website: (newSupplier.website || '').trim(),
      other: (newSupplier.other || '').trim(),
      billedFrom: (newSupplier.billedFrom || '').trim(),
      shippedFrom: (newSupplier.shippedFrom || '').trim(),
      items: []
    };
    const next = [...suppliers, record];
    localStorage.setItem('suppliers', JSON.stringify(next));
    setSuppliers(next);
    setForm(prev => ({ ...prev, supplierId: id, supplierName: record.name, supplierAddress: record.address || '' }));
    setNewSupplier({
      name: '',
      openingBalance: '',
      openingBalanceAsOf: new Date().toISOString().split('T')[0],
      companyName: '',
      contactFirstName: '',
      contactLastName: '',
      jobTitle: '',
      phone: '',
      workPhone: '',
      mobile: '',
      fax: '',
      email: '',
      ccEmail: '',
      website: '',
      other: '',
      billedFrom: '',
      shippedFrom: ''
    });
    setShowAddSupplier(false);
  };
  const savePurchase = () => {
    const isEdit = Boolean(editingPurchaseId);
    try {
      const existing = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
      const list = Array.isArray(existing) ? existing : [];
      const map = new Map(list.map((x) => [String(x?.name || '').trim().toLowerCase(), x]));
      (form.items || []).forEach((it) => {
        const name = String(it?.item || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (map.has(key)) return;
        map.set(key, {
          id: `ITEM-${Date.now()}-${Math.random()}`,
          name,
          unit: String(it?.unit || 'kg'),
          price: parseFloat(it?.price || '0') || 0,
          createdAt: new Date().toISOString()
        });
      });
      const nextItems = Array.from(map.values());
      localStorage.setItem('inventoryItems', JSON.stringify(nextItems));
      setInventoryItems(nextItems);
    } catch {}
    const record = { id: isEdit ? editingPurchaseId : Date.now(), ...form, subtotal, taxTotal, total: grandTotal };
    const next = (() => {
      const list = Array.isArray(purchases) ? purchases.slice() : [];
      if (!isEdit) return [...list, record];
      const idx = list.findIndex((p) => String(p?.id) === String(editingPurchaseId));
      if (idx >= 0) {
        list[idx] = record;
        return list;
      }
      return [...list, record];
    })();
    localStorage.setItem('purchases', JSON.stringify(next));
    setPurchases(next);
    try {
      if (!isEdit) {
        const cur = parsePoNumber(form.lpoNumber) || getNextPoNumber();
        const nextPo = (Number.isFinite(cur) ? cur : 100) + 1;
        localStorage.setItem(PO_SEQUENCE_STORAGE_KEY, String(nextPo));
      }
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('dataUpdated'));
    } catch {}
    setEditingPurchaseId(null);
    setForm({ lpoNumber: generateLpoNumber(), date: new Date().toISOString().split('T')[0], supplierId: '', supplierName: '', supplierAddress: '', items: [{ item: '', description: '', qty: '', unit: 'kg', price: '', tax: '', total: 0 }], terms: '', notes: '', shipToName: '', shipToAddress: '', vendorMessage: '', memo: '' });
  };
  const loadPurchase = (p) => {
    if (!p) return;
    setEditingPurchaseId(p.id || null);
    setForm({
      lpoNumber: p.lpoNumber || generateLpoNumber(),
      date: p.date || new Date().toISOString().split('T')[0],
      supplierId: p.supplierId || '',
      supplierName: p.supplierName || '',
      supplierAddress: p.supplierAddress || '',
      items: Array.isArray(p.items) && p.items.length > 0 ? p.items : [{ item: '', description: '', qty: '', unit: 'kg', price: '', tax: '', total: 0 }],
      terms: p.terms || '',
      notes: p.notes || '',
      shipToName: p.shipToName || '',
      shipToAddress: p.shipToAddress || '',
      vendorMessage: p.vendorMessage || '',
      memo: p.memo || ''
    });
    setShowShareMenu(false);
  };
  const saveAndClose = () => {
    savePurchase();
  };
  const clearForm = () => {
    setEditingPurchaseId(null);
    setForm({ lpoNumber: generateLpoNumber(), date: new Date().toISOString().split('T')[0], supplierId: '', supplierName: '', supplierAddress: '', items: [{ item: '', description: '', qty: '', unit: 'kg', price: '', tax: '', total: 0 }], terms: '', notes: '', shipToName: '', shipToAddress: '', vendorMessage: '', memo: '' });
  };

  const confirmDeletePurchase = () => {
    if (deleteLoading) return;
    const purchaseId = editingPurchaseId;
    if (!purchaseId) {
      setDeleteModal(false);
      return;
    }
    if (!canDeleteRecords()) {
      setDeleteModal(false);
      return;
    }
    setDeleteLoading(true);
    try {
      const list = JSON.parse(localStorage.getItem('purchases') || '[]');
      const next = (Array.isArray(list) ? list : []).filter((p) => String(p?.id) !== String(purchaseId));
      localStorage.setItem('purchases', JSON.stringify(next));
      setPurchases(next);
      try {
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}
    } catch {}
    setDeleteLoading(false);
    setDeleteModal(false);
    setEditingPurchaseId(null);
    clearForm();
    navigate('/purchases/history');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openId = params.get('open');
    if (!openId || !Array.isArray(purchases) || purchases.length === 0) return;
    const found = purchases.find((p) => String(p.id) === String(openId));
    if (found) {
      loadPurchase(found);
      navigate('/purchases', { replace: true });
    }
  }, [location.search, purchases, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vendorId = params.get('vendorId');
    if (!vendorId || !Array.isArray(suppliers) || suppliers.length === 0) return;
    const supplier = suppliers.find((s) => String(s.id) === String(vendorId));
    if (!supplier) return;
    setForm((prev) => ({
      ...prev,
      supplierId: supplier.id,
      supplierName: supplier.name || '',
      supplierAddress: supplier.address || '',
      items: supplier && Array.isArray(supplier.items) && supplier.items.length > 0
        ? supplier.items.map((it) => ({ item: it.name, description: '', qty: '', unit: it.unit || 'kg', price: it.price || '', tax: '', total: 0 }))
        : prev.items
    }));
  }, [location.search, suppliers]);

  return (
    <div className="space-y-6">
      <ConfirmDeleteModal
        open={deleteModal}
        title="Delete Purchase Order?"
        description="This purchase order will be permanently deleted and cannot be recovered."
        confirmText="Delete"
        loading={deleteLoading}
        onCancel={() => (deleteLoading ? null : setDeleteModal(false))}
        onConfirm={confirmDeletePurchase}
      />
      <style>{`
        @page { margin: 0; size: A4; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          .po-print-preview, .po-print-preview * { visibility: visible !important; }
          .po-print-preview {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
        }
      `}</style>
      <div className="po-print-preview" style={{ display: 'none' }}>
        {poToPrint ? (
          <PurchaseOrderPrint
            companyDetails={companyInfo}
            poNumber={poToPrint.lpoNumber}
            date={poToPrint.date}
            deliveryDate={poToPrint.deliveryDate}
            billToName={poToPrint.supplierName}
            billToAddress={poToPrint.supplierAddress}
            items={poToPrint.items}
            notes={poToPrint.notes || poToPrint.vendorMessage || poToPrint.memo}
            subtotal={poToPrint.subtotal}
            taxTotal={poToPrint.taxTotal}
            total={poToPrint.total}
            currencyLabel="TZS"
          />
        ) : null}
      </div>
      {showAddSupplier && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg w-11/12 md:w-[900px] overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold">Add New Supplier</div>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={()=>setShowAddSupplier(false)}>Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                  <input value={newSupplier.name} onChange={(e)=>setNewSupplier(prev=>({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Vendor name" />
                </div>
                <div className="lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                  <input value={newSupplier.openingBalance} onChange={(e)=>setNewSupplier(prev=>({ ...prev, openingBalance: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0" />
                </div>
                <div className="lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">As Of</label>
                  <DateInput value={newSupplier.openingBalanceAsOf} onChange={(e)=>setNewSupplier(prev=>({ ...prev, openingBalanceAsOf: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>

                <div className="lg:col-span-7">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Address Info</div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-12">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input value={newSupplier.companyName} onChange={(e)=>setNewSupplier(prev=>({ ...prev, companyName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Doing Business As..." />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input value={newSupplier.contactFirstName} onChange={(e)=>setNewSupplier(prev=>({ ...prev, contactFirstName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="First" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input value={newSupplier.contactLastName} onChange={(e)=>setNewSupplier(prev=>({ ...prev, contactLastName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Last" />
                    </div>
                    <div className="md:col-span-12">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                      <input value={newSupplier.jobTitle} onChange={(e)=>setNewSupplier(prev=>({ ...prev, jobTitle: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Job title" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Main Phone</label>
                      <input value={newSupplier.phone} onChange={(e)=>setNewSupplier(prev=>({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Main phone" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Main Email</label>
                      <input value={newSupplier.email} onChange={(e)=>setNewSupplier(prev=>({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Main email" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Phone</label>
                      <input value={newSupplier.workPhone} onChange={(e)=>setNewSupplier(prev=>({ ...prev, workPhone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Work phone" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                      <input value={newSupplier.mobile} onChange={(e)=>setNewSupplier(prev=>({ ...prev, mobile: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Mobile" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                      <input value={newSupplier.fax} onChange={(e)=>setNewSupplier(prev=>({ ...prev, fax: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Fax" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">CC Email</label>
                      <input value={newSupplier.ccEmail} onChange={(e)=>setNewSupplier(prev=>({ ...prev, ccEmail: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="CC email" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input value={newSupplier.website} onChange={(e)=>setNewSupplier(prev=>({ ...prev, website: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Website" />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other</label>
                      <input value={newSupplier.other} onChange={(e)=>setNewSupplier(prev=>({ ...prev, other: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Other" />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Address Details</div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Billed From</label>
                      <textarea value={newSupplier.billedFrom} onChange={(e)=>setNewSupplier(prev=>({ ...prev, billedFrom: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24" placeholder="Billed from address" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Shipped From</label>
                      <textarea value={newSupplier.shippedFrom} onChange={(e)=>setNewSupplier(prev=>({ ...prev, shippedFrom: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24" placeholder="Shipped from address" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100" onClick={()=>{ setNewSupplier({ name: '', openingBalance: '', openingBalanceAsOf: new Date().toISOString().split('T')[0], companyName: '', contactFirstName: '', contactLastName: '', jobTitle: '', phone: '', workPhone: '', mobile: '', fax: '', email: '', ccEmail: '', website: '', other: '', billedFrom: '', shippedFrom: '' }); setShowAddSupplier(false); }}>Cancel</button>
                <button type="button" className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={saveNewSupplier}>Save Supplier</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddItem && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg w-11/12 md:w-[560px] overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold">Add New Item</div>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={()=>{ setShowAddItem(false); setPendingItemRowIndex(null); }}>Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input value={newItem.name} onChange={(e)=>setNewItem(prev=>({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Item name" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select value={newItem.unit} onChange={(e)=>setNewItem(prev=>({ ...prev, unit: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    {units.map((u)=> <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Rate</label>
                  <input type="number" value={newItem.price} onChange={(e)=>setNewItem(prev=>({ ...prev, price: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100" onClick={()=>{ setShowAddItem(false); setPendingItemRowIndex(null); }}>Cancel</button>
                <button type="button" className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={saveNewItem}>Save Item</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-gray-900 font-semibold">Purchase Order</div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                const snapshot = {
                  ...form,
                  supplierName: form.supplierName || selectedVendor?.name || '',
                  supplierAddress: form.supplierAddress || selectedVendor?.address || '',
                  subtotal,
                  taxTotal,
                  total: grandTotal
                };
                flushSync(() => setPoToPrint(snapshot));
                window.print();
              }}
            >
              <Printer className="w-4 h-4" />
              <span className="text-sm">Print</span>
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                const subject = encodeURIComponent(`Purchase Order ${form.lpoNumber}`);
                const body = encodeURIComponent(`Dear ${selectedVendor?.name || 'Vendor'},\n\nPlease find Purchase Order ${form.lpoNumber} dated ${formatDisplayDate(form.date)}.\nTotal: ${grandTotal.toLocaleString()}\n\nThank you.`);
                window.location.href = `mailto:${selectedVendor?.email || ''}?subject=${subject}&body=${body}`;
              }}
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email</span>
            </button>
            <div className="relative">
              <button
                className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
                onClick={()=>setShowShareMenu(v=>!v)}
              >
                <Share2 className="w-4 h-4" />
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
                      const summary = `Purchase Order ${form.lpoNumber} • Date ${formatDisplayDate(form.date)}\nVendor: ${selectedVendor?.name || ''}\nTotal: ${grandTotal.toLocaleString()}`;
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(summary);
                      }
                      setShowShareMenu(false);
                    }}
                  >
                    Copy Summary
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-6">
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
              <div className="grid grid-cols-4 gap-4 items-start">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
                  <select value={form.supplierId} onChange={handleSupplierSelect} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-gray-700">
                    <option value="">Select Supplier</option>
                    <option value="__add_new_supplier__">+ Add New Supplier</option>
                    {suppliers.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                      <DateInput name="date" value={form.date} onChange={handleChange} className="w-52 px-3 py-2 border border-gray-300 rounded-lg text-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">P.O. No.</label>
                      <input type="text" value={form.lpoNumber} readOnly className="w-52 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700" />
                    </div>
                  </div>
                </div>
            </div>
            </div>
            <div className="grid grid-cols-12 gap-4 items-start mb-6">
              <div className="col-span-6"></div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
                <textarea name="supplierAddress" value={form.supplierAddress} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm h-20" placeholder="Vendor address" />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Ship To</label>
                <textarea name="shipToAddress" value={form.shipToAddress} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm h-20" placeholder="Shipping address" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="text-gray-900 font-semibold">ITEMS</div>
                <button className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2" onClick={addItem}>
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Line</span>
                </button>
              </div>
              <div className="p-4 overflow-auto">
                <table className="min-w-[980px] w-full table-fixed border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center w-1/12 border border-gray-200">No.</th>
                      <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-3/12 border border-gray-200">Item</th>
                      <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-3/12 border border-gray-200">Description</th>
                      <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Qty</th>
                      <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-2/12 border border-gray-200">Unit</th>
                      <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-2/12 border border-gray-200">Rate</th>
                      <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Tax %</th>
                      <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-2/12 border border-gray-200">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it,i)=>(
                      <tr key={i} className="align-middle">
                        <td className="px-3 py-2 border border-gray-200 text-center text-sm text-gray-600">{i + 1}</td>
                        <td className="px-3 py-2 border border-gray-200">
                          <select
                            className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none"
                            value={it.item}
                            onChange={(e)=>{
                              const v = e.target.value;
                              if (v === '__add_new_item__') {
                                openAddItemForRow(i);
                                return;
                              }
                              applyItemToRow(i, v);
                            }}
                          >
                            <option value="">Select item</option>
                            <option value="__add_new_item__">+ Add new item</option>
                            {itemCatalog.map((x)=> <option key={x.name} value={x.name}>{x.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={it.description} onChange={(e)=>handleItemChange(i,'description',e.target.value)} placeholder="Description" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input type="number" className="w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none" value={it.qty} onChange={(e)=>handleItemChange(i,'qty',e.target.value)} placeholder="0" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <select className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={it.unit} onChange={(e)=>handleItemChange(i,'unit',e.target.value)}>
                            {units.map((u) => (
                              <option key={u} value={u}>
                                {UNIT_LABELS[u] || u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input type="number" className="w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none" value={it.price} onChange={(e)=>handleItemChange(i,'price',e.target.value)} placeholder="0.00" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input type="number" className="w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none" value={it.tax} onChange={(e)=>handleItemChange(i,'tax',e.target.value)} placeholder="0" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200 text-right">
                          <span className="text-sm">TZS {it.total ? parseFloat(it.total).toLocaleString() : '0.00'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
              <div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-sm">
                  <div className="text-sm font-medium text-gray-700 mb-1">Message</div>
                  <textarea name="vendorMessage" value={form.vendorMessage} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg h-14 text-sm" placeholder="Message displayed on purchase order" />
                </div>
                <div className="mt-4 max-w-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Memo</label>
                  <input name="memo" value={form.memo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Memo" />
                </div>
              </div>
              <div className="w-full max-w-md ml-auto">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-medium">TZS {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700 mt-1">
                  <span>Tax</span>
                  <span className="font-medium">TZS {taxTotal.toLocaleString()}</span>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div className="text-xs text-gray-500 tracking-wide">TOTAL</div>
                  <div className="text-2xl font-semibold text-gray-900">TZS {grandTotal.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className="mt-6 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              {editingPurchaseId && canDeleteRecords() ? (
                <button
                  type="button"
                  onClick={() => setDeleteModal(true)}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 inline-flex items-center gap-2 mr-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : null}
              <button type="button" onClick={clearForm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100">Clear</button>
              <button type="button" onClick={savePurchase} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save & New</button>
              <button type="button" onClick={saveAndClose} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Save & Close</button>
            </div>
          </div>
          <div className="border-l border-gray-200 bg-gray-50 p-5">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Vendor</div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between"><span>Name</span><span className="font-medium text-gray-900">{form.supplierName || '—'}</span></div>
                <div className="flex justify-between"><span>Phone</span><span className="font-medium text-gray-900">{(suppliers.find(s=>s.id===form.supplierId)?.phone)||'—'}</span></div>
                <div className="flex justify-between"><span>Open balance</span><span className="font-medium text-gray-900">TZS {((parseFloat(selectedVendor?.openingBalance)||0) + purchases.filter(p=>p.supplierId===form.supplierId).reduce((s,p)=> s + (parseFloat(p.total)||0),0)).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>POs to be received</span><span className="font-medium text-gray-900">{purchases.filter(p=>p.supplierId===form.supplierId).length}</span></div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Recent Transactions</div>
              <div className="space-y-1 text-sm text-gray-700 italic">
                {vendorPurchases.length > 0 ? (
                  vendorPurchases.slice(-5).reverse().map(p => (
                    <div key={p.id} className="flex justify-between">
                      <span>{formatDisplayDate(p.date)}</span>
                      <span className="font-medium">TZS {parseFloat(p.total||0).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No transactions</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Purchases;
