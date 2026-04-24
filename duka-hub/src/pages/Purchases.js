/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Printer, Mail, Share2, Trash2, Loader2 } from 'lucide-react';
import { formatDisplayDate } from '../utils/date';
import { UNIT_LABELS, UNIT_OPTIONS } from '../utils/units';
import DateInput from '../shared/DateInput';
import PurchaseOrderPrint from '../shared/PurchaseOrderPrint';
import { flushSync } from 'react-dom';
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal';
import { canDeleteRecords } from '../utils/deletePassword';
import { appendSystemActivity } from '../utils/systemActivity';
import { productsApi } from '../services/productsApi';
import { purchasesApi, suppliersApi } from '../services/purchasingApi';
import { withMinimumDelay } from '../utils/loadingDelay';

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
  },
  del(key, options) {
    let ok = false;
    try {
      window.localStorage.removeItem(String(key || ''));
      ok = true;
    } catch {}
    if (ok && !options?.silent) {
      try {
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}
    }
  },
  list() {
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
      return keys.sort();
    } catch {
      return [];
    }
  }
};

const getStoredJson = (key, fallback) => localStore.get(key, fallback);
const setStoredJson = (key, value) => Promise.resolve(localStore.set(key, value));

const PO_SEQUENCE_STORAGE_KEY = 'purchaseOrderNextNumber';
const parsePoNumber = (value) => {
  const m = String(value || '').match(/(\d+)/);
  if (!m) return NaN;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : NaN;
};
const generateLpoNumber = (n) => {
  const v = parseInt(String(n ?? 1), 10);
  const safe = Number.isFinite(v) && v > 0 ? v : 1;
  return `PO${String(safe).padStart(5, '0')}`;
};

const createEmptyPurchaseForm = (purchaseNumber) => ({
  lpoNumber: String(purchaseNumber || generateLpoNumber(1)),
  date: new Date().toISOString().split('T')[0],
  supplierId: '',
  supplierName: '',
  supplierAddress: '',
  destination: 'stock',
  items: [{ item: '', _custom: false, description: '', qty: '', unit: 'kg', price: '', tax: '', total: 0 }],
  terms: '',
  notes: '',
  shipToName: '',
  shipToAddress: '',
  vendorMessage: '',
  memo: '',
});
const Purchases = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [saveLoading, setSaveLoading] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
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
  const [form, setForm] = useState(() => createEmptyPurchaseForm(generateLpoNumber(1)));
  const [nextPoNumber, setNextPoNumber] = useState(1);
  const refreshNextPoNumber = useCallback(async () => {
    try {
      const nextNumber = await purchasesApi.previewNextNumber();
      const parsed = parsePoNumber(nextNumber);
      if (Number.isFinite(parsed) && parsed > 0) {
        setNextPoNumber(parsed);
        return nextNumber;
      }
    } catch {}
    const fallback = generateLpoNumber(nextPoNumber);
    const parsedFallback = parsePoNumber(fallback);
    if (Number.isFinite(parsedFallback) && parsedFallback > 0) {
      setNextPoNumber(parsedFallback);
    }
    return fallback;
  }, [nextPoNumber]);
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const [savedSuppliers, savedPurchases, savedItems, savedNextNumber, previewNumber] = await Promise.all([
          suppliersApi.list(),
          purchasesApi.list(),
          productsApi.list(),
          getStoredJson(PO_SEQUENCE_STORAGE_KEY, null),
          purchasesApi.previewNextNumber().catch(() => '')
        ]);
        if (!alive) return;
        const suppliersList = Array.isArray(savedSuppliers) ? savedSuppliers : [];
        const purchasesList = Array.isArray(savedPurchases) ? savedPurchases : [];
        const itemsList = Array.isArray(savedItems) ? savedItems : [];
        setSuppliers(suppliersList);
        setPurchases(purchasesList);
        setInventoryItems(itemsList);

        const nextFromStore = parseInt(String(savedNextNumber ?? ''), 10);
        const nextComputed = (() => {
          const nums = (purchasesList || [])
            .map((p) => String(p?.lpoNumber || '').trim())
            .map((v) => parsePoNumber(v))
            .filter((n) => Number.isFinite(n));
          const max = nums.length ? Math.max(...nums) : null;
          const next = max === null || max < 1 ? 1 : max + 1;
          return next;
        })();
        const next = Number.isFinite(nextFromStore) && nextFromStore >= 1 ? nextFromStore : nextComputed;
        const resolvedPreview = String(previewNumber || '').trim() || generateLpoNumber(next);
        const previewValue = parsePoNumber(resolvedPreview);
        void setStoredJson(PO_SEQUENCE_STORAGE_KEY, next).catch(() => {});
        setNextPoNumber(Number.isFinite(previewValue) && previewValue > 0 ? previewValue : next);
        setForm((prev) => ({ ...prev, lpoNumber: resolvedPreview }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const draft = await getStoredJson('purchaseDraft', null);
        if (!alive) return;
        if (draft && Array.isArray(draft.items) && draft.items.length) {
          const items = draft.items.map((it) => ({
            item: String(it?.name || ''),
            _custom: false,
            description: '',
            qty: String(it?.qty || ''),
            unit: String(it?.unit || 'kg'),
            price: String(it?.price || ''),
            tax: '',
            total: 0
          }));
          setForm((prev) => ({ ...prev, items: items.length ? items : prev.items }));
          void setStoredJson('purchaseDraft', null).catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const loadCompanyInfo = () => {
      Promise.resolve()
        .then(async () => {
          const saved = await getStoredJson('companyInfo', {});
          setCompanyInfo(saved && typeof saved === 'object' ? saved : {});
        })
        .catch(() => {});
    };
    loadCompanyInfo();
    window.addEventListener('companyInfoUpdated', loadCompanyInfo);
    return () => {
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
      Promise.resolve()
        .then(async () => {
          const itemsList = await getStoredJson('inventoryItems', []);
          setInventoryItems(Array.isArray(itemsList) ? itemsList : []);
        })
        .catch(() => {});
    };
    window.addEventListener('dataUpdated', handler);
    return () => window.removeEventListener('dataUpdated', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      Promise.resolve()
        .then(async () => {
          const purchasesList = await purchasesApi.list();
          setPurchases(Array.isArray(purchasesList) ? purchasesList : []);
        })
        .catch(() => {});
    };
    window.addEventListener('dataUpdated', handler);
    return () => window.removeEventListener('dataUpdated', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      Promise.resolve()
        .then(async () => {
          const suppliersList = await suppliersApi.list();
          setSuppliers(Array.isArray(suppliersList) ? suppliersList : []);
        })
        .catch(() => {});
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

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventoryItems, suppliers]);

  const units = useMemo(() => UNIT_OPTIONS, []);
  const currentEditingPurchase = useMemo(
    () => (Array.isArray(purchases) ? purchases.find((p) => String(p?.id || '') === String(editingPurchaseId || '')) || null : null),
    [purchases, editingPurchaseId]
  );

  const applyItemToRow = (rowIndex, name) => {
    if (String(name || '') === '__other__') {
      const next = [...form.items];
      next[rowIndex] = { ...next[rowIndex], item: '', _custom: true };
      const qty = parseFloat(next[rowIndex].qty) || 0;
      const price = parseFloat(next[rowIndex].price) || 0;
      const taxPct = parseFloat(next[rowIndex].tax) || 0;
      const lineAmount = qty * price;
      const lineTax = (lineAmount * taxPct) / 100;
      next[rowIndex].total = (lineAmount + lineTax).toFixed(2);
      setForm((prev) => ({ ...prev, items: next }));
      return;
    }
    const chosen = itemCatalog.find((x) => x.name === name);
    const next = [...form.items];
    next[rowIndex] = { ...next[rowIndex], item: name, _custom: false };
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
        ? supplier.items.map(it => ({ item: it.name, _custom: false, description: '', qty: '', unit: it.unit || 'kg', price: it.price || '', tax: '', total: 0 }))
        : [{ item: '', _custom: false, description: '', qty: '', unit: 'kg', price: '', tax: '', total: 0 }]
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
    setForm(prev => ({ ...prev, items: [...prev.items, { item: '', _custom: false, description: '', qty: '', unit: 'kg', price: '', tax: '', total: 0 }] }));
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
    if (supplierSaving) return;
    const name = (newSupplier.name || '').trim();
    if (!name) return;
    setSupplierSaving(true);
    (async () => {
      try {
        const record = await suppliersApi.create({
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
          shippedFrom: (newSupplier.shippedFrom || '').trim()
        });
        setSuppliers((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          return [record, ...list.filter((entry) => String(entry?.id || '') !== String(record?.id || ''))];
        });
        setForm((prev) => ({ ...prev, supplierId: record.id, supplierName: record.name, supplierAddress: record.address || record.billedFrom || '' }));
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
        setFeedback('Supplier saved');
        window.setTimeout(() => setFeedback(''), 2200);
      } catch (error) {
        setFeedback(String(error?.message || 'Failed to save supplier'));
        window.setTimeout(() => setFeedback(''), 2600);
      } finally {
        setSupplierSaving(false);
      }
    })();
  };
  const savePurchase = async () => {
    const isEdit = Boolean(editingPurchaseId);
    try {
      const toNum = (v) => {
        const n = parseFloat(String(v ?? '').replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
      };
      const norm = (s) => String(s || '').trim();
      const normKey = (s) => norm(s).toLowerCase();
      const supplierName =
        String(form.supplierName || '').trim() ||
        String((suppliers || []).find((s) => String(s.id) === String(form.supplierId))?.name || '').trim() ||
        undefined;

      const resolvedDestination = String(form.destination || 'stock').trim().toLowerCase() === 'store' ? 'store' : 'stock';
      const purchaseId = String(isEdit ? editingPurchaseId : `PUR-${Date.now()}-${Math.random().toString(16).slice(2)}`);

      const existingPurchase = isEdit ? (Array.isArray(purchases) ? purchases : []).find((p) => String(p?.id || '') === String(editingPurchaseId)) : null;
      if (isEdit && existingPurchase?.persisted) {
        setFeedback('Editing synced backend purchases is not supported yet.');
        window.setTimeout(() => setFeedback(''), 2600);
        return;
      }

      const existingByName = new Map();
      (Array.isArray(inventoryItems) ? inventoryItems : []).forEach((it) => {
        const name = norm(it?.name || it?.itemName || '');
        const key = normKey(name);
        if (!key) return;
        if (!existingByName.has(key)) existingByName.set(key, it);
      });

      const computeCategory = (name) => {
        const it = existingByName.get(normKey(name));
        const c = String(it?.category || it?.itemType || 'general').trim() || 'general';
        return c;
      };

      const cleanedItems = (Array.isArray(form.items) ? form.items : [])
        .map((it) => {
          const itemName = norm(it?.item || it?.name || it?.itemName || '');
          const unit = norm(it?.unit || 'kg') || 'kg';
          const qty = toNum(it?.qty);
          const price = toNum(it?.price);
          const tax = toNum(it?.tax);
          const lineAmount = qty * price;
          const lineTax = (lineAmount * tax) / 100;
          const total = lineAmount + lineTax;
          const category = norm(it?.category || it?.itemType || computeCategory(itemName) || 'general') || 'general';
          return {
            productId: norm(it?.productId || existingByName.get(normKey(itemName))?.id || ''),
            item: itemName,
            _custom: Boolean(it?._custom),
            description: norm(it?.description || ''),
            qty: String(qty),
            unit,
            price: String(price),
            tax: String(tax),
            total: String(total.toFixed(2)),
            category
          };
        })
        .filter((it) => it.item);

      const subtotalLocal = cleanedItems.reduce((sum, it) => sum + toNum(it.qty) * toNum(it.price), 0);
      const taxTotalLocal = cleanedItems.reduce((sum, it) => sum + ((toNum(it.qty) * toNum(it.price) * toNum(it.tax)) / 100), 0);
      const grandTotalLocal = subtotalLocal + taxTotalLocal;

      let purchaseRecord = {
        id: purchaseId,
        lpoNumber: norm(form.lpoNumber),
        date: norm(form.date).slice(0, 10) || new Date().toISOString().slice(0, 10),
        supplierId: norm(form.supplierId),
        supplierName: norm(supplierName || form.supplierName),
        supplierAddress: norm(form.supplierAddress),
        destination: resolvedDestination,
        items: cleanedItems,
        subtotal: subtotalLocal,
        taxTotal: taxTotalLocal,
        total: grandTotalLocal,
        terms: norm(form.terms),
        notes: norm(form.notes),
        shipToName: norm(form.shipToName),
        shipToAddress: norm(form.shipToAddress),
        vendorMessage: norm(form.vendorMessage),
        memo: norm(form.memo),
        createdAt: existingPurchase?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!isEdit) {
        const resolvedItems = await productsApi.ensureForPurchaseItems(cleanedItems);
        purchaseRecord = {
          ...purchaseRecord,
          items: resolvedItems
        };
        purchaseRecord = await purchasesApi.create({
          ...purchaseRecord,
          useServerNumbering: true
        });
      }

      try {
        const list = Array.isArray(purchases) ? purchases : [];
        const next = isEdit
          ? list.map((p) => (String(p?.id || '') === String(editingPurchaseId) ? purchaseRecord : p))
          : [purchaseRecord, ...list.filter((p) => String(p?.id || '') !== String(purchaseRecord?.id || ''))];
        setPurchases(next);
        if (isEdit) {
          void setStoredJson('purchases', next).catch(() => {});
        }
      } catch {}

      try {
        if (purchaseRecord?.persisted) {
          const refreshedProducts = await productsApi.list();
          setInventoryItems(Array.isArray(refreshedProducts) ? refreshedProducts : []);
        } else {
          const list = Array.isArray(inventoryItems) ? inventoryItems : [];
          const byKey = new Map(list.map((it) => [normKey(it?.name || it?.itemName || ''), it]));
          const next = list.slice();
          purchaseRecord.items.forEach((it) => {
            const key = normKey(it.item);
            if (!key) return;
            const existing = byKey.get(key);
            const buyingPrice = toNum(it.price);
            if (existing) {
              const idx = next.findIndex((x) => String(x?.id || '') === String(existing?.id || '') || normKey(x?.name || x?.itemName || '') === key);
              if (idx >= 0) {
                next[idx] = {
                  ...next[idx],
                  name: norm(next[idx]?.name || next[idx]?.itemName || it.item) || it.item,
                  unit: norm(next[idx]?.unit || it.unit) || it.unit,
                  category: norm(next[idx]?.category || next[idx]?.itemType || it.category) || it.category,
                  buyingPrice,
                  productId: norm(next[idx]?.productId || it.productId),
                  updatedAt: new Date().toISOString()
                };
              }
            } else {
              next.push({
                id: norm(it.productId) || `ITEM-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                productId: norm(it.productId),
                name: it.item,
                category: it.category || 'general',
                unit: it.unit || 'kg',
                buyingPrice,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          });
          setInventoryItems(next);
          void setStoredJson('inventoryItems', next).catch(() => {});
        }
      } catch {}

      try {
        const nowIso = new Date().toISOString();
        const mkMovement = ({ movementType, itemName, qty, unit, price, category, note, referenceId }) => ({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          quantity: String(qty),
          unit: norm(unit) || 'kg',
          supplier: norm(supplierName || ''),
          pricePerItem: String(toNum(price)),
          date: purchaseRecord.date,
          itemType: category,
          note: norm(note),
          itemName: norm(itemName),
          createdAt: nowIso,
          referenceId: String(referenceId || purchaseId)
        });

        const reverseOld = async () => {
          if (!existingPurchase) return;
          const oldDest = String(existingPurchase?.destination || 'stock').trim().toLowerCase();
          if (oldDest !== 'stock') return;
          const oldItems = Array.isArray(existingPurchase?.items) ? existingPurchase.items : [];
          const byKey = new Map();
          oldItems.forEach((it) => {
            const name = norm(it?.item || it?.name || it?.itemName || '');
            const key = normKey(name);
            if (!key) return;
            const category = norm(it?.category || it?.itemType || computeCategory(name) || 'general') || 'general';
            const qty = toNum(it?.qty);
            const unit = norm(it?.unit || 'kg') || 'kg';
            const price = toNum(it?.price);
            if (qty <= 0) return;
            if (!byKey.has(category)) byKey.set(category, []);
            byKey.get(category).push(
              mkMovement({
                movementType: 'stock_out',
                itemName: name,
                qty,
                unit,
                price,
                category,
                note: `Purchase edit revert ${existingPurchase?.lpoNumber || ''}`.trim(),
                referenceId: purchaseId
              })
            );
          });

          productsApi.appendLocalMovements(Array.from(byKey.values()).flat());
        };

        await reverseOld();

        const byKey = new Map();
        cleanedItems.forEach((it) => {
          const category = norm(it.category || 'general') || 'general';
          const qty = resolvedDestination === 'stock' ? toNum(it.qty) : 0;
          const unitCost = toNum(it.price);
          if (resolvedDestination === 'stock' && qty <= 0) return;
          if (unitCost <= 0) return;
          if (!byKey.has(category)) byKey.set(category, []);
          byKey.get(category).push(
            mkMovement({
              movementType: 'stock_in',
              itemName: it.item,
              qty,
              unit: it.unit,
              price: unitCost,
              category,
              note: resolvedDestination === 'stock' ? `Purchase ${purchaseRecord.lpoNumber}`.trim() : `Store ${purchaseRecord.lpoNumber}`.trim(),
              referenceId: purchaseId
            })
          );
        });

        productsApi.appendLocalMovements(Array.from(byKey.values()).flat());
      } catch {}

      try {
        window.dispatchEvent(new CustomEvent('dataUpdated'));
      } catch {}

      try {
        appendSystemActivity(
          isEdit ? 'purchase_edit' : 'purchase_create',
          isEdit ? 'Purchase updated' : 'Purchase created',
          `${String(supplierName || 'Supplier').trim() || 'Supplier'} • ${String(purchaseRecord?.lpoNumber || form.lpoNumber || '').trim() || 'LPO'}`,
          'Purchases',
          'success',
          { entityId: purchaseRecord?.id || editingPurchaseId || purchaseRecord?.lpoNumber || form.lpoNumber || null }
        );
      } catch {}

      setFeedback(isEdit ? 'Purchase updated' : 'Purchase saved');
      window.setTimeout(() => setFeedback(''), 2200);

      const nextPurchaseNumber = await refreshNextPoNumber();
      setEditingPurchaseId(null);
      setForm(createEmptyPurchaseForm(nextPurchaseNumber));
    } catch (error) {
      setFeedback(String(error?.message || 'Failed to save purchase'));
      window.setTimeout(() => setFeedback(''), 2600);
    }
  };
  const loadPurchase = useCallback((p) => {
    if (!p) return;
    setEditingPurchaseId(p.id || null);
    setForm({
      lpoNumber: p.lpoNumber || generateLpoNumber(nextPoNumber),
      date: p.date || new Date().toISOString().split('T')[0],
      supplierId: p.supplierId || '',
      supplierName: p.supplierName || '',
      supplierAddress: p.supplierAddress || '',
      destination: String(p.destination || 'stock'),
      items: Array.isArray(p.items) && p.items.length > 0 ? p.items.map((it) => ({ _custom: false, ...it })) : [{ item: '', _custom: false, description: '', qty: '', unit: 'kg', price: '', tax: '', total: 0 }],
      terms: p.terms || '',
      notes: p.notes || '',
      shipToName: p.shipToName || '',
      shipToAddress: p.shipToAddress || '',
      vendorMessage: p.vendorMessage || '',
      memo: p.memo || ''
    });
    setShowShareMenu(false);
  }, [nextPoNumber]);
  const saveAndClose = () => {
    void savePurchase();
  };
  const clearForm = () => {
    setEditingPurchaseId(null);
    setForm(createEmptyPurchaseForm(generateLpoNumber(nextPoNumber)));
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
    const startedAt = Date.now();
    setDeleteLoading(true);
    (async () => {
      try {
        const list = Array.isArray(purchases) ? purchases : [];
        const deleted = list.find((p) => String(p?.id) === String(purchaseId)) || null;
        await purchasesApi.remove(purchaseId);
        const next = list.filter((p) => String(p?.id) !== String(purchaseId));
        setPurchases(next);
        try {
          if (deleted?.persisted) {
            const refreshedProducts = await productsApi.list();
            setInventoryItems(Array.isArray(refreshedProducts) ? refreshedProducts : []);
          } else {
            const toNum = (v) => {
              const n = parseFloat(String(v ?? '').replace(/,/g, ''));
              return Number.isFinite(n) ? n : 0;
            };
            const norm = (s) => String(s || '').trim();
            const normKey = (s) => norm(s).toLowerCase();
            const dest = String(deleted?.destination || 'stock').trim().toLowerCase();
            if (dest === 'stock') {
              const inv = Array.isArray(inventoryItems) ? inventoryItems : [];
              const existingByName = new Map();
              inv.forEach((it) => {
                const name = norm(it?.name || it?.itemName || '');
                const key = normKey(name);
                if (!key) return;
                if (!existingByName.has(key)) existingByName.set(key, it);
              });
              const computeCategory = (name) => {
                const it = existingByName.get(normKey(name));
                const c = String(it?.category || it?.itemType || 'general').trim() || 'general';
                return c;
              };
              const nowIso = new Date().toISOString();
              const byKey = new Map();
              const items = Array.isArray(deleted?.items) ? deleted.items : [];
              items.forEach((it) => {
                const name = norm(it?.item || it?.name || it?.itemName || '');
                const qty = toNum(it?.qty);
                if (!name || qty <= 0) return;
                const unit = norm(it?.unit || 'kg') || 'kg';
                const price = toNum(it?.price);
                const category = norm(it?.category || it?.itemType || computeCategory(name) || 'general') || 'general';
                if (!byKey.has(category)) byKey.set(category, []);
                byKey.get(category).push({
                  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                  quantity: String(qty),
                  unit,
                  supplier: norm(deleted?.supplierName || ''),
                  pricePerItem: String(price),
                  date: norm(deleted?.date).slice(0, 10) || new Date().toISOString().slice(0, 10),
                  itemType: category,
                  note: `Purchase deleted ${norm(deleted?.lpoNumber || '')}`.trim(),
                  itemName: name,
                  createdAt: nowIso,
                  referenceId: String(purchaseId || '')
                });
              });

              productsApi.appendLocalMovements(Array.from(byKey.values()).flat());
            }
          }
        } catch {}
        try {
          window.dispatchEvent(new CustomEvent('dataUpdated'));
        } catch {}
        try {
          appendSystemActivity(
            'purchase_delete',
            'Purchase deleted',
            `${String(deleted?.supplierName || deleted?.supplier || 'Purchase').trim() || 'Purchase'} • ${String(deleted?.lpoNumber || deleted?.purchaseId || purchaseId || '').trim()}`,
            'Purchases',
            'warning',
            { entityId: purchaseId }
          );
        } catch {}
      } catch (error) {
        setFeedback(String(error?.message || 'Unable to delete purchase.'));
        window.setTimeout(() => setFeedback(''), 3200);
      }
      const elapsed = Date.now() - startedAt;
      const remaining = 5000 - elapsed;
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      setDeleteLoading(false);
      setDeleteModal(false);
      setEditingPurchaseId(null);
      clearForm();
      navigate('/purchases/history');
    })();
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
  }, [location.search, purchases, navigate, loadPurchase]);

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
      {feedback ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {feedback}
        </div>
      ) : null}
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
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-xl w-11/12 md:w-[900px] overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold">Add New Supplier</div>
              <button className={supplierSaving ? 'text-sm text-gray-400 cursor-not-allowed' : 'text-sm text-gray-600 hover:text-gray-900'} onClick={() => (supplierSaving ? null : setShowAddSupplier(false))}>Close</button>
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
                <button
                  type="button"
                  className={supplierSaving ? 'px-4 py-2 rounded-lg border border-gray-300 text-gray-500 bg-gray-50 cursor-not-allowed' : 'px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100'}
                  disabled={supplierSaving}
                  onClick={() => {
                    if (supplierSaving) return;
                    setNewSupplier({ name: '', openingBalance: '', openingBalanceAsOf: new Date().toISOString().split('T')[0], companyName: '', contactFirstName: '', contactLastName: '', jobTitle: '', phone: '', workPhone: '', mobile: '', fax: '', email: '', ccEmail: '', website: '', other: '', billedFrom: '', shippedFrom: '' });
                    setShowAddSupplier(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={supplierSaving ? 'px-4 py-2 rounded-lg bg-green-600/70 text-white cursor-not-allowed inline-flex items-center gap-2' : 'px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2'}
                  onClick={saveNewSupplier}
                  disabled={supplierSaving}
                >
                  <span>{supplierSaving ? 'Saving...' : 'Save Supplier'}</span>
                </button>
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
          <div className="p-4">
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
            <div className="grid grid-cols-12 gap-4 items-start mb-4">
              <div className="col-span-6"></div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
                <textarea name="supplierAddress" value={form.supplierAddress} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm h-14" placeholder="Vendor address" />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Ship To</label>
                <textarea name="shipToAddress" value={form.shipToAddress} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm h-14" placeholder="Shipping address" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="text-gray-900 font-semibold">ITEMS</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">Receive to</div>
                  <select name="destination" value={form.destination} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
                    <option value="stock">Stock In</option>
                    <option value="store">Store</option>
                  </select>
                  <button className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2" onClick={addItem}>
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Line</span>
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-x-hidden">
                <table className="w-full table-fixed border-collapse border border-gray-200">
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
                            value={it._custom ? '__other__' : it.item}
                            onChange={(e)=>{
                              const v = e.target.value;
                              applyItemToRow(i, v);
                            }}
                          >
                            <option value="">Select item</option>
                            <option value="__other__">Other product</option>
                            {itemCatalog.map((x)=> <option key={x.name} value={x.name}>{x.name}</option>)}
                          </select>
                          {it._custom ? (
                            <input
                              className="mt-1 w-full px-2 py-1 text-sm bg-transparent focus:outline-none border-t border-gray-200"
                              value={it.item}
                              onChange={(e) => handleItemChange(i, 'item', e.target.value)}
                              placeholder="Type product name"
                            />
                          ) : null}
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
                  data-delete-trigger="true"
                  onClick={() => setDeleteModal(true)}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 inline-flex items-center gap-2 mr-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : null}
              <button type="button" onClick={clearForm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100">Clear</button>
              <button
                type="button"
                disabled={!!saveLoading}
                onClick={async () => {
                  if (saveLoading) return;
                  setSaveLoading('new');
                  try {
                    await withMinimumDelay(async () => {
                      await savePurchase();
                    }, 5000);
                  } finally {
                    setSaveLoading('');
                  }
                }}
                className={
                  saveLoading
                    ? 'px-4 py-2 rounded-lg bg-blue-600/70 text-white cursor-not-allowed inline-flex items-center gap-2'
                    : 'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2'
                }
              >
                {saveLoading === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{saveLoading === 'new' ? 'Saving...' : 'Save & New'}</span>
              </button>
              <button
                type="button"
                disabled={!!saveLoading}
                onClick={async () => {
                  if (saveLoading) return;
                  setSaveLoading('close');
                  try {
                    await withMinimumDelay(async () => {
                      await savePurchase();
                    }, 5000);
                  } finally {
                    setSaveLoading('');
                  }
                }}
                className={
                  saveLoading
                    ? 'px-4 py-2 rounded-lg bg-green-600/70 text-white cursor-not-allowed inline-flex items-center gap-2'
                    : 'px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2'
                }
              >
                {saveLoading === 'close' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{saveLoading === 'close' ? 'Saving...' : 'Save & Close'}</span>
              </button>
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
