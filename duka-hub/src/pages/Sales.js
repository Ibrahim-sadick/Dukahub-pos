import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TrendingUp, DollarSign, Hash, Edit, Save, X, Trash2, Printer } from 'lucide-react';
import { RiWhatsappLine } from 'react-icons/ri';
import { formatDisplayDate } from '../utils/date';
import DateInput from '../shared/DateInput';
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal';
import { canDeleteRecords } from '../utils/deletePassword';
import SalesOrderPrint from '../shared/SalesOrderPrint';
import { elementToPdfFile } from '../utils/pdf';
import { appendSystemActivity } from '../utils/systemActivity';
import { productsApi } from '../services/productsApi';
import { salesApi } from '../services/salesApi';
 

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

const getStoredJson = (key, fallback) => localStore.get(key, fallback);
const setStoredJson = (key, value) => Promise.resolve(localStore.set(key, value));

const normalizeCurrencyLabel = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || 'TZS';
};

const formatMoneyValue = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toLocaleString() : '0';
};

const getSaleCurrencyLabel = (sale) => normalizeCurrencyLabel(sale?.currency || sale?.currencyLabel);

const formatSaleMoney = (sale, value) => `${getSaleCurrencyLabel(sale)} ${formatMoneyValue(value)}`;

const Sales = () => {
  const [activeTab, setActiveTab] = useState('record');
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [recentSales, setRecentSales] = useState([]);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null); // 'save', 'cancel', 'delete'
  const [deleteSaleOpen, setDeleteSaleOpen] = useState(false);
  const [showByCustomer, setShowByCustomer] = useState(false);
  const [showByItem, setShowByItem] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: 'kg', price: '' });
  const [companyInfo, setCompanyInfo] = useState({});
  const [shareInvoice, setShareInvoice] = useState(null);
  const sharePrintRef = useRef(null);
  const [formData, setFormData] = useState({

    
  });

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const sel = await getStoredJson('selectedProductForSale', null);
        if (!alive) return;
        if (!sel || typeof sel !== 'object') return;
        const productType = String(sel.productType || '').trim();
        const productName = String(sel.productName || '').trim();
        const unit = String(sel.unit || '').trim();
        const price = sel.price;
        setFormData((prev) => ({
          ...prev,
          ...(productType ? { productType } : {}),
          ...(productName ? { productName } : {}),
          ...(unit ? { unit } : {}),
          ...(price !== null && price !== undefined && String(price).trim() ? { price: String(price) } : {})
        }));
        void setStoredJson('selectedProductForSale', null).catch(() => {});
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
        .catch(() => setCompanyInfo({}));
    };
    loadCompanyInfo();
    const onUpdate = () => loadCompanyInfo();
    window.addEventListener('companyInfoUpdated', onUpdate);
    return () => {
      window.removeEventListener('companyInfoUpdated', onUpdate);
    };
  }, []);

  const normalizeTzPhone = (raw) => {
    const digits = String(raw || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    const local = (() => {
      if (digits.startsWith('255')) return digits.slice(3);
      if (digits.startsWith('0')) return digits.slice(1);
      return digits;
    })().replace(/^0+/, '');
    if (local.length !== 9) return '';
    if (!(local.startsWith('6') || local.startsWith('7'))) return '';
    return `255${local}`;
  };

  const buildCurrentInvoiceForShare = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price) || 0;
    const amount = quantity * price;
    const currencyLabel = normalizeCurrencyLabel(formData.currency || formData.currencyLabel);
    const exchangeRate = parseFloat(formData.usdRate || formData.exchangeRate || 0) || 0;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `INV-${dateStr}-${randomNum}`;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return {
      invoiceNumber,
      date: now.toISOString().split('T')[0],
      dueDate,
      billToName: String(formData.customerName || '').trim() || 'Customer',
      items: [
        {
          item: formData.productType === 'eggs' ? 'EGGS' : formData.productType === 'chickens' ? 'CHICKEN MEAT' : String(formData.productName || '').trim(),
          qty: quantity,
          unit: String(formData.unit || '').trim(),
          price: price,
          total: amount
        }
      ],
      notes: String(formData.notes || '').trim(),
      subtotal: amount,
      taxRate: 0,
      taxTotal: 0,
      total: amount,
      currencyLabel,
      exchangeRate,
      convertedCurrencyLabel: currencyLabel === 'USD' && exchangeRate > 0 ? 'TZS' : currencyLabel
    };
  };

  const [scalePort, setScalePort] = useState(null);
  const [scaleConnected, setScaleConnected] = useState(false);
  const [scaleReading, setScaleReading] = useState(null);

  const connectScale = async () => {
    try {
      if (!('serial' in navigator)) return;
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      setScalePort(port);
      const decoder = new TextDecoder();
      const reader = port.readable.getReader();
      setScaleConnected(true);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value || new Uint8Array());
        const m = text.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (m) {
          const kg = parseFloat(m[1]);
          setScaleReading(kg);
          setFormData(prev => ({
            ...prev,
            quantity: prev.productType === 'chickens'
              ? (prev.unit === 'gram' ? Math.round(kg * 1000) : kg)
              : prev.quantity
          }));
        }
      }
      reader.releaseLock();
    } catch (e) {
      setScaleConnected(false);
    }
  };

  const disconnectScale = async () => {
    try {
      await scalePort?.close();
    } catch {}
    setScaleConnected(false);
    setScalePort(null);
  };


  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(async () => {
        const [sales, items] = await Promise.all([
          salesApi.list().catch(() => getStoredJson('sales', [])),
          productsApi.list().catch(() => getStoredJson('inventoryItems', []))
        ]);
        if (!alive) return;
        const list = Array.isArray(sales) ? sales : [];
        setRecentSales(list);
        setInventoryItems(Array.isArray(items) ? items : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      Promise.resolve()
        .then(async () => {
          const [sales, items] = await Promise.all([
            salesApi.list().catch(() => getStoredJson('sales', [])),
            productsApi.list().catch(() => getStoredJson('inventoryItems', []))
          ]);
          setRecentSales(Array.isArray(sales) ? sales : []);
          setInventoryItems(Array.isArray(items) ? items : []);
        })
        .catch(() => {
          setRecentSales([]);
          setInventoryItems([]);
        });
    };
    window.addEventListener('dataUpdated', handler);
    return () => window.removeEventListener('dataUpdated', handler);
  }, []);

  const units = useMemo(() => ['kg', 'gram', 'piece', 'tray', 'crt', 'crate', 'box', 'packet', 'bottle', 'item', 'set', 'liter'], []);

  const salesItemOptions = useMemo(() => {
    const map = new Map();
    const upsert = (name, unit, price, date, category) => {
      const key = (name || '').trim();
      if (!key) return;
      const existing = map.get(key);
      const nextDate = String(date || '');
      const next = {
        name: key,
        category: String(category || existing?.category || 'general').trim() || 'general',
        unit: unit ? String(unit) : (existing?.unit || ''),
        price: Number.isFinite(Number(price)) ? Number(price) : (existing?.price ?? null),
        lastDate: nextDate || (existing?.lastDate || '')
      };
      if (existing?.lastDate && nextDate && nextDate < existing.lastDate) {
        next.category = existing.category;
        next.unit = existing.unit;
        next.price = existing.price;
        next.lastDate = existing.lastDate;
      }
      map.set(key, next);
    };

    (inventoryItems || []).forEach((it) => {
      if (it?.isStoreOnly) return;
      upsert(
        it?.name,
        it?.unit,
        it?.sellingPrice ?? it?.sellPrice ?? it?.price,
        it?.updatedAt || it?.createdAt || '',
        it?.category || it?.itemType || 'general'
      );
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventoryItems]);

  const salesItemOptionsForType = useMemo(() => {
    const type = String(formData.productType || '').trim();
    if (!type || type === 'eggs' || type === 'chickens') return [];
    const wanted = String(type).toLowerCase();
    return salesItemOptions.filter((x) => String(x.category || 'general').toLowerCase() === wanted);
  }, [formData.productType, salesItemOptions]);

  const openAddNewItem = () => {
    setNewItem({ name: '', unit: 'kg', price: '' });
    setShowAddItem(true);
  };

  const applySelectedItem = (name) => {
    const chosen = salesItemOptions.find((x) => x.name === name);
    setFormData((prev) => {
      const next = { ...prev, productName: name };
      if (prev.productType !== 'eggs' && prev.productType !== 'chickens') {
        const cat = String(chosen?.category || prev.productType || 'general').trim() || 'general';
        next.productType = cat;
      }
      if (chosen?.unit) next.unit = chosen.unit;
      if (chosen?.price !== null && chosen?.price !== undefined && String(next.price || '').trim() === '') {
        next.price = String(chosen.price);
      }
      return next;
    });
  };

  const saveNewSalesItem = async () => {
    const type = formData.productType;
    const name = (newItem.name || '').trim();
    if (!name) return;
    const sellingPrice = parseFloat(newItem.price || '0') || 0;
    await productsApi.create({
      name,
      category: String(type || 'general').trim() || 'general',
      productType: String(type || 'general').trim() || 'general',
      unit: (newItem.unit || 'kg').trim() || 'kg',
      sellingPrice,
      costPrice: 0,
      stockQuantity: 0,
      metadata: { source: 'sales-manual-item' }
    });
    const nextItems = await productsApi.list().catch(() => getStoredJson('inventoryItems', []));
    setInventoryItems(Array.isArray(nextItems) ? nextItems : []);
    applySelectedItem(name);
    setShowAddItem(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
      ...prev,
      [name]: value
      };
      
      if (name === 'productType') {
        if (value === 'eggs') {
          newData.productName = 'EGGS';
          newData.unit = 'tray';
        } else if (value === 'chickens') {
          newData.productName = 'CHICKEN MEAT';
          newData.unit = 'kg';
        } else {
          const allowed = new Set(salesItemOptions.filter((x) => String(x.category || 'general') === String(value || 'general')).map((x) => x.name));
          const cur = String(prev.productName || '').trim();
          newData.productName = allowed.has(cur) ? cur : '';
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const quantity = parseFloat(formData.quantity) || 0;
      const unitPrice = parseFloat(formData.price) || 0;
      const amount = quantity * unitPrice;

      // Automatically create invoice
      const generateInvoiceNumber = () => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `INV-${dateStr}-${randomNum}`;
      };

      const generatePONumber = () => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `PO-${dateStr}-${randomNum}`;
      };

      const savedSale = await salesApi.create({
        ...formData,
        date: new Date().toISOString().split('T')[0],
        productName: formData.productType === 'eggs' ? 'EGGS' : formData.productType === 'chickens' ? 'CHICKEN MEAT' : formData.productName,
        quantity,
        price: unitPrice,
        amount,
        subtotal: amount,
        finalTotal: amount,
        amountPaid: amount,
        balanceDue: 0,
        status: 'Completed',
        paymentTerms: 'Net 30',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: formData.description || `${formData.productType} sale`
      });

      const invoiceData = {
        id: savedSale?.id || Date.now(),
        invoiceNumber: savedSale?.invoiceNumber || generateInvoiceNumber(),
        poNumber: savedSale?.poNumber || generatePONumber(),
        customerName: formData.customerName,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        customerAddress: '',
        date: new Date().toISOString().split('T')[0],
        paymentTerms: 'Net 30',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [
          {
            item: formData.productType === 'eggs' ? 'EGGS' : formData.productType === 'chickens' ? 'CHICKEN MEAT' : formData.productName,
            qty: formData.quantity,
            unit: formData.unit,
            price: formData.price,
            total: amount
          }
        ],
        subtotal: amount,
        tax: 0,
        shipping: 0,
        finalTotal: amount,
        amountPaid: amount,
        balanceDue: 0,
        currency: savedSale?.currency || normalizeCurrencyLabel(formData.currency || formData.currencyLabel),
        currencyLabel: savedSale?.currency || normalizeCurrencyLabel(formData.currency || formData.currencyLabel),
        usdRate: savedSale?.usdRate || parseFloat(formData.usdRate || formData.exchangeRate || 0) || 0,
        exchangeRate: savedSale?.exchangeRate || parseFloat(formData.usdRate || formData.exchangeRate || 0) || 0,
        status: 'Unpaid',
        // Additional fields for filtering and display
        paymentMethod: formData.paymentMethod,
        productType: formData.productType,
        productName: formData.productType === 'eggs' ? 'EGGS' : formData.productType === 'chickens' ? 'CHICKEN MEAT' : formData.productName,
        quantity: formData.quantity,
        unit: formData.unit,
        unitPrice: formData.price,
        saleType: formData.saleType,
        discount: formData.discount || 0,
        taxRate: formData.taxRate || 0,
        notes: formData.notes || '',
        description: formData.description || `${formData.productType} sale`
      };

      const invoicedSales = Array.isArray(await getStoredJson('invoicedSales', [])) ? await getStoredJson('invoicedSales', []) : [];
      invoicedSales.push(invoiceData);
      void setStoredJson('invoicedSales', invoicedSales).catch(() => {});

      // Trigger data update event for reports and dashboard
      window.dispatchEvent(new CustomEvent('dataUpdated'));

      // Reset form
      setFormData({
        // Product Details
        productType: 'eggs',
        eggType: '',
        productName: 'EGGS',
        quantity: '',
        unit: 'tray',
        price: '',
        description: '',

        // Customer Information
        customerName: '',
        customerType: 'individual',
        phone: '',
        email: '',

        // Payment Details
        paymentMethod: 'cash',
        bank: '',
        accountNumber: '',
        referenceId: '',
        mobileProvider: '',
        transactionId: '',
        chequeNumber: '',
        creditCardNumber: '',

        // Sale Details
        saleType: 'retail',
        discount: 0,
        discountType: 'percentage',
        taxRate: 0,
        notes: ''
      });

      // Switch to recent sales tab
      setActiveTab('recent');
    } finally {
      setIsLoading(false);
    }
  };

  // Load recent sales data
  useEffect(() => {
    const loadSales = () => {
      Promise.resolve()
        .then(async () => {
          const sales = await salesApi.list().catch(() => getStoredJson('sales', []));
          setRecentSales(Array.isArray(sales) ? sales : []);
        })
        .catch(() => setRecentSales([]));
    };
    loadSales();
    
    // Listen for data updates
    const handleDataUpdate = () => {
      loadSales();
    };
    window.addEventListener('dataUpdated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, []);

  // Close modal
  const closeModal = () => {
    setShowSaleModal(false);
    setSelectedSale(null);
  };

  // Helper function to check if current user is admin
  const isAdmin = () => {
    return canDeleteRecords();
  };

  // Helper function to check if a record is within 24 hours (only for staff)
  const isWithin24Hours = (recordDate) => {
    // Admin can always edit
    if (isAdmin()) {
      return true;
    }
    // Staff can only edit within 24 hours
    const recordDateTime = new Date(recordDate);
    const now = new Date();
    const diffInHours = (now - recordDateTime) / (1000 * 60 * 60); // Convert to hours
    return diffInHours <= 24;
  };

  // Handle edit sale
  const handleEditSale = (sale) => {
    if (sale?.persisted) {
      alert('Editing synced sales is not supported yet.');
      return;
    }
    if (!isWithin24Hours(sale.date)) {
      alert('This record cannot be edited. Staff accounts can only edit records within 24 hours.');
      return;
    }
    setEditingSaleId(sale.id);
    setEditFormData({ ...sale });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditLoading(true);
    setLoadingAction('cancel');
    setEditingSaleId(null);
    setEditFormData({});
    setIsEditLoading(false);
    setLoadingAction(null);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    setIsEditLoading(true);
    setLoadingAction('save');
    try {
      const sales = Array.isArray(await getStoredJson('sales', [])) ? await getStoredJson('sales', []) : [];
      const prevSale = sales.find((sale) => sale.id === editingSaleId) || null;
      if (prevSale?.persisted) {
        alert('Editing synced sales is not supported yet.');
        return;
      }
      const updatedSales = sales.map((sale) => (sale.id === editingSaleId ? { ...editFormData } : sale));
      void setStoredJson('sales', updatedSales).catch(() => {});
      setRecentSales(updatedSales);
      try {
        if (prevSale) {
          productsApi.removeLocalMovementsByReference(prevSale.id);
        }

        const itemType = String(editFormData.productType || '').trim() || 'eggs';
        const qtyRaw = Number(editFormData.quantity) || 0;
        const qty = itemType === 'eggs' && String(editFormData.unit || '').trim() !== 'tray' ? Math.ceil(qtyRaw / 30) : qtyRaw;
        productsApi.appendLocalMovements([
          {
            referenceId: editingSaleId,
            saleId: editingSaleId,
            movementType: 'stock_out',
            itemType,
            itemName: itemType === 'eggs' ? 'EGGS' : String(editFormData.productName || ''),
            quantity: qty,
            unit: itemType === 'eggs' ? 'tray' : itemType === 'chickens' ? 'kg' : String(editFormData.unit || ''),
            pricePerItem: Number(editFormData.price) || 0,
            reason: 'Sale Edit',
            description: `Edited sale to ${String(editFormData.customerName || '').trim()}`,
            date: String(editFormData.date || new Date().toISOString().split('T')[0])
          }
        ]);
      } catch {}
      window.dispatchEvent(new CustomEvent('dataUpdated'));
      try {
        appendSystemActivity(
          'sale_edit',
          'Sale updated',
          `${String(editFormData.productName || editFormData.productType || '').trim() || 'Sale'} • TSH ${Number(editFormData.amount || editFormData.finalTotal || 0).toLocaleString()}`,
          'POS Sales',
          'success',
          { saleId: editingSaleId }
        );
      } catch {}
      setEditingSaleId(null);
      setEditFormData({});
    } finally {
      setIsEditLoading(false);
      setLoadingAction(null);
    }
  };

  // Handle delete sale
  const handleDeleteSale = async () => {
    if (!isAdmin()) {
      alert('You do not have permission to delete records.');
      return;
    }
    setDeleteSaleOpen(true);
  };

  const confirmDeleteSale = () => {
    if (!isAdmin()) {
      setDeleteSaleOpen(false);
      return;
    }
    if (isEditLoading && loadingAction === 'delete') return;
    const saleId = editingSaleId;
    const startedAt = Date.now();
    setIsEditLoading(true);
    setLoadingAction('delete');
    (async () => {
      try {
        await salesApi.remove(saleId);
        const updatedSales = Array.isArray(await getStoredJson('sales', [])) ? await getStoredJson('sales', []) : [];
        setRecentSales(updatedSales.slice(-10).reverse());
        try {
          appendSystemActivity('sale_delete', 'Sale deleted', `Sale #${String(saleId || '')}`, 'POS Sales', 'warning', { saleId });
        } catch {}
        setEditingSaleId(null);
        setEditFormData({});
      } catch (error) {
        alert(String(error?.message || 'Unable to delete sale.'));
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = 5000 - elapsed;
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
        setIsEditLoading(false);
        setLoadingAction(null);
        setDeleteSaleOpen(false);
      }
    })();
  };

  // Handle edit form change
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <ConfirmDeleteModal
        open={deleteSaleOpen}
        title="Delete Sale?"
        description="This sale record will be permanently deleted and cannot be recovered."
        confirmText="Delete"
        loading={Boolean(isEditLoading && loadingAction === 'delete')}
        onCancel={() => ((isEditLoading && loadingAction === 'delete') ? null : setDeleteSaleOpen(false))}
        onConfirm={confirmDeleteSale}
      />
      {showAddItem && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg w-11/12 md:w-[560px] overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold">Add New Item</div>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={()=>setShowAddItem(false)}>Close</button>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Price</label>
                  <input type="number" value={newItem.price} onChange={(e)=>setNewItem(prev=>({ ...prev, price: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100" onClick={()=>setShowAddItem(false)}>Cancel</button>
                <button type="button" className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={saveNewSalesItem}>Save Item</button>
              </div>
            </div>
          </div>
        </div>
      )}
      

      {/* Tabs */}
      <div className="border-b border-green-200">
        <nav className="-mb-px flex space-x-8">
          <button
            data-no-loading="true"
            onClick={() => setActiveTab('record')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'record'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-green-300'
            }`}
          >
            SALES RECORD
          </button>
          <button
            data-no-loading="true"
            onClick={() => setActiveTab('recent')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'recent'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-green-300'
            }`}
          >
            RECENT SALES
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'record' ? (
        <div className="bg-white p-6 border border-gray-300">
          <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-900">Sales Order</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 flex items-center gap-1"
                onClick={()=>window.print()}
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button
                type="button"
                disabled={isSharing || !(parseFloat(formData.quantity) > 0) || !(parseFloat(formData.price) > 0)}
                className={
                  isSharing || !(parseFloat(formData.quantity) > 0) || !(parseFloat(formData.price) > 0)
                    ? 'px-3 py-1.5 rounded-lg bg-green-600/50 text-white text-sm cursor-not-allowed flex items-center gap-1'
                    : 'px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 flex items-center gap-1'
                }
                onClick={async () => {
                  if (isSharing) return;
                  const invoice = buildCurrentInvoiceForShare();
                  setShareInvoice(invoice);
                  setIsSharing(true);
                  try {
                    await new Promise((r) => requestAnimationFrame(() => r()));
                    const file = await elementToPdfFile(sharePrintRef.current, `${invoice.invoiceNumber}.pdf`);
                    const customer = normalizeTzPhone(formData.phone);
                    const text = `Sales Invoice ${invoice.invoiceNumber}\nTotal: ${invoice.currencyLabel} ${Number(invoice.total || 0).toLocaleString()}`;
                    const canShareFiles = Boolean(navigator?.canShare && navigator.canShare({ files: [file] }));
                    if (canShareFiles) {
                      await navigator.share({ files: [file], title: invoice.invoiceNumber, text });
                      return;
                    }
                    const url = URL.createObjectURL(file);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    const wa = customer ? `https://wa.me/${customer}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(wa, '_blank', 'noopener,noreferrer');
                  } finally {
                    setIsSharing(false);
                  }
                }}
              >
                <RiWhatsappLine size={18} />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-100"
                onClick={()=>setShowByCustomer(true)}
              >
                Open SO by Customer
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-100"
                onClick={()=>setShowByItem(true)}
              >
                Open SO by Items
              </button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Type
                  </label>
                  <select
                    name="productType"
                    value={formData.productType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="eggs">Eggs</option>
                    <option value="chickens">Chickens</option>
                    <option value="feeds">Feeds</option>
                    <option value="medicine">Medicine</option>
                    <option value="equipment">Equipment</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.productType === 'eggs' ? 'Product Name' : 'Product Name'}
                  </label>
                  {(formData.productType === 'eggs' || formData.productType === 'chickens') ? (
                    <input
                      type="text"
                      name="productName"
                      value={formData.productType === 'eggs' ? 'EGGS' : 'CHICKEN MEAT'}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold"
                    />
                  ) : (
                    <select
                      name="productName"
                      value={formData.productName}
                      onChange={(e)=>{
                        const v = e.target.value;
                        if (v === '__add_new_item__') {
                          openAddNewItem();
                          return;
                        }
                        applySelectedItem(v);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Select item</option>
                      <option value="__add_new_item__">+ Add new item</option>
                      {salesItemOptionsForType.map((x)=> <option key={x.name} value={x.name}>{x.name}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter quantity"
                      required
                    />
                    {formData.productType === 'chickens' && (
                      <>
                        {!scaleConnected ? (
                          <button
                            type="button"
                            onClick={connectScale}
                            className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                          >
                            Connect Scale
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={disconnectScale}
                            className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                          >
                            Disconnect
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {scaleConnected && formData.productType === 'chickens' && (
                    <div className="mt-1 text-xs text-gray-600">
                      Current weight: {scaleReading ? `${scaleReading} kg` : 'Waiting...'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    {formData.productType === 'eggs' && (
                      <>
                        <option value="tray">Tray</option>
                        <option value="piece">Piece</option>
                        <option value="dozen">Dozen</option>
                      </>
                    )}
                    {formData.productType === 'chickens' && (
                      <>
                        <option value="kg">Kilogram</option>
                        <option value="gram">Gram</option>
                      </>
                    )}
                    {formData.productType !== 'eggs' && formData.productType !== 'chickens' && (
                      <>
                        <option value="kg">Kilogram</option>
                        <option value="gram">Gram</option>
                        <option value="liter">Liter</option>
                        <option value="packet">Packet</option>
                        <option value="box">Box</option>
                        <option value="bag">Bag</option>
                        <option value="bottle">Bottle</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Unit (TZS)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter price"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount (TZS)
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-lg font-semibold text-purple-600">
                    TSH {((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0)).toLocaleString()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Product description"
                  />
                </div>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter customer name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Type
                  </label>
                  <select
                    name="customerType"
                    value={formData.customerType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter email address"
                  />
                </div>

                </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                    <option value="credit_card">Credit Card</option>
                  </select>
                </div>

                {/* Conditional fields based on payment method */}
                {formData.paymentMethod === 'bank_transfer' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name
                      </label>
                      <select
                        name="bank"
                        value={formData.bank}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select Bank</option>
                        <option value="crdb">CRDB Bank</option>
                        <option value="nmb">NMB Bank</option>
                        <option value="equity">Equity Bank</option>
                        <option value="exim">Exim Bank</option>
                        <option value="stanbic">Stanbic Bank</option>
                        <option value="absa">Absa Bank</option>
                        <option value="kcb">KCB Bank</option>
                        <option value="diamond">Diamond Trust Bank</option>
                        <option value="barclays">Barclays Bank</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number
                      </label>
                      <input
                        type="text"
                        name="accountNumber"
                        value={formData.accountNumber}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter account number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reference ID
                      </label>
                      <input
                        type="text"
                        name="referenceId"
                        value={formData.referenceId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter reference ID"
                      />
                    </div>
                  </>
                )}

                {formData.paymentMethod === 'mobile_money' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Provider
                      </label>
                      <select
                        name="mobileProvider"
                        value={formData.mobileProvider}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select Provider</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="tigopesa">Tigo Pesa</option>
                        <option value="airtelmoney">Airtel Money</option>
                        <option value="halopesa">HaloPesa</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transaction ID
                      </label>
                      <input
                        type="text"
                        name="transactionId"
                        value={formData.transactionId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter transaction ID"
                      />
                    </div>
                  </>
                )}

                {formData.paymentMethod === 'cheque' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Number
                    </label>
                    <input
                      type="text"
                      name="chequeNumber"
                      value={formData.chequeNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter cheque number"
                      />
                    </div>
                )}

                {formData.paymentMethod === 'credit_card' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit Card Number
                    </label>
                    <input
                      type="text"
                      name="creditCardNumber"
                      value={formData.creditCardNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter credit card number"
                    />
                  </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sale Type
                  </label>
                  <select
                    name="saleType"
                    value={formData.saleType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="bulk">Bulk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Amount
                  </label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter discount"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type
                  </label>
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (TZS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter tax rate"
                    min="0"
                    max="100"
                  />
                </div>

              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter any additional notes"
                />
              </div>


            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className={`px-8 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium transition-all duration-300 ${
                  isLoading 
                    ? 'loading-gradient text-white cursor-not-allowed' 
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <div className="loading-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </span>
                ) : (
                  'Record Sale'
                )}
              </button>
            </div>
          </form>
          <div className="hidden">
            {shareInvoice ? (
              <div ref={sharePrintRef} style={{ width: 794, background: 'white' }}>
                <SalesOrderPrint
                  companyDetails={companyInfo}
                  salesOrderNumber=""
                  invoiceNumber={shareInvoice.invoiceNumber}
                  date={shareInvoice.date}
                  dueDate={shareInvoice.dueDate}
                  billToName={shareInvoice.billToName}
                  billToAddress=""
                  shipToName=""
                  shipToAddress=""
                  items={shareInvoice.items}
                  notes={shareInvoice.notes}
                  subtotal={shareInvoice.subtotal}
                  taxRate={shareInvoice.taxRate}
                  taxTotal={shareInvoice.taxTotal}
                  total={shareInvoice.total}
                  currencyLabel={shareInvoice.currencyLabel}
                  exchangeRate={shareInvoice.exchangeRate}
                  convertedCurrencyLabel={shareInvoice.convertedCurrencyLabel}
                />
              </div>
            ) : null}
          </div>
          {showByCustomer && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-white border border-gray-300 rounded-lg shadow-lg w-11/12 md:w-2/3 max-h-[80vh] overflow-auto">
                <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                  <div className="text-sm font-semibold text-gray-900">Open Sales Orders by Customer</div>
                  <button className="text-gray-600 hover:text-gray-800" onClick={()=>setShowByCustomer(false)}>Close</button>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {Object.entries(recentSales.reduce((acc, s) => {
                      const key = s.customerName || 'Unknown';
                      const amount = parseFloat(s.amount || s.finalTotal || 0);
                      acc[key] = acc[key] ? { count: acc[key].count + 1, total: acc[key].total + amount } : { count: 1, total: amount };
                      return acc;
                    }, {})).map(([customer, data]) => (
                      <div key={customer} className="flex justify-between text-sm">
                        <span className="font-medium text-gray-800">{customer}</span>
                        <span className="text-gray-700">Orders: {data.count} • TZS {data.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {showByItem && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-white border border-gray-300 rounded-lg shadow-lg w-11/12 md:w-2/3 max-h-[80vh] overflow-auto">
                <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                  <div className="text-sm font-semibold text-gray-900">Open Sales Orders by Items</div>
                  <button className="text-gray-600 hover:text-gray-800" onClick={()=>setShowByItem(false)}>Close</button>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {Object.entries(recentSales.reduce((acc, s) => {
                      const key = s.productName || s.productType || 'Item';
                      const qty = parseFloat(s.quantity || 0);
                      const amount = parseFloat(s.amount || s.finalTotal || 0);
                      acc[key] = acc[key] ? { qty: acc[key].qty + qty, total: acc[key].total + amount, unit: s.unit || acc[key].unit } : { qty, total: amount, unit: s.unit };
                      return acc;
                    }, {})).map(([item, data]) => (
                      <div key={item} className="flex justify-between text-sm">
                        <span className="font-medium text-gray-800">{item}</span>
                        <span className="text-gray-700">{data.qty} {data.unit || ''} • TZS {data.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 border border-gray-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Sales</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    TSH {recentSales.reduce((sum, sale) => sum + (sale.amount || sale.finalTotal || 0), 0).toLocaleString()}
                  </p>
                </div>
            </div>
            </div>
            <div className="bg-white p-6 border border-gray-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 flex items-center justify-center">
                    <Hash className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                  <p className="text-2xl font-semibold text-gray-900">{recentSales.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 border border-gray-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Average Sale</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    TSH {recentSales.length > 0 ? Math.round(recentSales.reduce((sum, sale) => sum + (sale.amount || sale.finalTotal || 0), 0) / recentSales.length).toLocaleString() : '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Sales Table */}
        <div className="bg-white border border-gray-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
                <p className="text-sm text-gray-600">All sales transactions recorded</p>
              </div>
            </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty/Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingSaleId === sale.id ? (
                        <DateInput name="date" value={editFormData.date || ''} onChange={handleEditChange} className="w-full px-2 py-1 border border-gray-300" />
                      ) : (
                        formatDisplayDate(sale.date)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingSaleId === sale.id ? (
                        <input
                          type="text"
                          name="customerName"
                          value={editFormData.customerName || ''}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300"
                        />
                      ) : (
                        sale.customerName
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingSaleId === sale.id ? (
                        <input
                          type="text"
                          name="productName"
                          value={editFormData.productName || editFormData.productType || ''}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300"
                        />
                      ) : (
                        sale.productName || sale.productType
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingSaleId === sale.id ? (
                        <div className="flex gap-1">
                          <input
                            type="number"
                            name="quantity"
                            value={editFormData.quantity || ''}
                            onChange={handleEditChange}
                            className="w-20 px-2 py-1 border border-gray-300"
                          />
                          <input
                            type="text"
                            name="unit"
                            value={editFormData.unit || ''}
                            onChange={handleEditChange}
                            className="w-20 px-2 py-1 border border-gray-300"
                          />
                        </div>
                      ) : (
                        `${sale.quantity} ${sale.unit}`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingSaleId === sale.id ? (
                        <select
                          name="paymentMethod"
                          value={editFormData.paymentMethod || ''}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300"
                        >
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="mobile_money">Mobile Money</option>
                          <option value="cheque">Cheque</option>
                          <option value="credit_card">Credit Card</option>
                        </select>
                      ) : (
                        <span className="capitalize">{sale.paymentMethod?.replace('_', ' ')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingSaleId === sale.id ? (
                        <input
                          type="number"
                          name="amount"
                          value={editFormData.amount || editFormData.finalTotal || ''}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300"
                        />
                      ) : (
                        formatSaleMoney(sale, sale.amount || sale.finalTotal || 0)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingSaleId === sale.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={isEditLoading}
                            className={`${isEditLoading && loadingAction === 'save' ? 'opacity-50 cursor-not-allowed' : 'text-green-600 hover:text-green-900'}`}
                            title="Save"
                          >
                            {isEditLoading && loadingAction === 'save' ? (
                              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full loading-spin"></div>
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isEditLoading}
                            className={`${isEditLoading && loadingAction === 'cancel' ? 'opacity-50 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                            title="Cancel"
                          >
                            {isEditLoading && loadingAction === 'cancel' ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full loading-spin"></div>
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                          {isAdmin() ? (
                            <button
                              data-delete-trigger="true"
                              onClick={handleDeleteSale}
                              disabled={Boolean(isEditLoading && loadingAction !== 'delete')}
                              className={`${isEditLoading && loadingAction !== 'delete' ? 'opacity-50 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditSale(sale)}
                          disabled={!isWithin24Hours(sale.date)}
                          className={`${isWithin24Hours(sale.date) ? 'text-blue-600 hover:text-blue-900' : 'text-gray-400 cursor-not-allowed'}`}
                          title={isWithin24Hours(sale.date) ? 'Edit' : 'Cannot edit: Record is older than 24 hours'}
                        >
                          <Edit className="w-4 h-4" />
                      </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Sale Details Modal */}
      {showSaleModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Sale Details</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="space-y-4">
                {/* Sale Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sale ID</label>
                    <p className="mt-1 text-sm text-gray-900">#{selectedSale.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDisplayDate(selectedSale.date)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product Type</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedSale.productType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSale.productName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSale.quantity} {selectedSale.unit}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <p className="mt-1 text-sm text-gray-900">{getSaleCurrencyLabel(selectedSale)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                    <p className="mt-1 text-sm text-gray-900">{formatSaleMoney(selectedSale, parseFloat(selectedSale.price || 0))}</p>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Customer Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedSale.customerName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Type</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{selectedSale.customerType || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedSale.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedSale.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Payment Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{selectedSale.paymentMethod?.replace('_', ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sale Type</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{selectedSale.saleType || 'N/A'}</p>
                    </div>
                    {selectedSale.bank && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bank</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedSale.bank}</p>
                      </div>
                    )}
                    {selectedSale.accountNumber && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Number</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedSale.accountNumber}</p>
                      </div>
                    )}
                    {selectedSale.mobileProvider && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Mobile Provider</label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">{selectedSale.mobileProvider}</p>
                      </div>
                    )}
                    {selectedSale.transactionId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedSale.transactionId}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Financial Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                      <p className="mt-1 text-sm text-gray-900">{formatSaleMoney(selectedSale, selectedSale.amount || selectedSale.finalTotal || 0)}</p>
                    </div>
                    {selectedSale.discount > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Discount</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedSale.discountType === 'percentage' ? `${selectedSale.discount}%` : formatSaleMoney(selectedSale, selectedSale.discount)}
                        </p>
                      </div>
                    )}
                    {selectedSale.taxRate > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tax Rate</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedSale.taxRate}%</p>
                      </div>
                    )}
                    {selectedSale.exchangeRate > 0 && getSaleCurrencyLabel(selectedSale) === 'USD' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Exchange Rate</label>
                        <p className="mt-1 text-sm text-gray-900">USD/TZS {formatMoneyValue(selectedSale.exchangeRate)}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                      <p className="mt-1 text-lg font-semibold text-green-600">{formatSaleMoney(selectedSale, selectedSale.amount || selectedSale.finalTotal || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedSale.notes && (
                  <div className="border-t pt-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Notes</h4>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{selectedSale.notes}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
