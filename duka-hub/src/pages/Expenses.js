import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ChevronDown, Printer, Mail, Share2, Loader2 } from 'lucide-react';
import DateInput from '../shared/DateInput';
import { expensesApi } from '../services/expensesApi';
import { appendSystemActivity } from '../utils/systemActivity';
import { withMinimumDelay } from '../utils/loadingDelay';

const toNumber = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const formatMoney0 = (value) => {
  const n = toNumber(value);
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  } catch {
    return n.toLocaleString();
  }
};

export default function Expenses() {
  const [isSaving, setIsSaving] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      Promise.resolve()
        .then(async () => {
          const savedExpenses = await expensesApi.list();
          const savedNext = expensesApi.getNextExpenseNumber();
          if (!alive) return;
          setExpenses(Array.isArray(savedExpenses) ? savedExpenses : []);
          setHeader((p) => ({ ...p, expenseNumber: savedNext.expenseNumber }));
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

  const [header, setHeader] = useState(() => ({
    expenseNumber: expensesApi.getNextExpenseNumber().expenseNumber,
    date: new Date().toISOString().slice(0, 10),
    status: 'Paid',
    paymentMethod: 'cash',
    reference: '',
    location: '',
    category: 'Staff'
  }));

  const categories = [
    'Staff',
    'Utilities',
    'Transport',
    'Maintenance',
    'Construction',
    'Chicken Feeds',
    'Vaccines and Medicines',
    'Equipment',
    'Other'
  ];

  const subcategories = {
    Staff: ['Salaries', 'Bonuses', 'Training', 'Benefits', 'Overtime', 'Recruitment'],
    Construction: ['Building Materials', 'Labor', 'Equipment Rental', 'Permits', 'Architecture', 'Landscaping'],
    'Chicken Feeds': [
      'Pumba za mahindi',
      'Mahindi yaliyosagwa',
      'Pumba za ngano',
      'Pumba za mpunga',
      'Molasi',
      'Unga wa samaki',
      'Unga wa soya',
      'Unga wa alizeti',
      'Unga wa pamba',
      'Unga wa mifupa na nyama',
      'Unga wa damu',
      'Chokaa',
      'Unga wa mifupa',
      'Magamba ya chaza',
      'DCP',
      'Chumvi',
      'Vitamin premix',
      'Mineral premix',
      'Calcium booster',
      'Toxin binder',
      'Antibiotic additive',
      'Probiotic',
      'Dawa ya minyoo',
      'Multivitamini',
      'Growth promoter',
      'Mash',
      'Pellets',
      'Crumbles',
      'Oil supplement',
      'Amino acid',
      'Electrolyte',
      'Yeast culture'
    ],
    Equipment: ['Farming Tools', 'Machinery', 'Electronics', 'Office Equipment', 'Safety Equipment', 'Measuring Tools'],
    Utilities: ['Electricity', 'Water', 'Internet', 'Phone', 'Gas', 'Waste Management'],
    Transport: ['Fuel', 'Maintenance', 'Insurance', 'Registration', 'Repairs', 'Tires'],
    Maintenance: ['Building Repairs', 'Equipment Repairs', 'Cleaning Supplies', 'Pest Control', 'Security', 'General Maintenance'],
    'Vaccines and Medicines': ['Vaccines', 'Antibiotics', 'Vitamins', 'Supplements', 'First Aid', 'Veterinary Services'],
    Other: ['Other']
  };

  const getSubcategoriesForCategory = (category) => {
    const list = subcategories[String(category || '').trim()];
    return Array.isArray(list) && list.length ? list : ['Other'];
  };

  const unitOptions = ['units', 'kg', 'pcs', 'pkt', 'bags', 'bottles', 'mls', 'gram', 'hours', 'days', 'trips'];

  const [items, setItems] = useState(() => [
    { subcategory: 'Salaries', description: '', unit: unitOptions[0], qty: 1, rate: 0 }
  ]);

  const [notes, setNotes] = useState('');

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, r) => s + (toNumber(r.qty) * toNumber(r.rate)), 0);
    return { subtotal, total: subtotal };
  }, [items]);

  const setHeaderField = (k, v) => setHeader((p) => ({ ...p, [k]: v }));
  const updateItem = (i, k, v) => setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const addItem = () => {
    const first = getSubcategoriesForCategory(header.category)[0];
    setItems((prev) => [...prev, { subcategory: first, description: '', unit: unitOptions[0], qty: 1, rate: 0 }]);
  };
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const categoryHistory = useMemo(() => {
    const key = String(header.category || '').trim().toLowerCase();
    if (!key) return [];
    return expenses
      .filter((e) => String(e?.category || '').trim().toLowerCase() === key)
      .slice(-5)
      .reverse();
  }, [expenses, header.category]);

  const resetForm = (nextInfo = expensesApi.getNextExpenseNumber()) => {
    setEditingExpenseId(null);
    setHeader({
      expenseNumber: nextInfo.expenseNumber,
      date: new Date().toISOString().slice(0, 10),
      status: 'Paid',
      paymentMethod: 'cash',
      reference: '',
      location: '',
      category: 'Staff'
    });
    setItems([{ subcategory: 'Salaries', description: '', unit: unitOptions[0], qty: 1, rate: 0 }]);
    setNotes('');
  };

  const clearForm = () => {
    setItems([{ subcategory: getSubcategoriesForCategory(header.category)[0], description: '', unit: unitOptions[0], qty: 1, rate: 0 }]);
    setNotes('');
    setHeader((p) => ({
      ...p,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'cash',
      reference: '',
      location: '',
      status: 'Paid'
    }));
  };

  const loadExpenseForEdit = (expense) => {
    if (!expense || !expense.id) return;
    const nextItems = Array.isArray(expense.items) && expense.items.length
      ? expense.items.map((item) => ({
          subcategory: String(item?.subcategory || '').trim() || getSubcategoriesForCategory(expense.category)[0],
          description: String(item?.description || '').trim(),
          unit: String(item?.unit || '').trim() || unitOptions[0],
          qty: toNumber(item?.qty),
          rate: toNumber(item?.rate)
        }))
      : [{ subcategory: getSubcategoriesForCategory(expense.category)[0], description: '', unit: unitOptions[0], qty: 1, rate: 0 }];

    setEditingExpenseId(String(expense.id));
    setHeader({
      expenseNumber: String(expense.expenseNumber || ''),
      date: String(expense.date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      status: String(expense.status || 'Paid'),
      paymentMethod: String(expense.paymentMethod || 'cash'),
      reference: String(expense.reference || ''),
      location: String(expense.location || ''),
      category: String(expense.category || 'Other')
    });
    setItems(nextItems);
    setNotes(String(expense.notes || ''));
  };

  const saveExpense = async () => {
    if (isSaving) return;

    setIsSaving(true);
    const category = String(header.category || '').trim() || 'Other';
    const totalAmount = Number(totals.total || 0) || 0;
    const isEdit = Boolean(editingExpenseId);

    try {
      await withMinimumDelay(async () => {
        const savedExpense = isEdit
          ? await expensesApi.update(editingExpenseId, {
              expenseNumber: header.expenseNumber,
              date: header.date,
              status: header.status,
              paymentMethod: header.paymentMethod,
              reference: header.reference,
              location: header.location,
              category,
              notes,
              items,
              amount: totalAmount
            })
          : await expensesApi.create({
              expenseNumber: header.expenseNumber,
              date: header.date,
              status: header.status,
              paymentMethod: header.paymentMethod,
              reference: header.reference,
              location: header.location,
              category,
              notes,
              items,
              amount: totalAmount
            });
        const nextInfo = expensesApi.getNextExpenseNumber();
        appendSystemActivity(
          isEdit ? 'expense_update' : 'expense_create',
          isEdit ? 'Expense updated' : 'Expense created',
          `${category} • TSH ${totalAmount.toLocaleString()}`,
          'Expenses',
          'success',
          { expenseId: savedExpense?.id || editingExpenseId || header.expenseNumber || null }
        );
        resetForm(nextInfo);
      }, 5000);
    } catch (error) {
      alert(error?.message || `Failed to ${isEdit ? 'update' : 'save'} expense.`);
    } finally {
      setIsSaving(false);
    }
  };

  const shareSummary = useMemo(() => {
    const total = `TZS ${formatMoney0(totals.total)}`;
    const cat = header.category ? `Category: ${header.category}` : 'Category: —';
    return `Expense ${header.expenseNumber} • Date ${header.date}\n${cat}\nTotal: ${total}`;
  }, [header.category, header.date, header.expenseNumber, totals.total]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="text-gray-900 font-semibold">Expenses</div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2" type="button" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            <span className="text-sm">Print</span>
          </button>
          <button
            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
            type="button"
            onClick={() => {
              const subject = encodeURIComponent(`Expense ${header.expenseNumber}`);
              const body = encodeURIComponent(`Please find Expense ${header.expenseNumber} dated ${header.date}.\nCategory: ${header.category || '—'}\nTotal: TZS ${formatMoney0(totals.total)}\n\n${notes ? `Notes: ${notes}\n` : ''}`);
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}
          >
            <Mail className="w-4 h-4" />
            <span className="text-sm">Email</span>
          </button>
          <div className="relative">
            <button
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center gap-2"
              type="button"
              onClick={() => setShowShareMenu((v) => !v)}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm">Share</span>
            </button>
            {showShareMenu && (
              <div className="absolute right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow w-56">
                <button
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                  type="button"
                  onClick={() => {
                    const url = window.location.href;
                    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url);
                    setShowShareMenu(false);
                  }}
                >
                  Copy Link
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(shareSummary);
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

      {showShareMenu && <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-6">
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <div className="relative max-w-xl">
                  <div className="flex items-center gap-2">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white"
                      value={header.category}
                      onChange={(e) => {
                        const next = e.target.value;
                        setHeader((p) => ({ ...p, category: next }));
                        const first = getSubcategoriesForCategory(next)[0];
                        setItems((prev) => prev.map((r) => ({ ...r, subcategory: first })));
                      }}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-500">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-1">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                    <DateInput className="w-full max-w-[220px] px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700" value={header.date} onChange={(e) => setHeaderField('date', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Expense No.</label>
                    <input
                      className="w-full max-w-[220px] px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700"
                      value={header.expenseNumber}
                      onChange={(e) => setHeaderField('expenseNumber', e.target.value.replace(/[^\d]/g, '').slice(0, 8))}
                      placeholder="0000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-start mb-4">
            <div className="col-span-12 lg:col-span-6" />
            <div className="col-span-12 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm" value={header.paymentMethod} onChange={(e) => setHeaderField('paymentMethod', e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Reference</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" value={header.reference} onChange={(e) => setHeaderField('reference', e.target.value)} placeholder="Receipt / Invoice number" />
              </div>
            </div>
            <div className="col-span-12 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
              <textarea className="w-full px-3 py-2 border rounded-lg text-sm h-14" value={header.location} onChange={(e) => setHeaderField('location', e.target.value)} placeholder="Where expense occurred" />
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm" value={header.status} onChange={(e) => setHeaderField('status', e.target.value)}>
                  <option value="Paid">Paid</option>
                  <option value="Open">Open</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold">ITEMS</div>
              <button className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2" type="button" onClick={addItem}>
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Line</span>
              </button>
            </div>
            <div className="p-4 overflow-x-hidden">
              <table className="w-full table-fixed border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center w-1/12 border border-gray-200">No.</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-3/12 border border-gray-200">Subcategory</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-4/12 border border-gray-200">Description</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Qty</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-left w-1/12 border border-gray-200">Unit</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-1/12 border border-gray-200">Rate</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right w-2/12 border border-gray-200">Amount</th>
                    <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center w-1/12 border border-gray-200">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => {
                    const lineAmount = toNumber(row.qty) * toNumber(row.rate);
                    return (
                      <tr key={i} className="align-middle">
                        <td className="px-3 py-2 border border-gray-200 text-center text-sm text-gray-600">{i + 1}</td>
                        <td className="px-3 py-2 border border-gray-200">
                          <select className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.subcategory} onChange={(e) => updateItem(i, 'subcategory', e.target.value)}>
                            {getSubcategoriesForCategory(header.category).map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Description" />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input
                            type="number"
                            min="0"
                            className="w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none"
                            value={row.qty}
                            onChange={(e) => updateItem(i, 'qty', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <select className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none" value={row.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)}>
                            {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 border border-gray-200">
                          <input
                            type="number"
                            min="0"
                            className="w-full px-2 py-1 text-sm text-right bg-transparent focus:outline-none"
                            value={row.rate}
                            onChange={(e) => updateItem(i, 'rate', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2 border border-gray-200 text-sm text-right font-semibold text-gray-900">
                          TZS {formatMoney0(lineAmount)}
                        </td>
                        <td className="px-3 py-2 border border-gray-200 text-center">
                          <button type="button" className="px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-100" onClick={() => removeItem(i)} disabled={items.length === 1}>
                            <Trash2 size={16} className="inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-start">
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea className="w-full px-3 py-2 border rounded-lg h-14 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Comments" />
            </div>
            <div className="w-full max-w-md ml-auto">
              <div className="flex justify-between text-sm text-gray-700">
                <span>Subtotal</span>
                <span className="font-medium">TZS {formatMoney0(totals.subtotal)}</span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-xs text-gray-500 tracking-wide">TOTAL</div>
                <div className="text-2xl font-semibold text-gray-900">TZS {formatMoney0(totals.total)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button type="button" onClick={clearForm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100">
              {editingExpenseId ? 'Cancel Edit' : 'Clear'}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={saveExpense}
              className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 ${isSaving ? 'bg-green-600/60 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{isSaving ? 'Saving...' : editingExpenseId ? 'Update Expense' : 'Save & New'}</span>
            </button>
          </div>
        </div>
        <div className="border-l border-gray-200 bg-gray-50 p-5">
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">Category</div>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between"><span>Name</span><span className="font-medium text-gray-900">{header.category || '—'}</span></div>
              <div className="flex justify-between"><span>Status</span><span className="font-medium text-gray-900">{header.status || '—'}</span></div>
              <div className="flex justify-between"><span>Lines</span><span className="font-medium text-gray-900">{items.length.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Total</span><span className="font-medium text-gray-900">TZS {formatMoney0(totals.total)}</span></div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">Recent Transactions</div>
            <div className="space-y-2 text-sm text-gray-700 italic">
              {categoryHistory.length ? (
                categoryHistory.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="not-italic text-gray-900">{String(e.date || '').slice(0, 10) || '—'}</div>
                      <div className="text-xs text-gray-500 not-italic">{e.expenseNumber || e.id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium not-italic">TZS {formatMoney0(e.amount || 0)}</span>
                      <button
                        type="button"
                        onClick={() => loadExpenseForEdit(e)}
                        className="px-2 py-1 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 not-italic"
                      >
                        Edit
                      </button>
                    </div>
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
  );
}
